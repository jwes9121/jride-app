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
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const session = JSON.parse(atob(token))
    
    if (session.exp < Date.now()) {
      throw new Error('Session expired')
    }

    const body = await req.json()
    const { action } = body

    if (action === 'request_ride') {
      const { 
        pickupLocation, 
        destinationLocation, 
        vehicleType, 
        passengerCount,
        suggestedFare
      } = body

      // Validate passenger count for motorcycle
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

      // Create pending ride request
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

      if (error) {
        throw error
      }

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
        agreedFare,
        finalAmount,
        processingFees = 0
      } = body

      // Check if user is first-time for free ride promo
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

      // Create confirmed ride booking
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
            final_amount: finalAmount || agreedFare,
            processing_fees: processingFees,
            status: 'confirmed',
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (error) {
        throw error
      }

      // Create payment log entry for backend tracking
      await supabaseClient
        .from('payment_logs')
        .insert([
          {
            ride_id: ride.id,
            user_id: session.userId,
            payment_method: paymentMethod,
            ride_fare: agreedFare,
            processing_fees: processingFees,
            total_charge: finalAmount || agreedFare,
            status: 'completed',
            created_at: new Date().toISOString()
          }
        ])

      // If free ride used, update user
      if (isFreeRide) {
        await supabaseClient
          .from('users')
          .update({ 
            free_ride_used: true,
            is_first_time: false
          })
          .eq('id', session.userId)
      }

      // Process wallet payment for passengers
      if (paymentMethod === 'wallet' && !isFreeRide) {
        await supabaseClient
          .from('wallet_transactions')
          .insert([
            {
              user_id: session.userId,
              amount: -agreedFare,
              type: 'ride_payment',
              description: `Ride payment: ${pickupLocation} to ${destinationLocation}`,
              reference_id: ride.id,
              status: 'completed',
              created_at: new Date().toISOString()
            }
          ])

        // Update user wallet balance
        await supabaseClient.rpc('update_wallet_balance', {
          user_id: session.userId,
          amount_change: -agreedFare
        })
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          ride: ride,
          booking_id: ride.id,
          is_free_ride: isFreeRide,
          agreed_fare: agreedFare,
          final_amount: finalAmount || agreedFare,
          processing_fees: processingFees,
          payment_method: paymentMethod,
          message: isFreeRide ? 'Free ride applied!' : 'Ride booked successfully'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'complete_ride') {
      const { ride_id, final_fare, driver_id, payment_method } = body

      // Update ride status and store final details
      const { data: completedRide, error } = await supabaseClient
        .from('rides')
        .update({
          status: 'completed',
          final_fare: final_fare,
          driver_id: driver_id,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', ride_id)
        .select()
        .single()

      if (error) {
        throw error
      }

      // Automatically process driver commission after trip completion
      try {
        const commissionResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/wallet-service`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
          },
          body: JSON.stringify({
            action: 'process_trip_commission',
            trip_id: ride_id,
            driver_id: driver_id,
            fare_amount: final_fare,
            payment_method: payment_method,
            commission_rate: 0.10 // 10% commission rate
          })
        })

        const commissionResult = await commissionResponse.json()
        console.log('Commission processing result:', commissionResult)
      } catch (commissionError) {
        console.error('Error processing commission:', commissionError)
        // Don't fail the trip completion if commission processing fails
      }

      // Store trip details for accuracy tracking
      await supabaseClient
        .from('trip_history')
        .insert([
          {
            ride_id: ride_id,
            passenger_id: completedRide.user_id,
            driver_id: driver_id,
            pickup_location: completedRide.pickup_location,
            destination_location: completedRide.destination_location,
            agreed_fare: completedRide.agreed_fare,
            final_fare: final_fare,
            payment_method: payment_method,
            completed_at: new Date().toISOString()
          }
        ])

      return new Response(
        JSON.stringify({ 
          success: true,
          ride: completedRide,
          message: 'Ride completed successfully'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'driver_propose_fare') {
      const { ride_id, proposed_fare, driver_id } = body

      // Update ride with driver's proposed fare
      const { data: updatedRide, error } = await supabaseClient
        .from('rides')
        .update({
          proposed_fare: proposed_fare,
          driver_id: driver_id,
          status: 'fare_proposed',
          updated_at: new Date().toISOString()
        })
        .eq('id', ride_id)
        .select()
        .single()

      if (error) {
        throw error
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          ride: updatedRide,
          message: 'Fare proposal sent to passenger'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'passenger_respond_fare') {
      const { ride_id, accepted, final_fare } = body

      let status = accepted ? 'fare_accepted' : 'fare_declined'
      
      const { data: updatedRide, error } = await supabaseClient
        .from('rides')
        .update({
          agreed_fare: accepted ? final_fare : null,
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', ride_id)
        .eq('user_id', session.userId)
        .select()
        .single()

      if (error) {
        throw error
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          ride: updatedRide,
          message: accepted ? 'Fare accepted, proceeding to payment' : 'Fare declined, looking for another driver'
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