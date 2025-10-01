import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { action, userId, tripFare, tripId, pointsToRedeem } = await req.json()

    switch (action) {
      case 'calculate_points': {
        // Calculate 3.33% of fare as points (rounded to nearest integer)
        const pointsEarned = Math.round(tripFare * 0.0333)
        
        return new Response(
          JSON.stringify({
            success: true,
            pointsEarned,
            tripFare,
            calculationRate: '3.33%'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'award_points': {
        // Calculate points earned
        const pointsEarned = Math.round(tripFare * 0.0333)
        
        // Update user's reward points
        const { data: user, error: fetchError } = await supabaseClient
          .from('users')
          .select('reward_points, total_points_earned')
          .eq('id', userId)
          .single()

        if (fetchError) throw fetchError

        const newRewardPoints = (user.reward_points || 0) + pointsEarned
        const newTotalEarned = (user.total_points_earned || 0) + pointsEarned

        // Update user points
        const { error: updateError } = await supabaseClient
          .from('users')
          .update({ 
            reward_points: newRewardPoints,
            total_points_earned: newTotalEarned
          })
          .eq('id', userId)

        if (updateError) throw updateError

        // Record transaction
        const { error: transactionError } = await supabaseClient
          .from('reward_points_transactions')
          .insert({
            user_id: userId,
            trip_id: tripId,
            transaction_type: 'earned',
            points_amount: pointsEarned,
            trip_fare_amount: tripFare,
            description: `Points earned from ₱${tripFare} trip`
          })

        if (transactionError) throw transactionError

        return new Response(
          JSON.stringify({
            success: true,
            message: `Congratulations! You earned ${pointsEarned} reward points!`,
            pointsEarned,
            newBalance: newRewardPoints,
            totalEarned: newTotalEarned
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'redeem_points': {
        // Validate user has enough points
        const { data: user, error: fetchError } = await supabaseClient
          .from('users')
          .select('reward_points')
          .eq('id', userId)
          .single()

        if (fetchError) throw fetchError

        const currentPoints = user.reward_points || 0
        
        if (currentPoints < pointsToRedeem) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'insufficient_points',
              message: `You need ${pointsToRedeem} points but only have ${currentPoints} points`,
              currentPoints,
              requiredPoints: pointsToRedeem
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Deduct points
        const newBalance = currentPoints - pointsToRedeem

        const { error: updateError } = await supabaseClient
          .from('users')
          .update({ reward_points: newBalance })
          .eq('id', userId)

        if (updateError) throw updateError

        // Record redemption transaction
        const { error: transactionError } = await supabaseClient
          .from('reward_points_transactions')
          .insert({
            user_id: userId,
            trip_id: tripId,
            transaction_type: 'redeemed',
            points_amount: -pointsToRedeem,
            trip_fare_amount: pointsToRedeem, // 1 point = ₱1
            description: `Points redeemed for FREE ₱${pointsToRedeem} trip`
          })

        if (transactionError) throw transactionError

        return new Response(
          JSON.stringify({
            success: true,
            message: `Points redeemed successfully! Free ride confirmed.`,
            pointsRedeemed: pointsToRedeem,
            newBalance,
            freeRideValue: pointsToRedeem
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'check_redemption_eligibility': {
        const { data: user, error: fetchError } = await supabaseClient
          .from('users')
          .select('reward_points')
          .eq('id', userId)
          .single()

        if (fetchError) throw fetchError

        const currentPoints = user.reward_points || 0
        const canRedeem = currentPoints >= tripFare
        
        return new Response(
          JSON.stringify({
            success: true,
            canRedeem,
            currentPoints,
            requiredPoints: tripFare,
            shortfall: canRedeem ? 0 : (tripFare - currentPoints)
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_points_history': {
        const { data: transactions, error } = await supabaseClient
          .from('reward_points_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20)

        if (error) throw error

        return new Response(
          JSON.stringify({
            success: true,
            transactions: transactions || []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})