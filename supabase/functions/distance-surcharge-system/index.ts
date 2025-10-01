import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Calculate pickup surcharge based on distance
function calculatePickupSurcharge(distance: number): number {
  if (distance <= 1.5) return 0;
  if (distance <= 2.0) return 10;
  if (distance <= 3.0) return 20;
  if (distance <= 3.5) return 30;
  if (distance <= 4.0) return 40;
  return -1; // Indicates custom fare needed
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

    if (action === 'calculate_pickup_fare') {
      const { 
        passengerLat, 
        passengerLng, 
        serviceType, 
        baseFare,
        vendorLat, // For delivery service
        vendorLng   // For delivery service
      } = body

      // Use vendor location for delivery, passenger location for ride
      const pickupLat = serviceType === 'delivery' ? vendorLat : passengerLat;
      const pickupLng = serviceType === 'delivery' ? vendorLng : passengerLng;

      // Find nearest available drivers
      const { data: drivers, error } = await supabaseClient
        .from('driver_locations')
        .select('driver_id, latitude, longitude, vehicle_type, users!inner(full_name)')
        .eq('status', 'available')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)

      if (error || !drivers?.length) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'No available drivers found' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404 
          }
        )
      }

      // Calculate distances to all drivers
      const driversWithDistance = drivers.map(driver => ({
        ...driver,
        distance: calculateDistance(
          pickupLat,
          pickupLng,
          driver.latitude,
          driver.longitude
        )
      })).sort((a, b) => a.distance - b.distance);

      const nearestDriver = driversWithDistance[0];
      const distance = nearestDriver.distance;
      const surcharge = calculatePickupSurcharge(distance);

      if (surcharge === -1) {
        // Long distance - requires custom fare from driver
        return new Response(
          JSON.stringify({ 
            success: true,
            requiresCustomFare: true,
            nearestDriver: {
              id: nearestDriver.driver_id,
              name: nearestDriver.users.full_name,
              distance: distance,
              vehicleType: nearestDriver.vehicle_type
            },
            distance: distance,
            baseFare: baseFare,
            message: 'Distance exceeds 4km - driver will propose custom fare'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }

      const totalFare = baseFare + surcharge;

      return new Response(
        JSON.stringify({ 
          success: true,
          requiresCustomFare: false,
          nearestDriver: {
            id: nearestDriver.driver_id,
            name: nearestDriver.users.full_name,
            distance: distance,
            vehicleType: nearestDriver.vehicle_type
          },
          distance: distance,
          baseFare: baseFare,
          surcharge: surcharge,
          totalFare: totalFare,
          surchargeReason: surcharge === 0 ? 'Free pickup within 1.5km' : 
                          `₱${surcharge} surcharge for ${distance.toFixed(1)}km pickup`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'driver_propose_custom_fare') {
      const { 
        driverId, 
        proposedFare, 
        rideId, 
        distance, 
        baseFare 
      } = body

      // Store the proposed fare for passenger approval
      const { data: updatedRide, error } = await supabaseClient
        .from('rides')
        .update({
          proposed_fare: proposedFare,
          pickup_distance: distance,
          pickup_surcharge: proposedFare - baseFare,
          status: 'custom_fare_proposed',
          updated_at: new Date().toISOString()
        })
        .eq('id', rideId)
        .eq('driver_id', driverId)
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true,
          ride: updatedRide,
          message: 'Custom fare proposed to passenger'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'passenger_respond_custom_fare') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) throw new Error('No authorization header')

      const token = authHeader.replace('Bearer ', '')
      const session = JSON.parse(atob(token))
      
      const { rideId, accepted, proposedFare } = body

      if (accepted) {
        // Update ride with accepted custom fare
        const { data: updatedRide, error } = await supabaseClient
          .from('rides')
          .update({
            agreed_fare: proposedFare,
            status: 'custom_fare_accepted',
            fare_approved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', rideId)
          .eq('user_id', session.userId)
          .select()
          .single()

        if (error) throw error

        return new Response(
          JSON.stringify({ 
            success: true,
            ride: updatedRide,
            message: 'Custom fare accepted - proceeding to dispatcher review'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      } else {
        // Passenger declined - cancel booking
        const { error } = await supabaseClient
          .from('rides')
          .update({
            status: 'cancelled',
            cancelled_reason: 'Custom fare declined by passenger',
            updated_at: new Date().toISOString()
          })
          .eq('id', rideId)
          .eq('user_id', session.userId)

        if (error) throw error

        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Booking cancelled - fare declined'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }
    }

    if (action === 'dispatcher_review_fare') {
      const { 
        rideId, 
        approved, 
        adjustedFare, 
        dispatcherId 
      } = body

      if (approved) {
        const finalFare = adjustedFare || null;
        
        // Update ride with dispatcher approval
        const { data: updatedRide, error } = await supabaseClient
          .from('rides')
          .update({
            status: 'dispatcher_approved',
            dispatcher_approved_fare: finalFare,
            dispatcher_id: dispatcherId,
            dispatcher_reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', rideId)
          .select()
          .single()

        if (error) throw error

        // Store fare intelligence data
        await supabaseClient
          .from('fare_entries')
          .insert([
            {
              pickup_distance: updatedRide.pickup_distance,
              base_fare: updatedRide.fare_amount,
              pickup_surcharge: updatedRide.pickup_surcharge,
              final_approved_fare: finalFare || updatedRide.agreed_fare,
              service_type: updatedRide.service_type || 'ride',
              dispatcher_id: dispatcherId,
              approved_at: new Date().toISOString(),
              route_data: {
                pickup: updatedRide.pickup_location,
                destination: updatedRide.destination_location
              }
            }
          ])

        return new Response(
          JSON.stringify({ 
            success: true,
            ride: updatedRide,
            finalFare: finalFare || updatedRide.agreed_fare,
            message: 'Fare approved and stored for future intelligence'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      } else {
        // Fare rejected - cancel ride
        const { error } = await supabaseClient
          .from('rides')
          .update({
            status: 'dispatcher_rejected',
            dispatcher_id: dispatcherId,
            dispatcher_reviewed_at: new Date().toISOString(),
            cancelled_reason: 'Fare rejected by dispatcher',
            updated_at: new Date().toISOString()
          })
          .eq('id', rideId)

        if (error) throw error

        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Fare rejected - booking cancelled'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }
    }

    if (action === 'get_fare_intelligence') {
      const { distance, serviceType } = body

      // Get similar fare entries for intelligence
      const { data: fareHistory, error } = await supabaseClient
        .from('fare_entries')
        .select('pickup_distance, base_fare, pickup_surcharge, final_approved_fare')
        .eq('service_type', serviceType)
        .gte('pickup_distance', distance - 0.5)
        .lte('pickup_distance', distance + 0.5)
        .order('approved_at', { ascending: false })
        .limit(10)

      if (error) throw error

      let suggestedFare = null;
      if (fareHistory?.length) {
        const avgFare = fareHistory.reduce((sum, entry) => 
          sum + entry.final_approved_fare, 0) / fareHistory.length;
        suggestedFare = Math.round(avgFare);
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          fareHistory: fareHistory || [],
          suggestedFare: suggestedFare,
          message: `Found ${fareHistory?.length || 0} similar fare entries`
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