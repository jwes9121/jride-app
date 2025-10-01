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

    const { action, userId, referrerCode, userType, phoneNumber } = await req.json()

    switch (action) {
      case 'generate_referral_link': {
        // Generate or get existing referral code
        const { data: user } = await supabaseClient
          .from('users')
          .select('referral_code, id')
          .eq('id', userId)
          .single()

        if (!user) {
          return new Response(
            JSON.stringify({ success: false, error: 'User not found' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        let referralCode = user.referral_code
        if (!referralCode) {
          // Generate unique referral code using user ID
          referralCode = user.id.replace(/-/g, '').substring(0, 12).toUpperCase()
          
          // Update user with referral code
          await supabaseClient
            .from('users')
            .update({ referral_code: referralCode })
            .eq('id', userId)
        }

        // Initialize rewards wallet if doesn't exist
        const { data: wallet } = await supabaseClient
          .from('rewards_wallet')
          .select('*')
          .eq('user_id', userId)
          .single()

        if (!wallet) {
          await supabaseClient
            .from('rewards_wallet')
            .insert({
              user_id: userId,
              points_balance: 0,
              last_updated: new Date().toISOString()
            })
        }

        return new Response(
          JSON.stringify({
            success: true,
            referralCode: referralCode,
            referralLink: `https://jride.com/ref/${referralCode}`,
            message: 'Referral link generated successfully'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'process_referral_signup': {
        // Validate referral code exists
        const { data: referrer } = await supabaseClient
          .from('users')
          .select('id, user_type, phone_number')
          .eq('referral_code', referrerCode)
          .single()

        if (!referrer) {
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid referral code' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Prevent self-referral
        if (referrer.id === userId) {
          return new Response(
            JSON.stringify({ success: false, error: 'Cannot refer yourself' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Prevent multiple accounts from same phone
        if (referrer.phone_number === phoneNumber) {
          return new Response(
            JSON.stringify({ success: false, error: 'Cannot use same phone number for referral' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check if user already used a referral
        const { data: existingReferral } = await supabaseClient
          .from('referrals')
          .select('id')
          .eq('referee_id', userId)
          .single()

        if (existingReferral) {
          return new Response(
            JSON.stringify({ success: false, error: 'User already used a referral code' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Create pending referral
        const { data: referral, error } = await supabaseClient
          .from('referrals')
          .insert({
            referrer_id: referrer.id,
            referee_id: userId,
            user_type: userType,
            status: 'pending',
            points_awarded: 0
          })
          .select()
          .single()

        if (error) throw error

        // Initialize rewards wallet for both users if not exists
        await supabaseClient
          .from('rewards_wallet')
          .upsert([
            { user_id: referrer.id, points_balance: 0 },
            { user_id: userId, points_balance: 0 }
          ], { onConflict: 'user_id' })

        return new Response(
          JSON.stringify({
            success: true,
            referral: referral,
            message: 'Referral processed successfully. Complete your first ride to earn rewards!'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'complete_referral': {
        // Find pending referral for this user
        const { data: referral } = await supabaseClient
          .from('referrals')
          .select('*')
          .eq('referee_id', userId)
          .eq('status', 'pending')
          .single()

        if (!referral) {
          return new Response(
            JSON.stringify({ success: false, error: 'No pending referral found' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Update referral status
        await supabaseClient
          .from('referrals')
          .update({
            status: 'completed',
            points_awarded: 15
          })
          .eq('id', referral.id)

        // Award 15 points to referrer
        const { data: referrerWallet } = await supabaseClient
          .from('rewards_wallet')
          .select('points_balance')
          .eq('user_id', referral.referrer_id)
          .single()

        const newBalance = (referrerWallet?.points_balance || 0) + 15

        await supabaseClient
          .from('rewards_wallet')
          .update({
            points_balance: newBalance,
            last_updated: new Date().toISOString()
          })
          .eq('user_id', referral.referrer_id)

        // Log the transaction
        await supabaseClient
          .from('reward_transactions')
          .insert({
            user_id: referral.referrer_id,
            points_change: 15,
            reason: 'referral_completed'
          })

        return new Response(
          JSON.stringify({
            success: true,
            pointsAwarded: 15,
            message: 'Referral completed! 15 points awarded to referrer.'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'redeem_rewards': {
        const { redeemType } = await req.json() // 'free_ride' or 'wallet_credit'

        // Get user's current points balance
        const { data: wallet } = await supabaseClient
          .from('rewards_wallet')
          .select('points_balance')
          .eq('user_id', userId)
          .single()

        if (!wallet || wallet.points_balance < 30) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Insufficient points',
              currentBalance: wallet?.points_balance || 0,
              required: 30
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Get user type
        const { data: user } = await supabaseClient
          .from('users')
          .select('user_type')
          .eq('id', userId)
          .single()

        if (!user) {
          return new Response(
            JSON.stringify({ success: false, error: 'User not found' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Deduct 30 points
        const newBalance = wallet.points_balance - 30

        await supabaseClient
          .from('rewards_wallet')
          .update({
            points_balance: newBalance,
            last_updated: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (user.user_type === 'passenger' && redeemType === 'free_ride') {
          // Grant free ride voucher worth ₱30
          const expiresAt = new Date()
          expiresAt.setDate(expiresAt.getDate() + 30) // 30 days expiry

          await supabaseClient
            .from('users')
            .update({
              free_ride_voucher_amount: 30,
              free_ride_voucher_expires_at: expiresAt.toISOString()
            })
            .eq('id', userId)

          // Log transaction
          await supabaseClient
            .from('reward_transactions')
            .insert({
              user_id: userId,
              points_change: -30,
              reason: 'redeem_free_ride'
            })

          return new Response(
            JSON.stringify({
              success: true,
              message: '₱30 free ride voucher granted!',
              voucherAmount: 30,
              expiresAt: expiresAt.toISOString(),
              newBalance: newBalance
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )

        } else if (user.user_type === 'driver' && redeemType === 'wallet_credit') {
          // Credit ₱30 to driver's wallet
          await supabaseClient
            .from('wallet_transactions')
            .insert({
              user_id: userId,
              amount: 30,
              type: 'reward_redemption',
              description: 'Reward points redemption - ₱30 credit',
              status: 'completed'
            })

          // Update wallet balance
          await supabaseClient.rpc('update_wallet_balance', {
            user_id: userId,
            amount_change: 30
          })

          // Log reward transaction
          await supabaseClient
            .from('reward_transactions')
            .insert({
              user_id: userId,
              points_change: -30,
              reason: 'redeem_wallet_credit'
            })

          return new Response(
            JSON.stringify({
              success: true,
              message: '₱30 credited to your wallet!',
              creditAmount: 30,
              newBalance: newBalance
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ success: false, error: 'Invalid redemption type for user' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_rewards_balance': {
        // Get rewards wallet balance
        const { data: wallet } = await supabaseClient
          .from('rewards_wallet')
          .select('points_balance, last_updated')
          .eq('user_id', userId)
          .single()

        // Get recent transactions
        const { data: transactions } = await supabaseClient
          .from('reward_transactions')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10)

        // Get referral stats
        const { data: referrals } = await supabaseClient
          .from('referrals')
          .select('status')
          .eq('referrer_id', userId)

        const pendingReferrals = referrals?.filter(r => r.status === 'pending').length || 0
        const completedReferrals = referrals?.filter(r => r.status === 'completed').length || 0

        // Get user's voucher status
        const { data: user } = await supabaseClient
          .from('users')
          .select('free_ride_voucher_amount, free_ride_voucher_expires_at, user_type')
          .eq('id', userId)
          .single()

        return new Response(
          JSON.stringify({
            success: true,
            pointsBalance: wallet?.points_balance || 0,
            lastUpdated: wallet?.last_updated,
            canRedeemFreeRide: (wallet?.points_balance || 0) >= 30 && user?.user_type === 'passenger',
            canRedeemWalletCredit: (wallet?.points_balance || 0) >= 30 && user?.user_type === 'driver',
            freeRideVoucher: {
              amount: user?.free_ride_voucher_amount || 0,
              expiresAt: user?.free_ride_voucher_expires_at
            },
            referralStats: {
              pending: pendingReferrals,
              completed: completedReferrals,
              totalPointsEarned: completedReferrals * 15
            },
            transactions: transactions || []
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'use_free_ride_voucher': {
        const { tripFare } = await req.json()

        // Get user's voucher
        const { data: user } = await supabaseClient
          .from('users')
          .select('free_ride_voucher_amount, free_ride_voucher_expires_at')
          .eq('id', userId)
          .single()

        if (!user?.free_ride_voucher_amount || user.free_ride_voucher_amount <= 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'No active free ride voucher' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check expiry
        if (user.free_ride_voucher_expires_at && new Date(user.free_ride_voucher_expires_at) < new Date()) {
          return new Response(
            JSON.stringify({ success: false, error: 'Free ride voucher has expired' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const voucherAmount = user.free_ride_voucher_amount
        const discountApplied = Math.min(voucherAmount, tripFare)
        const remainingFare = Math.max(0, tripFare - voucherAmount)
        const remainingVoucher = Math.max(0, voucherAmount - tripFare)

        // Update voucher amount
        await supabaseClient
          .from('users')
          .update({
            free_ride_voucher_amount: remainingVoucher
          })
          .eq('id', userId)

        return new Response(
          JSON.stringify({
            success: true,
            discountApplied: discountApplied,
            remainingFare: remainingFare,
            remainingVoucher: remainingVoucher,
            message: remainingVoucher > 0 ? `₱${discountApplied} discount applied. ₱${remainingVoucher} voucher remaining.` : 'Free ride voucher used completely!'
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