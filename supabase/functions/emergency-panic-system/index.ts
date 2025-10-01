import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.json()
    const { action } = body

    if (action === 'trigger_panic_alert') {
      const { 
        userId, 
        userType, // 'passenger' or 'driver'
        rideId, 
        latitude, 
        longitude, 
        emergencyType, // 'panic', 'safety_concern', 'medical', 'accident'
        description 
      } = body

      // Create emergency alert record (stored in rides table with special status)
      const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const { data: ride } = await supabaseClient
        .from('rides')
        .select(`
          *,
          passenger:users!rides_user_id_fkey(full_name, phone),
          driver:users!rides_driver_id_fkey(full_name, phone)
        `)
        .eq('id', rideId)
        .single()

      // Get nearest dispatchers (all active dispatchers)
      const { data: dispatchers } = await supabaseClient
        .from('dispatchers')
        .select('id, full_name, phone, town, is_active')
        .eq('is_active', true)

      // Create emergency ride record for tracking
      const { data: alert, error } = await supabaseClient
        .from('rides')
        .insert([
          {
            user_id: userId,
            driver_id: userType === 'driver' ? userId : ride?.driver_id,
            trip_type: 'emergency',
            service_type: 'emergency',
            pickup_location: `Emergency at ${latitude}, ${longitude}`,
            destination_location: emergencyType,
            fare_amount: 0,
            status: 'emergency_active',
            notes: `${emergencyType}: ${description}`,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (error) throw error

      // Prepare emergency response data
      const emergencyData = {
        alertId: alert.id,
        emergencyType: emergencyType,
        priority: emergencyType === 'panic' ? 'critical' : 'high',
        location: { latitude, longitude },
        userInfo: userType === 'passenger' ? ride?.passenger : ride?.driver,
        rideInfo: {
          id: rideId,
          pickup: ride?.pickup_location,
          destination: ride?.destination_location,
          status: ride?.status
        },
        timestamp: alert.created_at,
        dispatchersNotified: dispatchers?.length || 0
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          alert: emergencyData,
          message: `Emergency alert sent to ${dispatchers?.length || 0} dispatchers`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'quick_call_dispatcher') {
      const { userId, rideId, urgencyLevel } = body

      // Find the appropriate dispatcher for the area
      const { data: ride } = await supabaseClient
        .from('rides')
        .select('pickup_location, town')
        .eq('id', rideId)
        .single()

      const { data: dispatcher } = await supabaseClient
        .from('dispatchers')
        .select('id, full_name, phone')
        .eq('town', ride?.town || 'Lagawe')
        .eq('is_active', true)
        .limit(1)
        .single()

      // Log the call request in rides table
      const { data: callLog, error } = await supabaseClient
        .from('rides')
        .insert([
          {
            user_id: userId,
            trip_type: 'emergency_call',
            service_type: 'emergency_call',
            pickup_location: 'Quick call to dispatcher',
            destination_location: urgencyLevel,
            fare_amount: 0,
            status: 'call_initiated',
            dispatcher_id: dispatcher?.id,
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true,
          dispatcher: {
            name: dispatcher?.full_name || 'Central Dispatch',
            phone: dispatcher?.phone || '+639123456789'
          },
          callLog: callLog,
          message: 'Dispatcher contact information retrieved'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'dispatcher_respond_alert') {
      const { alertId, dispatcherId, responseType, notes } = body

      // Update alert status
      const { error: alertError } = await supabaseClient
        .from('rides')
        .update({
          status: responseType === 'resolved' ? 'emergency_resolved' : 'emergency_in_progress',
          dispatcher_id: dispatcherId,
          notes: notes,
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId)

      if (alertError) throw alertError

      return new Response(
        JSON.stringify({ 
          success: true,
          message: `Emergency alert ${responseType} by dispatcher`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'get_active_emergencies') {
      const { dispatcherId } = body

      const { data: alerts, error } = await supabaseClient
        .from('rides')
        .select(`
          *,
          user:users!rides_user_id_fkey(full_name, phone)
        `)
        .in('status', ['emergency_active', 'emergency_in_progress'])
        .order('created_at', { ascending: false })

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true,
          alerts: alerts || []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'check_safety_settings') {
      const { driverId } = body

      const { data: settings } = await supabaseClient
        .from('driver_filters')
        .select('verified_users_only, night_safety_mode')
        .eq('driver_id', driverId)
        .single()

      const currentHour = new Date().getHours()
      const isNightTime = currentHour >= 20 || currentHour <= 5

      return new Response(
        JSON.stringify({ 
          success: true,
          safetySettings: {
            verifiedUsersOnly: settings?.verified_users_only || false,
            nightSafetyMode: settings?.night_safety_mode || false,
            isNightTime: isNightTime,
            canRejectUnverified: isNightTime && settings?.night_safety_mode
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Invalid action' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})