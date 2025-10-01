import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Generate unique errand ID
function generateErrandId(): string {
  return 'ERR-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Calculate distance between two points (simplified)
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Create errand_bookings table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS errand_bookings (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        errand_id TEXT UNIQUE NOT NULL,
        customer_id UUID REFERENCES users(id),
        driver_id UUID REFERENCES users(id),
        service_type TEXT NOT NULL,
        task_description TEXT NOT NULL,
        pickup_location TEXT NOT NULL,
        destination_location TEXT,
        estimated_distance DECIMAL(5,2) NOT NULL DEFAULT 2.0,
        estimated_time INTEGER NOT NULL DEFAULT 15,
        actual_distance DECIMAL(5,2),
        actual_time INTEGER,
        base_fee DECIMAL(8,2) NOT NULL DEFAULT 100.00,
        distance_surcharge DECIMAL(8,2) NOT NULL DEFAULT 0.00,
        time_surcharge DECIMAL(8,2) NOT NULL DEFAULT 0.00,
        total_amount DECIMAL(8,2) NOT NULL,
        commission_amount DECIMAL(8,2) NOT NULL,
        driver_earnings DECIMAL(8,2) NOT NULL,
        cash_advance_needed BOOLEAN DEFAULT FALSE,
        cash_advance_amount DECIMAL(8,2) DEFAULT 0.00,
        notes TEXT,
        status TEXT DEFAULT 'pending',
        driver_assigned_at TIMESTAMP,
        errand_started_at TIMESTAMP,
        completed_at TIMESTAMP,
        cancelled_at TIMESTAMP,
        cancellation_reason TEXT,
        rating INTEGER,
        feedback TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_errand_bookings_status ON errand_bookings(status);
      CREATE INDEX IF NOT EXISTS idx_errand_bookings_customer ON errand_bookings(customer_id);
      CREATE INDEX IF NOT EXISTS idx_errand_bookings_driver ON errand_bookings(driver_id);
      CREATE INDEX IF NOT EXISTS idx_errand_bookings_errand_id ON errand_bookings(errand_id);
    `

    await supabaseClient.rpc('exec_sql', { sql: createTableQuery })

    const authHeader = req.headers.get('Authorization')
    const body = await req.json()
    const { action } = body

    if (action === 'book_errand') {
      if (!authHeader) throw new Error('Authorization required')

      const token = authHeader.replace('Bearer ', '')
      const session = JSON.parse(atob(token))

      const {
        service_type,
        task_description,
        pickup_location,
        destination_location,
        estimated_distance,
        estimated_time,
        notes,
        cash_advance_amount,
        pricing
      } = body

      // Create errand booking
      const errandId = generateErrandId();
      const cashAdvanceNeeded = cash_advance_amount > 0;

      const { data: errand, error } = await supabaseClient
        .from('errand_bookings')
        .insert([
          {
            errand_id: errandId,
            customer_id: session.userId,
            service_type: service_type,
            task_description: task_description,
            pickup_location: pickup_location,
            destination_location: destination_location,
            estimated_distance: estimated_distance,
            estimated_time: estimated_time,
            base_fee: pricing.baseFee,
            distance_surcharge: pricing.distanceSurcharge,
            time_surcharge: pricing.timeSurcharge,
            total_amount: pricing.subtotal,
            commission_amount: pricing.commission,
            driver_earnings: pricing.driverEarnings,
            cash_advance_needed: cashAdvanceNeeded,
            cash_advance_amount: cash_advance_amount || 0,
            notes: notes,
            status: 'pending',
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (error) throw error

      // Find and assign nearest available driver
      const { data: drivers } = await supabaseClient
        .from('driver_locations')
        .select('driver_id, latitude, longitude, users!inner(full_name, phone)')
        .eq('status', 'available')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)

      if (drivers?.length) {
        // For demo, assign to first available driver
        const assignedDriver = drivers[0];
        
        // Update errand with driver assignment
        await supabaseClient
          .from('errand_bookings')
          .update({
            driver_id: assignedDriver.driver_id,
            status: 'driver_assigned',
            driver_assigned_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', errand.id)

        // Update driver status
        await supabaseClient
          .from('driver_locations')
          .update({ 
            status: 'on_errand',
            last_updated: new Date().toISOString()
          })
          .eq('driver_id', assignedDriver.driver_id)
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          errand: errand,
          message: 'Errand booked successfully and driver assigned'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'get_user_errands') {
      if (!authHeader) throw new Error('Authorization required')

      const token = authHeader.replace('Bearer ', '')
      const session = JSON.parse(atob(token))

      const { data: errands, error } = await supabaseClient
        .from('errand_bookings')
        .select(`
          *,
          driver:users!driver_id(full_name, phone),
          customer:users!customer_id(full_name, phone)
        `)
        .eq('customer_id', session.userId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true,
          errands: errands || []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'get_driver_errands') {
      if (!authHeader) throw new Error('Authorization required')

      const token = authHeader.replace('Bearer ', '')
      const session = JSON.parse(atob(token))

      const { data: errands, error } = await supabaseClient
        .from('errand_bookings')
        .select(`
          *,
          customer:users!customer_id(full_name, phone)
        `)
        .eq('driver_id', session.userId)
        .in('status', ['driver_assigned', 'errand_ongoing'])
        .order('created_at', { ascending: false })

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true,
          errands: errands || []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'update_errand_status') {
      const { errand_id, status, actual_distance, actual_time, rating, feedback } = body

      // Get current errand
      const { data: currentErrand, error: fetchError } = await supabaseClient
        .from('errand_bookings')
        .select('*')
        .eq('errand_id', errand_id)
        .single()

      if (fetchError) throw fetchError

      // Validate status transition
      const validTransitions: Record<string, string[]> = {
        'pending': ['driver_assigned', 'cancelled'],
        'driver_assigned': ['errand_ongoing', 'cancelled'],
        'errand_ongoing': ['completed', 'cancelled'],
        'completed': [],
        'cancelled': []
      }

      const allowedStatuses = validTransitions[currentErrand.status] || []
      if (!allowedStatuses.includes(status)) {
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

      // Prepare update data
      const updateData: any = {
        status: status,
        updated_at: new Date().toISOString()
      }

      // Add timestamp fields based on status
      if (status === 'driver_assigned') {
        updateData.driver_assigned_at = new Date().toISOString()
      } else if (status === 'errand_ongoing') {
        updateData.errand_started_at = new Date().toISOString()
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
        if (actual_distance) updateData.actual_distance = actual_distance
        if (actual_time) updateData.actual_time = actual_time
        if (rating) updateData.rating = rating
        if (feedback) updateData.feedback = feedback

        // Recalculate pricing based on actual values if provided
        if (actual_distance || actual_time) {
          const finalDistance = actual_distance || currentErrand.estimated_distance
          const finalTime = actual_time || currentErrand.estimated_time
          
          const baseFee = 100
          const distanceSurcharge = Math.max(0, finalDistance - 2) * 20
          const timeSurcharge = Math.max(0, Math.ceil((finalTime - 15) / 10)) * 10
          const subtotal = baseFee + distanceSurcharge + timeSurcharge
          const commission = Math.round(subtotal * 0.20)
          const driverEarnings = subtotal - commission

          updateData.distance_surcharge = distanceSurcharge
          updateData.time_surcharge = timeSurcharge
          updateData.total_amount = subtotal
          updateData.commission_amount = commission
          updateData.driver_earnings = driverEarnings
        }
      } else if (status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString()
      }

      // Update errand
      const { data: updatedErrand, error: updateError } = await supabaseClient
        .from('errand_bookings')
        .update(updateData)
        .eq('errand_id', errand_id)
        .select()
        .single()

      if (updateError) throw updateError

      // Update driver status if errand completed or cancelled
      if (status === 'completed' || status === 'cancelled') {
        await supabaseClient
          .from('driver_locations')
          .update({ 
            status: 'available',
            last_updated: new Date().toISOString()
          })
          .eq('driver_id', currentErrand.driver_id)
      }

      let message = 'Errand status updated successfully'
      if (status === 'driver_assigned') {
        message = 'Driver assigned and notified'
      } else if (status === 'errand_ongoing') {
        message = 'Errand is now in progress'
      } else if (status === 'completed') {
        message = 'Errand completed successfully'
      } else if (status === 'cancelled') {
        message = 'Errand cancelled'
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          errand: updatedErrand,
          message: message
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'get_available_errands') {
      // For drivers to see available errand requests
      const { data: errands, error } = await supabaseClient
        .from('errand_bookings')
        .select(`
          *,
          customer:users!customer_id(full_name, phone)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true,
          errands: errands || []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'accept_errand') {
      if (!authHeader) throw new Error('Authorization required')

      const token = authHeader.replace('Bearer ', '')
      const session = JSON.parse(atob(token))
      const { errand_id } = body

      // Update errand with driver assignment
      const { data: updatedErrand, error } = await supabaseClient
        .from('errand_bookings')
        .update({
          driver_id: session.userId,
          status: 'driver_assigned',
          driver_assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('errand_id', errand_id)
        .eq('status', 'pending')
        .select()
        .single()

      if (error) throw error

      // Update driver status
      await supabaseClient
        .from('driver_locations')
        .update({ 
          status: 'on_errand',
          last_updated: new Date().toISOString()
        })
        .eq('driver_id', session.userId)

      return new Response(
        JSON.stringify({ 
          success: true,
          errand: updatedErrand,
          message: 'Errand accepted successfully'
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