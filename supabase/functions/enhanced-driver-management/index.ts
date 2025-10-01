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
    
    if (session.exp < Date.now()) {
      throw new Error('Session expired')
    }

    const body = await req.json()
    const { action } = body

    // Admin-only actions for adding drivers/vendors
    if (action === 'add_driver_vendor') {
      // Verify admin access
      const { data: adminUser } = await supabaseClient
        .from('users')
        .select('user_type')
        .eq('id', session.userId)
        .single()

      if (!adminUser || adminUser.user_type !== 'admin') {
        return new Response(
          JSON.stringify({ success: false, message: 'Admin access required' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403 
          }
        )
      }

      const { 
        full_name, 
        phone, 
        user_type, 
        vehicle_type, 
        license_number, 
        business_name, 
        business_permit, 
        gcash_number, 
        address 
      } = body

      // Check if phone number already exists
      const { data: existingUser } = await supabaseClient
        .from('users')
        .select('id, phone')
        .eq('phone', phone)
        .single()

      if (existingUser) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Phone number already registered' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      // Create user record
      const { data: newUser, error: userError } = await supabaseClient
        .from('users')
        .insert([{
          phone: phone,
          full_name: full_name,
          user_type: user_type,
          is_verified: true, // Admin-added users are automatically verified
          gcash_number: gcash_number,
          address: address,
          created_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (userError) throw userError

      // If driver, create driver location record
      if (user_type === 'driver' && vehicle_type) {
        const { error: driverError } = await supabaseClient
          .from('driver_locations')
          .insert([{
            driver_id: newUser.id,
            vehicle_type: vehicle_type,
            license_number: license_number,
            status: 'offline',
            created_at: new Date().toISOString()
          }])

        if (driverError) {
          console.error('Error creating driver location:', driverError)
          // Don't fail the entire operation, just log the error
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          user: newUser,
          message: `${user_type} added successfully`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'get_drivers_vendors_list') {
      // Verify admin access
      const { data: adminUser } = await supabaseClient
        .from('users')
        .select('user_type')
        .eq('id', session.userId)
        .single()

      if (!adminUser || adminUser.user_type !== 'admin') {
        return new Response(
          JSON.stringify({ success: false, message: 'Admin access required' }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403 
          }
        )
      }

      // Get drivers with their vehicle information
      const { data: drivers, error: driversError } = await supabaseClient
        .from('users')
        .select(`
          id,
          full_name,
          phone,
          user_type,
          gcash_number,
          address,
          driver_locations (
            vehicle_type,
            license_number
          )
        `)
        .eq('user_type', 'driver')
        .order('created_at', { ascending: false })

      if (driversError) throw driversError

      // Get vendors
      const { data: vendors, error: vendorsError } = await supabaseClient
        .from('users')
        .select('id, full_name, phone, user_type, gcash_number, address')
        .eq('user_type', 'vendor')
        .order('created_at', { ascending: false })

      if (vendorsError) throw vendorsError

      // Format drivers data
      const formattedDrivers = drivers?.map(driver => ({
        id: driver.id,
        full_name: driver.full_name,
        phone: driver.phone,
        user_type: driver.user_type,
        gcash_number: driver.gcash_number,
        address: driver.address,
        vehicle_type: driver.driver_locations?.[0]?.vehicle_type,
        license_number: driver.driver_locations?.[0]?.license_number
      })) || []

      // Format vendors data  
      const formattedVendors = vendors?.map(vendor => ({
        id: vendor.id,
        full_name: vendor.full_name,
        phone: vendor.phone,
        user_type: vendor.user_type,
        gcash_number: vendor.gcash_number,
        address: vendor.address,
        business_name: '', // These would need to be added to the users table or separate table
        business_permit: ''
      })) || []

      // Combine and return
      const allUsers = [...formattedDrivers, ...formattedVendors]

      return new Response(
        JSON.stringify({ 
          success: true,
          users: allUsers,
          drivers: formattedDrivers,
          vendors: formattedVendors,
          count: allUsers.length
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Existing dispatcher functionality from original function
    if (action === 'get_drivers') {
      const { vehicleType, municipality } = body

      let query = supabaseClient
        .from('driver_locations')
        .select(`
          driver_id,
          vehicle_type,
          status,
          latitude,
          longitude,
          last_updated,
          users!inner(
            full_name,
            phone,
            verification_status,
            address
          )
        `)
        .not('status', 'eq', 'suspended')

      if (vehicleType && vehicleType !== 'all') {
        query = query.eq('vehicle_type', vehicleType)
      }

      if (municipality && municipality !== 'all') {
        query = query.ilike('users.address', `%${municipality}%`)
      }

      const { data: drivers, error } = await query.order('last_updated', { ascending: false })

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true,
          drivers: drivers || []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'update_driver_status') {
      const { driverId, status, reason } = body

      const { data: updatedDriver, error } = await supabaseClient
        .from('driver_locations')
        .update({ 
          status: status,
          last_updated: new Date().toISOString()
        })
        .eq('driver_id', driverId)
        .select()
        .single()

      if (error) throw error

      // Log the status change
      await supabaseClient
        .from('driver_performance_flags')
        .insert([
          {
            driver_id: driverId,
            flag_type: `status_${status}`,
            flag_reason: reason || `Status changed to ${status}`,
            flagged_by: session.userId,
            severity: status === 'suspended' ? 'high' : 'low',
            created_at: new Date().toISOString()
          }
        ])

      return new Response(
        JSON.stringify({ 
          success: true,
          driver: updatedDriver,
          message: `Driver status updated to ${status}`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'get_driver_performance') {
      const { driverId } = body

      // Get driver's performance data
      const { data: performance, error: perfError } = await supabaseClient
        .from('driver_locations')
        .select(`
          driver_id,
          vehicle_type,
          status,
          users!inner(
            full_name,
            phone,
            verification_status
          )
        `)
        .eq('driver_id', driverId)
        .single()

      if (perfError) throw perfError

      // Get recent rides
      const { data: rides, error: ridesError } = await supabaseClient
        .from('rides')
        .select('id, status, fare_amount, created_at, completed_at')
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (ridesError) throw ridesError

      // Get performance flags
      const { data: flags, error: flagsError } = await supabaseClient
        .from('driver_performance_flags')
        .select('flag_type, flag_reason, severity, created_at')
        .eq('driver_id', driverId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (flagsError) throw flagsError

      // Calculate stats
      const completedRides = rides?.filter(r => r.status === 'completed') || []
      const totalEarnings = completedRides.reduce((sum, ride) => sum + (ride.fare_amount || 0), 0)
      const completionRate = rides?.length ? (completedRides.length / rides.length) * 100 : 0

      return new Response(
        JSON.stringify({ 
          success: true,
          performance: {
            driver: performance,
            stats: {
              totalRides: rides?.length || 0,
              completedRides: completedRides.length,
              totalEarnings: totalEarnings,
              completionRate: completionRate,
              averageRideValue: completedRides.length ? totalEarnings / completedRides.length : 0
            },
            recentRides: rides || [],
            flags: flags || []
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