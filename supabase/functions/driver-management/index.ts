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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const token = authHeader.replace('Bearer ', '')
    const session = JSON.parse(atob(token))
    
    if (session.exp < Date.now()) throw new Error('Session expired')

    const { action, settings } = await req.json()

    if (action === 'get_settings') {
      let { data: driverSettings, error } = await supabaseClient
        .from('driver_settings')
        .select('*')
        .eq('user_id', session.userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // Create default settings
        const { data: newSettings, error: createError } = await supabaseClient
          .from('driver_settings')
          .insert([{
            user_id: session.userId,
            verified_users_only: false,
            auto_night_mode: true
          }])
          .select()
          .single()

        if (createError) throw createError
        driverSettings = newSettings
      }

      // Check if it's currently night mode hours
      const now = new Date()
      const currentTime = now.toTimeString().slice(0, 5)
      const isNightHours = currentTime >= '20:00' || currentTime <= '05:00'
      
      return new Response(
        JSON.stringify({ 
          success: true,
          settings: driverSettings,
          isNightHours,
          currentVerifiedOnlyMode: driverSettings.auto_night_mode && isNightHours ? 
            true : driverSettings.verified_users_only
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'update_settings') {
      const { data: updatedSettings, error } = await supabaseClient
        .from('driver_settings')
        .update({
          verified_users_only: settings.verified_users_only,
          auto_night_mode: settings.auto_night_mode,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', session.userId)
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true,
          settings: updatedSettings,
          message: 'Driver settings updated successfully'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'get_ride_requests') {
      // Get current driver settings to filter requests
      const { data: driverSettings } = await supabaseClient
        .from('driver_settings')
        .select('*')
        .eq('user_id', session.userId)
        .single()

      const now = new Date()
      const currentTime = now.toTimeString().slice(0, 5)
      const isNightHours = currentTime >= '20:00' || currentTime <= '05:00'
      
      const shouldFilterVerified = driverSettings?.verified_users_only || 
        (driverSettings?.auto_night_mode && isNightHours)

      let query = supabaseClient
        .from('rides')
        .select(`
          *,
          users!inner(
            id,
            phone,
            full_name,
            verification_status,
            profile_photo_url
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })

      if (shouldFilterVerified) {
        query = query.eq('users.verification_status', 'verified')
      }

      const { data: rideRequests, error } = await query

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true,
          rideRequests,
          filterApplied: shouldFilterVerified,
          filterReason: shouldFilterVerified ? 
            (isNightHours && driverSettings?.auto_night_mode ? 'night_mode' : 'manual_setting') : 
            null
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