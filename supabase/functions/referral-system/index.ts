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

    const { action, userId, referralCode, newUserPhone, newUserName, tripFare } = await req.json()

    switch (action) {
      case 'generate_referral_code': {
        const code = `JRIDE${userId.slice(-4).toUpperCase()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`
        
        const { data: existingCode } = await supabaseClient
          .from('referral_codes')
          .select('code')
          .eq('user_id', userId)
          .single()

        if (existingCode) {
          return new Response(
            JSON.stringify({
              success: true,
              referralCode: existingCode.code,
              referralLink: `https://j-ride.app/signup?ref=${existingCode.code}`,
              message: 'Your existing referral code'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error } = await supabaseClient
          .from('referral_codes')
          .insert({
            user_id: userId,
            code: code,
            created_at: new Date().toISOString()
          })

        if (error) throw error

        return new Response(
          JSON.stringify({
            success: true,
            referralCode: code,
            referralLink: `https://j-ride.app/signup?ref=${code}`,
            message: 'Referral code generated successfully'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_referral_stats': {
        const { data: referralCode } = await supabaseClient
          .from('referral_codes')
          .select('code')
          .eq('user_id', userId)
          .single()

        if (!referralCode) {
          return new Response(
            JSON.stringify({
              success: true,
              stats: {
                totalReferrals: 0,
                totalPoints: 0,
                pendingRewards: 0,
                referralCode: null,
                referralLink: null
              }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: referrals } = await supabaseClient
          .from('referrals')
          .select('*')
          .eq('referrer_id', userId)
          .eq('referred_user_type', 'passenger')

        const totalReferrals = referrals?.length || 0
        const completedReferrals = referrals?.filter(r => r.status === 'completed').length || 0
        const pendingReferrals = referrals?.filter(r => r.status === 'pending').length || 0
        const totalPoints = completedReferrals * 15

        return new Response(
          JSON.stringify({
            success: true,
            stats: {
              totalReferrals,
              completedReferrals,
              pendingReferrals,
              totalPoints,
              referralCode: referralCode.code,
              referralLink: `https://j-ride.app/signup?ref=${referralCode.code}`,
              recentReferrals: referrals?.slice(0, 5) || []
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'process_referral_signup': {
        const { data: referralCodeData } = await supabaseClient
          .from('referral_codes')
          .select('user_id, users!referral_codes_user_id_fkey(user_type)')
          .eq('code', referralCode)
          .single()

        if (!referralCodeData) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Invalid referral code'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const referrerType = referralCodeData.users.user_type
        if (referrerType !== 'driver' && referrerType !== 'passenger') {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Invalid referrer type'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: existingReferral } = await supabaseClient
          .from('referrals')
          .select('id')
          .eq('referred_phone', newUserPhone)
          .single()

        if (existingReferral) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'This phone number has already used a referral code'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { data: referral, error } = await supabaseClient
          .from('referrals')
          .insert({
            referrer_id: referralCodeData.user_id,
            referred_user_id: userId,
            referred_phone: newUserPhone,
            referred_name: newUserName,
            referred_user_type: 'passenger',
            referral_code: referralCode,
            status: 'pending',
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (error) throw error

        const expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + 7)

        await supabaseClient
          .from('users')
          .update({
            free_ride_credit: 30,
            free_ride_expires_at: expiresAt.toISOString(),
            referred_by: referralCodeData.user_id
          })
          .eq('id', userId)

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Referral processed successfully',
            freeRideCredit: 30,
            expiresAt: expiresAt.toISOString(),
            referral: referral
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'complete_referral': {
        const { data: user } = await supabaseClient
          .from('users')
          .select('referred_by, user_type')
          .eq('id', userId)
          .single()

        if (!user?.referred_by || user.user_type !== 'passenger') {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'User was not referred or is not a passenger'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error: updateError } = await supabaseClient
          .from('referrals')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('referred_user_id', userId)
          .eq('status', 'pending')

        if (updateError) throw updateError

        const { data: referrer } = await supabaseClient
          .from('users')
          .select('user_type, reward_points, total_points_earned')
          .eq('id', user.referred_by)
          .single()

        if (referrer) {
          await supabaseClient
            .from('users')
            .update({
              reward_points: (referrer.reward_points || 0) + 15,
              total_points_earned: (referrer.total_points_earned || 0) + 15
            })
            .eq('id', user.referred_by)

          await supabaseClient
            .from('reward_points_transactions')
            .insert({
              user_id: user.referred_by,
              transaction_type: 'referral_bonus',
              points_amount: 15,
              description: 'Referral bonus - New passenger completed first ride',
              created_at: new Date().toISOString()
            })
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Referral completed and 15 points awarded',
            rewardType: 'points',
            rewardAmount: 15
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'apply_points_to_ride': {
        const { data: user } = await supabaseClient
          .from('users')
          .select('reward_points')
          .eq('id', userId)
          .single()

        if (!user) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'User not found'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const availablePoints = user.reward_points || 0
        const pointsToUse = Math.min(availablePoints, tripFare)

        if (pointsToUse > 0) {
          await supabaseClient
            .from('users')
            .update({
              reward_points: availablePoints - pointsToUse
            })
            .eq('id', userId)

          await supabaseClient
            .from('reward_points_transactions')
            .insert({
              user_id: userId,
              transaction_type: 'ride_payment',
              points_amount: -pointsToUse,
              description: `Ride credit applied - ₱${pointsToUse} discount`,
              created_at: new Date().toISOString()
            })
        }

        return new Response(
          JSON.stringify({
            success: true,
            pointsUsed: pointsToUse,
            remainingFare: Math.max(0, tripFare - pointsToUse),
            remainingPoints: availablePoints - pointsToUse,
            message: pointsToUse > 0 ? `₱${pointsToUse} points credit applied` : 'No points applied'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_referral_history': {
        const { data: referrals } = await supabaseClient
          .from('referrals')
          .select('*')
          .eq('referrer_id', userId)
          .order('created_at', { ascending: false })

        return new Response(
          JSON.stringify({
            success: true,
            referrals: referrals || []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'check_free_ride_eligibility': {
        const { data: user } = await supabaseClient
          .from('users')
          .select('free_ride_credit, free_ride_expires_at, free_ride_used')
          .eq('id', userId)
          .single()

        if (!user) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'User not found'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const now = new Date()
        const expiresAt = user.free_ride_expires_at ? new Date(user.free_ride_expires_at) : null
        const isValid = user.free_ride_credit > 0 && 
                       !user.free_ride_used && 
                       expiresAt && 
                       expiresAt > now

        return new Response(
          JSON.stringify({
            success: true,
            hasValidCredit: isValid,
            creditAmount: user.free_ride_credit || 0,
            expiresAt: user.free_ride_expires_at,
            isExpired: expiresAt && expiresAt <= now,
            isUsed: user.free_ride_used
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'use_free_ride_credit': {
        const { data: user } = await supabaseClient
          .from('users')
          .select('free_ride_credit, free_ride_expires_at, free_ride_used')
          .eq('id', userId)
          .single()

        if (!user) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'User not found'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const now = new Date()
        const expiresAt = user.free_ride_expires_at ? new Date(user.free_ride_expires_at) : null
        const isValid = user.free_ride_credit > 0 && 
                       !user.free_ride_used && 
                       expiresAt && 
                       expiresAt > now

        if (!isValid) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'No valid free ride credit available'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (tripFare > user.free_ride_credit) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Trip fare ₱${tripFare} exceeds free ride credit ₱${user.free_ride_credit}`
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        await supabaseClient
          .from('users')
          .update({
            free_ride_used: true
          })
          .eq('id', userId)

        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/referral-system`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization')!
          },
          body: JSON.stringify({
            action: 'complete_referral',
            userId: userId
          })
        })

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Free ride credit applied successfully',
            creditUsed: Math.min(tripFare, user.free_ride_credit),
            remainingFare: Math.max(0, tripFare - user.free_ride_credit)
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