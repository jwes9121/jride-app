import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MembershipTier {
  tier: 'Bronze' | 'Silver' | 'Gold';
  minRides: number;
  minTopUps: number;
  priorityMatching: boolean;
  discountPercentage: number;
  bonusPointsMultiplier: number;
  perks: string[];
}

const membershipTiers: MembershipTier[] = [
  {
    tier: 'Gold',
    minRides: 50,
    minTopUps: 10,
    priorityMatching: true,
    discountPercentage: 10,
    bonusPointsMultiplier: 2.0,
    perks: [
      'Priority driver matching (30 seconds faster)',
      '10% discount on all rides',
      'Double reward points (6.66%)',
      'Free ride on your birthday',
      'VIP customer support',
      'Exclusive Gold member events'
    ]
  },
  {
    tier: 'Silver',
    minRides: 25,
    minTopUps: 5,
    priorityMatching: true,
    discountPercentage: 5,
    bonusPointsMultiplier: 1.5,
    perks: [
      'Priority driver matching (15 seconds faster)',
      '5% discount on all rides',
      '1.5x reward points (5%)',
      'Monthly bonus points',
      'Priority customer support'
    ]
  },
  {
    tier: 'Bronze',
    minRides: 10,
    minTopUps: 2,
    priorityMatching: false,
    discountPercentage: 2,
    bonusPointsMultiplier: 1.2,
    perks: [
      'Standard driver matching',
      '2% discount on rides',
      '1.2x reward points (4%)',
      'Welcome bonus points'
    ]
  }
];

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

    if (action === 'calculate_membership_tier') {
      const { userId } = body

      // Get user's ride count and wallet top-ups
      const { data: user, error: userError } = await supabaseClient
        .from('users')
        .select('id, full_name, membership_tier, total_rides, total_topups')
        .eq('id', userId)
        .single()

      if (userError) throw userError

      // Count completed rides
      const { count: rideCount } = await supabaseClient
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'completed')

      // Count wallet top-ups
      const { count: topUpCount } = await supabaseClient
        .from('wallet_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('transaction_type', 'topup')

      const totalRides = rideCount || 0;
      const totalTopUps = topUpCount || 0;

      // Determine membership tier
      let currentTier: MembershipTier = membershipTiers[2]; // Default Bronze
      
      for (const tier of membershipTiers) {
        if (totalRides >= tier.minRides && totalTopUps >= tier.minTopUps) {
          currentTier = tier;
          break;
        }
      }

      // Update user's membership tier if changed
      if (user.membership_tier !== currentTier.tier) {
        await supabaseClient
          .from('users')
          .update({
            membership_tier: currentTier.tier,
            total_rides: totalRides,
            total_topups: totalTopUps,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
      }

      // Calculate progress to next tier
      let nextTier = null;
      let progressInfo = null;

      const currentTierIndex = membershipTiers.findIndex(t => t.tier === currentTier.tier);
      if (currentTierIndex > 0) {
        nextTier = membershipTiers[currentTierIndex - 1];
        progressInfo = {
          ridesNeeded: Math.max(0, nextTier.minRides - totalRides),
          topUpsNeeded: Math.max(0, nextTier.minTopUps - totalTopUps),
          ridesProgress: Math.min(100, (totalRides / nextTier.minRides) * 100),
          topUpsProgress: Math.min(100, (totalTopUps / nextTier.minTopUps) * 100)
        };
      }

      return new Response(
        JSON.stringify({
          success: true,
          currentTier: currentTier,
          nextTier: nextTier,
          progress: progressInfo,
          stats: {
            totalRides,
            totalTopUps
          },
          tierChanged: user.membership_tier !== currentTier.tier
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'apply_membership_benefits') {
      const { userId, fareAmount } = body

      const { data: user, error } = await supabaseClient
        .from('users')
        .select('membership_tier')
        .eq('id', userId)
        .single()

      if (error) throw error

      const userTier = membershipTiers.find(t => t.tier === user.membership_tier) || membershipTiers[2];
      
      // Calculate discount
      const discount = Math.round(fareAmount * (userTier.discountPercentage / 100));
      const discountedFare = fareAmount - discount;
      
      // Calculate bonus points
      const basePoints = Math.round(fareAmount * 0.0333); // 3.33% base
      const bonusPoints = Math.round(basePoints * userTier.bonusPointsMultiplier);

      return new Response(
        JSON.stringify({
          success: true,
          originalFare: fareAmount,
          discount: discount,
          finalFare: discountedFare,
          basePoints: basePoints,
          bonusPoints: bonusPoints,
          pointsMultiplier: userTier.bonusPointsMultiplier,
          membershipTier: userTier.tier,
          priorityMatching: userTier.priorityMatching
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'get_tier_requirements') {
      return new Response(
        JSON.stringify({
          success: true,
          tiers: membershipTiers.map(tier => ({
            ...tier,
            color: tier.tier === 'Gold' ? '#FFD700' : 
                   tier.tier === 'Silver' ? '#C0C0C0' : '#CD7F32'
          }))
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'check_birthday_bonus') {
      const { userId } = body

      const { data: user, error } = await supabaseClient
        .from('users')
        .select('date_of_birth, membership_tier, last_birthday_bonus')
        .eq('id', userId)
        .single()

      if (error || !user.date_of_birth) {
        return new Response(
          JSON.stringify({ success: false, eligible: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const today = new Date();
      const birthday = new Date(user.date_of_birth);
      const thisYearBirthday = new Date(today.getFullYear(), birthday.getMonth(), birthday.getDate());
      
      // Check if today is birthday and Gold member
      const isBirthday = today.toDateString() === thisYearBirthday.toDateString();
      const isGoldMember = user.membership_tier === 'Gold';
      const alreadyClaimed = user.last_birthday_bonus && 
        new Date(user.last_birthday_bonus).getFullYear() === today.getFullYear();

      const eligible = isBirthday && isGoldMember && !alreadyClaimed;

      if (eligible) {
        // Award free ride points (100 points)
        await supabaseClient
          .from('users')
          .update({
            reward_points: user.reward_points + 100,
            last_birthday_bonus: today.toISOString()
          })
          .eq('id', userId)

        // Record transaction
        await supabaseClient
          .from('reward_points_transactions')
          .insert({
            user_id: userId,
            transaction_type: 'earned',
            points_amount: 100,
            description: 'Happy Birthday! Gold Member Free Ride Bonus'
          })
      }

      return new Response(
        JSON.stringify({
          success: true,
          eligible: eligible,
          isBirthday: isBirthday,
          isGoldMember: isGoldMember,
          alreadyClaimed: alreadyClaimed,
          bonusAwarded: eligible ? 100 : 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

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