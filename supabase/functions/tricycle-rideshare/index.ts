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

    // Create necessary tables
    const createTablesQuery = `
      CREATE TABLE IF NOT EXISTS tricycle_rides (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        passenger_id UUID REFERENCES users(id),
        driver_id UUID REFERENCES users(id),
        passenger_name TEXT NOT NULL,
        pickup_location TEXT NOT NULL,
        destination TEXT NOT NULL,
        fare_amount DECIMAL(10,2) NOT NULL,
        ride_type TEXT DEFAULT 'private' CHECK (ride_type IN ('private', 'ride_share')),
        max_passengers INTEGER DEFAULT 5,
        current_passengers INTEGER DEFAULT 1,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'driver_assigned', 'passenger_a_pickup', 'ride_share_pending', 'ride_share_approved', 'ride_share_declined', 'passenger_b_pickup', 'ride_ongoing', 'completed', 'cancelled')),
        shared_passengers JSONB DEFAULT '[]'::jsonb,
        driver_assigned_at TIMESTAMP,
        passenger_a_pickup_at TIMESTAMP,
        ride_share_initiated_at TIMESTAMP,
        ride_share_decided_at TIMESTAMP,
        passenger_b_pickup_at TIMESTAMP,
        ride_started_at TIMESTAMP,
        completed_at TIMESTAMP,
        estimated_arrival TIMESTAMP,
        ride_share_savings DECIMAL(10,2),
        reroute_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ride_share_requests (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        ride_id UUID REFERENCES tricycle_rides(id) ON DELETE CASCADE,
        requester_id UUID REFERENCES users(id),
        requester_name TEXT NOT NULL,
        pickup_location TEXT NOT NULL,
        destination TEXT NOT NULL,
        fare_amount DECIMAL(10,2) NOT NULL,
        status TEXT DEFAULT 'pending',
        approved_by_passenger BOOLEAN,
        driver_decision TEXT CHECK (driver_decision IN ('approve', 'decline')),
        rerouted_to_driver UUID,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_tricycle_rides_status ON tricycle_rides(status);
      CREATE INDEX IF NOT EXISTS idx_tricycle_rides_passenger ON tricycle_rides(passenger_id);
      CREATE INDEX IF NOT EXISTS idx_tricycle_rides_driver ON tricycle_rides(driver_id);
      CREATE INDEX IF NOT EXISTS idx_tricycle_rides_type ON tricycle_rides(ride_type);
      CREATE INDEX IF NOT EXISTS idx_ride_share_requests_ride ON ride_share_requests(ride_id);
    `

    await supabaseClient.rpc('exec_sql', { sql: createTablesQuery })

    if (action === 'create_sample_data') {
      // Create sample tricycle rides
      const sampleRides = [
        {
          passenger_name: 'Maria Santos',
          pickup_location: 'Barangay Centro, Near Church',
          destination: 'Public Market, Main Entrance',
          fare_amount: 50,
          ride_type: 'private',
          status: 'driver_assigned',
          current_passengers: 1
        },
        {
          passenger_name: 'John Cruz',
          pickup_location: 'Subdivision Gate A',
          destination: 'City Hall, Front Steps',
          fare_amount: 40,
          ride_type: 'ride_share',
          status: 'passenger_a_pickup',
          current_passengers: 1,
          ride_share_savings: 10
        },
        {
          passenger_name: 'Anna Reyes',
          pickup_location: 'School Main Gate',
          destination: 'Shopping Plaza, Ground Floor',
          fare_amount: 35,
          ride_type: 'ride_share',
          status: 'ride_ongoing',
          current_passengers: 2,
          ride_share_savings: 15,
          shared_passengers: [
            {
              name: 'Pedro Garcia',
              pickup: 'School Side Gate',
              destination: 'Shopping Plaza, 2nd Floor',
              fare: 30,
              status: 'picked_up'
            }
          ]
        }
      ]

      for (const ride of sampleRides) {
        await supabaseClient
          .from('tricycle_rides')
          .insert([{
            ...ride,
            estimated_arrival: new Date(Date.now() + 25 * 60 * 1000).toISOString()
          }])
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Sample tricycle ride data created successfully'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'book_ride') {
      const { 
        passenger_name,
        pickup_location, 
        destination, 
        ride_type,
        fare_amount
      } = body

      const rideData = {
        passenger_name,
        pickup_location,
        destination,
        ride_type,
        fare_amount,
        current_passengers: 1,
        max_passengers: 5, // Standard tricycle capacity
        estimated_arrival: new Date(Date.now() + 20 * 60 * 1000).toISOString()
      }

      // Calculate savings for ride-share
      if (ride_type === 'ride_share') {
        rideData.ride_share_savings = 50 - fare_amount // Standard fare - ride-share fare
      }

      const { data: newRide, error } = await supabaseClient
        .from('tricycle_rides')
        .insert([rideData])
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true,
          ride: newRide,
          message: 'Ride booked successfully! Finding nearest driver...'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'get_rides') {
      const { user_role } = body

      let query = supabaseClient
        .from('tricycle_rides')
        .select('*')
        .order('created_at', { ascending: false })

      // Filter based on user role
      if (user_role === 'passenger') {
        // In real app, filter by passenger_id from token
        query = query.limit(20)
      } else if (user_role === 'driver') {
        query = query.in('status', [
          'pending', 'driver_assigned', 'passenger_a_pickup', 
          'ride_share_pending', 'ride_share_approved', 'passenger_b_pickup', 'ride_ongoing'
        ])
      }

      const { data: rides, error } = await query

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true,
          rides: rides || []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'initiate_ride_share') {
      const { ride_id, potential_passenger } = body

      // Get current ride
      const { data: currentRide, error: fetchError } = await supabaseClient
        .from('tricycle_rides')
        .select('*')
        .eq('id', ride_id)
        .single()

      if (fetchError) throw fetchError

      // Validate ride-share eligibility
      if (currentRide.ride_type !== 'ride_share') {
        return new Response(
          JSON.stringify({ 
            success: false,
            message: 'This ride does not allow ride-sharing'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      if (currentRide.current_passengers >= currentRide.max_passengers) {
        return new Response(
          JSON.stringify({ 
            success: false,
            message: 'This tricycle is at full capacity'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      // Update ride status to pending ride-share decision
      await supabaseClient
        .from('tricycle_rides')
        .update({
          status: 'ride_share_pending',
          ride_share_initiated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', ride_id)

      // Create ride-share request
      const { data: shareRequest, error: requestError } = await supabaseClient
        .from('ride_share_requests')
        .insert([
          {
            ride_id: ride_id,
            requester_name: potential_passenger.name,
            pickup_location: potential_passenger.pickup,
            destination: potential_passenger.destination,
            fare_amount: potential_passenger.fare,
            status: 'pending_passenger_approval'
          }
        ])
        .select()
        .single()

      if (requestError) throw requestError

      return new Response(
        JSON.stringify({ 
          success: true,
          share_request: shareRequest,
          potential_passenger: potential_passenger,
          message: 'Ride-share opportunity found. Asking first passenger for approval.'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'update_ride_status') {
      const { ride_id, status, user_role, share_approved, new_passenger, reroute_reason } = body

      // Get current ride
      const { data: currentRide, error: fetchError } = await supabaseClient
        .from('tricycle_rides')
        .select('*')
        .eq('id', ride_id)
        .single()

      if (fetchError) throw fetchError

      // Validate status transition
      const isValidTransition = validateStatusTransition(currentRide.status, status, user_role)
      
      if (!isValidTransition && !['ride_share_approved', 'ride_share_declined'].includes(status)) {
        return new Response(
          JSON.stringify({ 
            success: false,
            message: 'Invalid status transition'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      // Update ride with timestamp tracking
      const updateData: any = {
        status: status,
        updated_at: new Date().toISOString()
      }

      // Add timestamp fields based on status
      if (status === 'driver_assigned') {
        updateData.driver_assigned_at = new Date().toISOString()
        updateData.driver_id = 'demo-driver-id' // In real app, assign actual driver
      } else if (status === 'passenger_a_pickup') {
        updateData.passenger_a_pickup_at = new Date().toISOString()
      } else if (status === 'ride_share_approved' && share_approved && new_passenger) {
        updateData.ride_share_decided_at = new Date().toISOString()
        updateData.current_passengers = currentRide.current_passengers + 1
        
        // Add to shared passengers list
        const currentSharedPassengers = currentRide.shared_passengers || []
        updateData.shared_passengers = [...currentSharedPassengers, {
          ...new_passenger,
          status: 'approved'
        }]
      } else if (status === 'ride_share_declined') {
        updateData.ride_share_decided_at = new Date().toISOString()
        updateData.reroute_count = (currentRide.reroute_count || 0) + 1
        
        // Find another driver for the declined passenger
        // In real app, this would trigger driver matching algorithm
        
        // Reset to continue with original passenger
        updateData.status = 'passenger_a_pickup'
      } else if (status === 'passenger_b_pickup') {
        updateData.passenger_b_pickup_at = new Date().toISOString()
      } else if (status === 'ride_ongoing') {
        updateData.ride_started_at = new Date().toISOString()
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }

      const { data: updatedRide, error: updateError } = await supabaseClient
        .from('tricycle_rides')
        .update(updateData)
        .eq('id', ride_id)
        .select()
        .single()

      if (updateError) throw updateError

      // Generate response message
      let message = getStatusMessage(status, currentRide, share_approved, reroute_reason)

      return new Response(
        JSON.stringify({ 
          success: true,
          ride: updatedRide,
          message: message
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

function validateStatusTransition(currentStatus: string, newStatus: string, userRole: string): boolean {
  const validTransitions: Record<string, Record<string, string[]>> = {
    'pending': {
      'driver': ['driver_assigned']
    },
    'driver_assigned': {
      'driver': ['passenger_a_pickup']
    },
    'passenger_a_pickup': {
      'driver': ['ride_ongoing', 'ride_share_pending']
    },
    'ride_share_pending': {
      'passenger': ['ride_share_approved', 'ride_share_declined']
    },
    'ride_share_approved': {
      'driver': ['passenger_b_pickup']
    },
    'ride_share_declined': {
      'driver': ['passenger_a_pickup']
    },
    'passenger_b_pickup': {
      'driver': ['ride_ongoing']
    },
    'ride_ongoing': {
      'driver': ['completed']
    }
  }

  const allowedStatuses = validTransitions[currentStatus]?.[userRole] || []
  return allowedStatuses.includes(newStatus)
}

function getStatusMessage(status: string, currentRide: any, shareApproved?: boolean, reroute_reason?: string): string {
  const messages = {
    'driver_assigned': 'Driver assigned successfully. Driver is heading to pickup location.',
    'passenger_a_pickup': 'Driver has arrived for Passenger A pickup.',
    'ride_share_pending': 'Ride-share opportunity found. Awaiting passenger approval.',
    'ride_share_approved': `Ride-share approved! ${shareApproved ? 'Adding second passenger to the ride.' : ''}`,
    'ride_share_declined': `Ride-share declined. ${reroute_reason || 'Finding alternative driver for second passenger.'}`,
    'passenger_b_pickup': 'Driver has arrived for Passenger B pickup.',
    'ride_ongoing': 'Ride started successfully. All passengers are on board.',
    'completed': (() => {
      const baseFare = currentRide.fare_amount
      const sharedFares = currentRide.shared_passengers?.reduce((sum: number, p: any) => sum + p.fare, 0) || 0
      const totalFare = baseFare + sharedFares
      return `Ride completed successfully! Total earnings: ₱${totalFare}`
    })()
  }

  return messages[status as keyof typeof messages] || 'Ride status updated successfully'
}