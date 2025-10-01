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
    const body = await req.json()
    const { action } = body

    if (action === 'dispatcher_assign_ride') {
      const { 
        driverId,
        passengerName,
        passengerPhone,
        pickupLocation,
        destinationLocation,
        vehicleType,
        passengerCount,
        dispatcherId
      } = body

      // Create a temporary user record for walk-in passengers if needed
      let passengerId = null
      
      // Check if passenger exists by phone
      const { data: existingUser } = await supabaseClient
        .from('users')
        .select('id')
        .eq('phone', passengerPhone)
        .single()

      if (existingUser) {
        passengerId = existingUser.id
      } else {
        // Create temporary passenger record
        const { data: newUser, error: userError } = await supabaseClient
          .from('users')
          .insert([{
            phone: passengerPhone,
            full_name: passengerName,
            is_verified: false,
            created_at: new Date().toISOString()
          }])
          .select()
          .single()

        if (userError) throw userError
        passengerId = newUser.id
      }

      // Create ride request assigned by dispatcher
      const { data: ride, error } = await supabaseClient
        .from('rides')
        .insert([
          {
            user_id: passengerId,
            driver_id: driverId,
            pickup_location: pickupLocation,
            destination_location: destinationLocation,
            vehicle_type: vehicleType,
            passenger_count: passengerCount,
            fare_amount: 30,
            payment_method: 'cash',
            status: 'dispatcher_assigned',
            dispatcher_id: dispatcherId,
            dispatcher_assigned_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (error) throw error

      // Update driver status to on_trip
      await supabaseClient
        .from('driver_locations')
        .update({ 
          status: 'on_trip',
          last_updated: new Date().toISOString()
        })
        .eq('driver_id', driverId)

      return new Response(
        JSON.stringify({ 
          success: true,
          ride: ride,
          passenger: {
            name: passengerName,
            phone: passengerPhone
          },
          message: 'Ride assigned to driver successfully'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // All other existing booking actions from the original function
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const session = JSON.parse(atob(token))
      
      if (session.exp < Date.now()) {
        throw new Error('Session expired')
      }

      if (action === 'request_ride') {
        const { 
          pickupLocation, 
          destinationLocation, 
          vehicleType, 
          passengerCount,
          suggestedFare
        } = body

        if (vehicleType === 'motorcycle' && passengerCount > 1) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: 'Motorcycle only allows 1 passenger' 
            }),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400 
            }
          )
        }

        const { data: rideRequest, error } = await supabaseClient
          .from('rides')
          .insert([
            {
              user_id: session.userId,
              pickup_location: pickupLocation,
              destination_location: destinationLocation,
              vehicle_type: vehicleType,
              passenger_count: passengerCount,
              suggested_fare: suggestedFare,
              status: 'fare_negotiation',
              created_at: new Date().toISOString()
            }
          ])
          .select()
          .single()

        if (error) throw error

        return new Response(
          JSON.stringify({ 
            success: true,
            ride_request: rideRequest,
            message: 'Ride request sent to drivers'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }

      if (action === 'confirm_booking') {
        const { 
          pickupLocation, 
          pickupLat, 
          pickupLng, 
          destinationLocation, 
          destinationLat, 
          destinationLng, 
          vehicleType, 
          passengerCount,
          paymentMethod,
          agreedFare
        } = body

        const { data: user } = await supabaseClient
          .from('users')
          .select('is_first_time, free_ride_used, free_ride_expires_at')
          .eq('id', session.userId)
          .single()

        let fareAmount = agreedFare
        let isFreeRide = false

        if (user?.is_first_time && !user?.free_ride_used && 
            new Date(user?.free_ride_expires_at) > new Date()) {
          isFreeRide = true
          fareAmount = 0.00
        }

        const { data: ride, error } = await supabaseClient
          .from('rides')
          .insert([
            {
              user_id: session.userId,
              pickup_location: pickupLocation,
              pickup_lat: pickupLat,
              pickup_lng: pickupLng,
              destination_location: destinationLocation,
              destination_lat: destinationLat,
              destination_lng: destinationLng,
              vehicle_type: vehicleType,
              passenger_count: passengerCount,
              fare_amount: fareAmount,
              agreed_fare: agreedFare,
              payment_method: paymentMethod,
              status: 'confirmed',
              created_at: new Date().toISOString()
            }
          ])
          .select()
          .single()

        if (error) throw error

        if (isFreeRide) {
          await supabaseClient
            .from('users')
            .update({ 
              free_ride_used: true,
              is_first_time: false
            })
            .eq('id', session.userId)
        }

        if (paymentMethod === 'wallet' && !isFreeRide) {
          await supabaseClient
            .from('wallet_transactions')
            .insert([
              {
                user_id: session.userId,
                amount: -fareAmount,
                type: 'ride_payment',
                description: `Ride payment: ${pickupLocation} to ${destinationLocation}`,
                reference_id: ride.id,
                status: 'completed',
                created_at: new Date().toISOString()
              }
            ])

          await supabaseClient.rpc('update_wallet_balance', {
            user_id: session.userId,
            amount_change: -fareAmount
          })
        }

        return new Response(
          JSON.stringify({ 
            success: true,
            ride: ride,
            is_free_ride: isFreeRide,
            agreed_fare: agreedFare,
            payment_method: paymentMethod,
            message: isFreeRide ? 'Free ride applied!' : 'Ride booked successfully'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }
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