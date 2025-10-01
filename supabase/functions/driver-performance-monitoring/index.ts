import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PerformanceMetrics {
  driverId: string;
  averageRating: number;
  totalRatings: number;
  totalTrips: number;
  completionRate: number;
  onTimeRate: number;
  weeklyTrips: number;
  monthlyEarnings: number;
  performanceStatus: 'excellent' | 'good' | 'warning' | 'critical';
  flagged: boolean;
  flagReason?: string;
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

    if (action === 'submit_driver_rating') {
      const { rideId, driverId, rating, feedback, userId } = body

      // Validate rating
      if (rating < 1 || rating > 5) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rating must be between 1 and 5' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if already rated
      const { data: existingRating } = await supabaseClient
        .from('driver_ratings')
        .select('id')
        .eq('ride_id', rideId)
        .eq('user_id', userId)
        .single()

      if (existingRating) {
        return new Response(
          JSON.stringify({ success: false, error: 'You have already rated this ride' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Insert rating
      const { data: newRating, error } = await supabaseClient
        .from('driver_ratings')
        .insert({
          ride_id: rideId,
          driver_id: driverId,
          user_id: userId,
          rating: rating,
          feedback: feedback,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Update ride with rating
      await supabaseClient
        .from('rides')
        .update({ driver_rating: rating, rated_at: new Date().toISOString() })
        .eq('id', rideId)

      // Calculate new average rating for driver
      const { data: allRatings } = await supabaseClient
        .from('driver_ratings')
        .select('rating')
        .eq('driver_id', driverId)

      if (allRatings && allRatings.length > 0) {
        const averageRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
        
        // Update driver's average rating
        await supabaseClient
          .from('users')
          .update({ 
            driver_rating: Math.round(averageRating * 100) / 100,
            total_ratings: allRatings.length
          })
          .eq('id', driverId)

        // Auto-flag if rating drops below 3.0
        if (averageRating < 3.0 && allRatings.length >= 5) {
          await supabaseClient
            .from('driver_performance_flags')
            .upsert({
              driver_id: driverId,
              flag_type: 'low_rating',
              flag_reason: `Average rating dropped to ${averageRating.toFixed(2)} (below 3.0 threshold)`,
              severity: averageRating < 2.5 ? 'critical' : 'warning',
              flagged_at: new Date().toISOString(),
              is_active: true
            })
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          rating: newRating,
          message: 'Thank you for rating this ride!'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'get_driver_performance') {
      const { driverId, timeframe = '30' } = body

      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(timeframe));

      // Get basic driver info
      const { data: driver, error: driverError } = await supabaseClient
        .from('users')
        .select('id, full_name, driver_rating, total_ratings, created_at')
        .eq('id', driverId)
        .single()

      if (driverError) throw driverError

      // Get trip statistics
      const { data: trips, count: totalTrips } = await supabaseClient
        .from('rides')
        .select('status, created_at, completed_at, driver_rating', { count: 'exact' })
        .eq('driver_id', driverId)
        .gte('created_at', daysAgo.toISOString())

      const completedTrips = trips?.filter(t => t.status === 'completed') || [];
      const cancelledTrips = trips?.filter(t => t.status === 'cancelled') || [];
      const ratedTrips = completedTrips.filter(t => t.driver_rating);

      // Calculate metrics
      const completionRate = totalTrips > 0 ? (completedTrips.length / totalTrips) * 100 : 0;
      const averageRating = driver.driver_rating || 0;
      
      // Get recent ratings and feedback
      const { data: recentRatings } = await supabaseClient
        .from('driver_ratings')
        .select('rating, feedback, created_at, users(full_name)')
        .eq('driver_id', driverId)
        .gte('created_at', daysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10)

      // Check for performance flags
      const { data: activeFlags } = await supabaseClient
        .from('driver_performance_flags')
        .select('*')
        .eq('driver_id', driverId)
        .eq('is_active', true)
        .order('flagged_at', { ascending: false })

      // Determine performance status
      let performanceStatus: 'excellent' | 'good' | 'warning' | 'critical' = 'good';
      let flagged = false;
      let flagReason = '';

      if (activeFlags && activeFlags.length > 0) {
        flagged = true;
        flagReason = activeFlags[0].flag_reason;
        performanceStatus = activeFlags[0].severity as any;
      } else if (averageRating >= 4.5) {
        performanceStatus = 'excellent';
      } else if (averageRating >= 4.0) {
        performanceStatus = 'good';
      } else if (averageRating >= 3.0) {
        performanceStatus = 'warning';
      } else {
        performanceStatus = 'critical';
      }

      const metrics: PerformanceMetrics = {
        driverId: driverId,
        averageRating: averageRating,
        totalRatings: driver.total_ratings || 0,
        totalTrips: totalTrips || 0,
        completionRate: Math.round(completionRate * 100) / 100,
        onTimeRate: 95, // Placeholder - would need trip timing data
        weeklyTrips: Math.floor((totalTrips || 0) / (parseInt(timeframe) / 7)),
        monthlyEarnings: completedTrips.reduce((sum, trip) => sum + (trip.fare_amount || 0), 0),
        performanceStatus,
        flagged,
        flagReason
      };

      return new Response(
        JSON.stringify({
          success: true,
          driver: driver,
          metrics: metrics,
          recentRatings: recentRatings || [],
          activeFlags: activeFlags || [],
          timeframe: `${timeframe} days`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'get_dispatcher_performance_overview') {
      const { town } = body

      // Get all drivers in town
      const { data: drivers, error } = await supabaseClient
        .from('driver_locations')
        .select(`
          driver_id,
          town,
          users!inner(
            id,
            full_name,
            driver_rating,
            total_ratings,
            created_at
          )
        `)
        .eq('town', town)

      if (error) throw error

      const driverPerformances = await Promise.all(
        drivers.map(async (driver) => {
          // Get last 30 days performance
          const daysAgo = new Date();
          daysAgo.setDate(daysAgo.getDate() - 30);

          const { data: trips, count: totalTrips } = await supabaseClient
            .from('rides')
            .select('status, fare_amount, driver_rating', { count: 'exact' })
            .eq('driver_id', driver.users.id)
            .gte('created_at', daysAgo.toISOString())

          const completedTrips = trips?.filter(t => t.status === 'completed') || [];
          const monthlyEarnings = completedTrips.reduce((sum, trip) => sum + (trip.fare_amount || 0), 0);
          const completionRate = totalTrips > 0 ? (completedTrips.length / totalTrips) * 100 : 0;

          // Check for active flags
          const { data: flags } = await supabaseClient
            .from('driver_performance_flags')
            .select('severity, flag_reason')
            .eq('driver_id', driver.users.id)
            .eq('is_active', true)

          let performanceStatus: 'excellent' | 'good' | 'warning' | 'critical' = 'good';
          const rating = driver.users.driver_rating || 0;
          
          if (flags && flags.length > 0) {
            performanceStatus = flags[0].severity as any;
          } else if (rating >= 4.5) {
            performanceStatus = 'excellent';
          } else if (rating >= 4.0) {
            performanceStatus = 'good';
          } else if (rating >= 3.0) {
            performanceStatus = 'warning';
          } else if (rating > 0) {
            performanceStatus = 'critical';
          }

          return {
            id: driver.users.id,
            name: driver.users.full_name,
            rating: rating,
            totalRatings: driver.users.total_ratings || 0,
            monthlyTrips: totalTrips || 0,
            monthlyEarnings: monthlyEarnings,
            completionRate: Math.round(completionRate * 100) / 100,
            performanceStatus: performanceStatus,
            flagged: flags && flags.length > 0,
            flagReason: flags?.[0]?.flag_reason || ''
          };
        })
      );

      // Sort by performance (flagged first, then by rating)
      const sortedDrivers = driverPerformances.sort((a, b) => {
        if (a.flagged && !b.flagged) return -1;
        if (!a.flagged && b.flagged) return 1;
        return b.rating - a.rating;
      });

      // Calculate overview stats
      const totalDrivers = sortedDrivers.length;
      const excellentDrivers = sortedDrivers.filter(d => d.performanceStatus === 'excellent').length;
      const flaggedDrivers = sortedDrivers.filter(d => d.flagged).length;
      const avgRating = totalDrivers > 0 ? 
        sortedDrivers.reduce((sum, d) => sum + d.rating, 0) / totalDrivers : 0;

      return new Response(
        JSON.stringify({
          success: true,
          town: town,
          overview: {
            totalDrivers,
            excellentDrivers,
            flaggedDrivers,
            averageRating: Math.round(avgRating * 100) / 100
          },
          topPerformers: sortedDrivers.slice(0, 5),
          bottomPerformers: sortedDrivers.slice(-5).reverse(),
          allDrivers: sortedDrivers
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'manage_performance_flag') {
      const { driverId, action: flagAction, flagType, reason, severity } = body

      if (flagAction === 'create') {
        const { data: flag, error } = await supabaseClient
          .from('driver_performance_flags')
          .insert({
            driver_id: driverId,
            flag_type: flagType,
            flag_reason: reason,
            severity: severity,
            flagged_at: new Date().toISOString(),
            is_active: true
          })
          .select()
          .single()

        if (error) throw error

        return new Response(
          JSON.stringify({
            success: true,
            flag: flag,
            message: 'Performance flag created'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else if (flagAction === 'resolve') {
        const { error } = await supabaseClient
          .from('driver_performance_flags')
          .update({
            is_active: false,
            resolved_at: new Date().toISOString()
          })
          .eq('driver_id', driverId)
          .eq('is_active', true)

        if (error) throw error

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Performance flags resolved'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
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