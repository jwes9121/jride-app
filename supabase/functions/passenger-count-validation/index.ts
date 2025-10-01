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

    if (action === 'verify_passenger_count') {
      const { 
        rideId, 
        driverId, 
        declaredCount, 
        actualCount, 
        driverAccepts, 
        vehicleType 
      } = body

      const fareAdjustmentNeeded = actualCount !== declaredCount
      const additionalFare = fareAdjustmentNeeded ? (actualCount - declaredCount) * 10 : 0

      // Get ride details
      const { data: ride, error: rideError } = await supabaseClient
        .from('rides')
        .select('*, users!inner(id, full_name, phone)')
        .eq('id', rideId)
        .single()

      if (rideError) throw rideError

      if (!driverAccepts && fareAdjustmentNeeded && additionalFare > 0) {
        // Driver declined due to passenger misdeclaration
        await supabaseClient
          .from('passenger_violations')
          .insert({
            user_id: ride.user_id,
            ride_id: rideId,
            driver_id: driverId,
            violation_type: 'passenger_count_misdeclaration',
            declared_count: declaredCount,
            actual_count: actualCount,
            fare_difference: additionalFare,
            driver_declined: true,
            created_at: new Date().toISOString()
          })

        // Cancel the ride
        await supabaseClient
          .from('rides')
          .update({
            status: 'cancelled',
            cancelled_reason: 'Driver declined - passenger count mismatch',
            cancelled_at: new Date().toISOString()
          })
          .eq('id', rideId)

        // Check for penalties
        const penaltyResult = await checkAndApplyPenalty(supabaseClient, ride.user_id, 'passenger_count_misdeclaration')

        return new Response(
          JSON.stringify({
            success: true,
            rideStatus: 'cancelled',
            incidentRecorded: true,
            penalty: penaltyResult,
            message: 'Ride cancelled - incident recorded'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update ride with verified passenger count and adjusted fare
      const adjustedFare = ride.agreed_fare + additionalFare
      
      const { error: updateError } = await supabaseClient
        .from('rides')
        .update({
          actual_passenger_count: actualCount,
          fare_adjustment: additionalFare,
          final_fare: adjustedFare,
          count_verified_at: new Date().toISOString(),
          status: 'in_progress'
        })
        .eq('id', rideId)

      if (updateError) throw updateError

      // Record verification log
      await supabaseClient
        .from('passenger_count_verifications')
        .insert({
          ride_id: rideId,
          driver_id: driverId,
          passenger_id: ride.user_id,
          declared_count: declaredCount,
          actual_count: actualCount,
          fare_adjustment: additionalFare,
          verification_result: fareAdjustmentNeeded ? 'mismatch_accepted' : 'count_correct',
          verified_at: new Date().toISOString()
        })

      // If there was a mismatch but driver accepted, still record as minor violation
      if (fareAdjustmentNeeded) {
        await supabaseClient
          .from('passenger_violations')
          .insert({
            user_id: ride.user_id,
            ride_id: rideId,
            driver_id: driverId,
            violation_type: 'passenger_count_mismatch_minor',
            declared_count: declaredCount,
            actual_count: actualCount,
            fare_difference: additionalFare,
            driver_declined: false,
            created_at: new Date().toISOString()
          })
      }

      return new Response(
        JSON.stringify({
          success: true,
          rideStatus: 'verified',
          adjustedFare: adjustedFare,
          fareAdjustment: additionalFare,
          message: fareAdjustmentNeeded ? 'Fare adjusted for passenger count' : 'Passenger count verified'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'submit_post_trip_survey') {
      const { 
        rideId, 
        userId, 
        passengerCountCorrect, 
        fareExplained, 
        additionalFeedback,
        issueType 
      } = body

      // Insert survey response
      const { error: surveyError } = await supabaseClient
        .from('post_trip_surveys')
        .insert({
          ride_id: rideId,
          user_id: userId,
          passenger_count_correct: passengerCountCorrect,
          fare_explained: fareExplained,
          additional_feedback: additionalFeedback,
          issue_type: issueType,
          created_at: new Date().toISOString()
        })

      if (surveyError) throw surveyError

      // If negative responses, flag for dispatcher review
      if (!passengerCountCorrect || !fareExplained) {
        const { data: ride } = await supabaseClient
          .from('rides')
          .select('driver_id, dispatcher_id')
          .eq('id', rideId)
          .single()

        await supabaseClient
          .from('survey_flags')
          .insert({
            ride_id: rideId,
            passenger_id: userId,
            driver_id: ride?.driver_id,
            flag_type: !passengerCountCorrect ? 'passenger_count_issue' : 'fare_dispute',
            issue_details: additionalFeedback,
            flagged_at: new Date().toISOString(),
            status: 'pending_review'
          })

        // Notify dispatcher
        if (ride?.dispatcher_id) {
          await supabaseClient
            .from('dispatcher_notifications')
            .insert({
              dispatcher_id: ride.dispatcher_id,
              type: 'survey_flag',
              title: 'Negative Trip Survey',
              message: `Ride ${rideId} received negative feedback requiring review`,
              reference_id: rideId,
              created_at: new Date().toISOString()
            })
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          flaggedForReview: !passengerCountCorrect || !fareExplained,
          message: 'Survey submitted successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'get_user_violations') {
      const { userId } = body

      const { data: violations, error } = await supabaseClient
        .from('passenger_violations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const { data: penalties, error: penaltyError } = await supabaseClient
        .from('user_penalties')
        .select('*')
        .eq('user_id', userId)
        .order('applied_at', { ascending: false })

      if (penaltyError) throw penaltyError

      return new Response(
        JSON.stringify({
          success: true,
          violations: violations || [],
          penalties: penalties || []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function checkAndApplyPenalty(supabaseClient: any, userId: string, violationType: string) {
  // Count previous violations
  const { data: violations, error } = await supabaseClient
    .from('passenger_violations')
    .select('*')
    .eq('user_id', userId)
    .eq('violation_type', violationType)

  if (error) throw error

  const offenseCount = (violations?.length || 0) + 1

  let penaltyType: string
  let penaltyAmount = 0
  let suspensionDuration: string | null = null

  // Determine penalty based on offense count
  if (offenseCount === 1) {
    penaltyType = 'warning'
  } else if (offenseCount === 2) {
    penaltyType = 'deduction'
    penaltyAmount = 50
  } else if (offenseCount === 3) {
    penaltyType = 'suspension'
    suspensionDuration = '1 week'
  } else {
    penaltyType = 'ban'
  }

  // Apply penalty
  const { data: penalty, error: penaltyError } = await supabaseClient
    .from('user_penalties')
    .insert({
      user_id: userId,
      penalty_type: penaltyType,
      violation_type: violationType,
      amount: penaltyAmount,
      suspension_duration: suspensionDuration,
      offense_count: offenseCount,
      applied_at: new Date().toISOString(),
      status: 'active'
    })
    .select()
    .single()

  if (penaltyError) throw penaltyError

  // Process deduction if applicable
  if (penaltyType === 'deduction') {
    await processDeduction(supabaseClient, userId, penaltyAmount)
  }

  // Suspend user if applicable
  if (penaltyType === 'suspension') {
    const suspensionEnd = new Date()
    suspensionEnd.setDate(suspensionEnd.getDate() + 7)
    
    await supabaseClient
      .from('users')
      .update({
        is_suspended: true,
        suspension_end: suspensionEnd.toISOString()
      })
      .eq('id', userId)
  }

  // Ban user if applicable
  if (penaltyType === 'ban') {
    await supabaseClient
      .from('users')
      .update({
        is_banned: true,
        banned_at: new Date().toISOString()
      })
      .eq('id', userId)
  }

  return {
    type: penaltyType,
    amount: penaltyAmount,
    offenseCount: offenseCount,
    suspensionDuration: suspensionDuration
  }
}

async function processDeduction(supabaseClient: any, userId: string, amount: number) {
  // Try to deduct from wallet first
  const { data: user, error } = await supabaseClient
    .from('users')
    .select('wallet_balance, reward_points')
    .eq('id', userId)
    .single()

  if (error) throw error

  let remainingAmount = amount
  let walletDeduction = 0
  let pointsDeduction = 0

  // Deduct from wallet first
  if (user.wallet_balance >= remainingAmount) {
    walletDeduction = remainingAmount
    remainingAmount = 0
  } else {
    walletDeduction = user.wallet_balance
    remainingAmount -= user.wallet_balance
  }

  // Deduct remaining from points (1 point = ₱1)
  if (remainingAmount > 0 && user.reward_points >= remainingAmount) {
    pointsDeduction = remainingAmount
    remainingAmount = 0
  } else if (remainingAmount > 0) {
    pointsDeduction = user.reward_points
    remainingAmount -= user.reward_points
  }

  // Apply deductions
  if (walletDeduction > 0) {
    await supabaseClient
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        amount: -walletDeduction,
        type: 'penalty_deduction',
        description: 'Penalty for passenger count misdeclaration',
        status: 'completed',
        created_at: new Date().toISOString()
      })

    await supabaseClient.rpc('update_wallet_balance', {
      user_id: userId,
      amount_change: -walletDeduction
    })
  }

  if (pointsDeduction > 0) {
    await supabaseClient
      .from('reward_points_transactions')
      .insert({
        user_id: userId,
        points: -pointsDeduction,
        type: 'penalty_deduction',
        description: 'Penalty deduction for passenger count misdeclaration',
        created_at: new Date().toISOString()
      })

    await supabaseClient.rpc('update_reward_points', {
      user_id: userId,
      points_change: -pointsDeduction
    })
  }

  // Store remaining amount for auto-deduction
  if (remainingAmount > 0) {
    await supabaseClient
      .from('pending_deductions')
      .insert({
        user_id: userId,
        amount: remainingAmount,
        reason: 'Penalty for passenger count misdeclaration',
        created_at: new Date().toISOString()
      })
  }

  return {
    walletDeduction,
    pointsDeduction,
    remainingAmount
  }
}