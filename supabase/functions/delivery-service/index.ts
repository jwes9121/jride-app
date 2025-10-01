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

    // Create delivery_orders table if it doesn't exist
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS delivery_orders (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        customer_id UUID REFERENCES users(id),
        driver_id UUID REFERENCES users(id),
        vendor_id UUID,
        vendor_name TEXT NOT NULL,
        vendor_address TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_address TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        items JSONB NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        status TEXT DEFAULT 'pending',
        pickup_code TEXT,
        driver_assigned_at TIMESTAMP,
        vendor_confirmed_at TIMESTAMP,
        pickup_verified_at TIMESTAMP,
        delivered_at TIMESTAMP,
        completed_at TIMESTAMP,
        rating INTEGER,
        feedback TEXT,
        estimated_pickup_time TIMESTAMP,
        estimated_delivery_time TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON delivery_orders(status);
      CREATE INDEX IF NOT EXISTS idx_delivery_orders_customer ON delivery_orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_delivery_orders_driver ON delivery_orders(driver_id);
    `

    await supabaseClient.rpc('exec_sql', { sql: createTableQuery })

    if (action === 'create_sample_orders') {
      // Create sample orders for demo
      const sampleOrders = [
        {
          vendor_name: 'Mama\'s Kitchen',
          vendor_address: 'Downtown Plaza, Main Street',
          customer_name: 'John Doe',
          customer_address: '123 Residential Ave, Barangay Centro',
          customer_phone: '09171234567',
          items: [
            { name: 'Chicken Adobo', quantity: 2, price: 120 },
            { name: 'Pork Sisig', quantity: 1, price: 150 },
            { name: 'Garlic Rice', quantity: 2, price: 25 }
          ],
          total_amount: 440,
          status: 'pending',
          pickup_code: 'ABC123'
        },
        {
          vendor_name: 'Pizza Corner',
          vendor_address: 'Commerce Center, 2nd Floor',
          customer_name: 'Maria Santos',
          customer_address: '456 Sunrise Village, Phase 2',
          customer_phone: '09187654321',
          items: [
            { name: 'Hawaiian Pizza (Large)', quantity: 1, price: 380 },
            { name: 'Chicken Wings (6pcs)', quantity: 1, price: 180 },
            { name: 'Coca Cola (1.5L)', quantity: 2, price: 45 }
          ],
          total_amount: 650,
          status: 'driver_assigned',
          pickup_code: 'XYZ789'
        },
        {
          vendor_name: 'Burger Station',
          vendor_address: 'Food Court, City Mall',
          customer_name: 'Peter Cruz',
          customer_address: '789 Moonlight Street, Subdivision A',
          customer_phone: '09195551234',
          items: [
            { name: 'Bacon Cheeseburger', quantity: 2, price: 165 },
            { name: 'French Fries (Large)', quantity: 2, price: 85 },
            { name: 'Iced Tea', quantity: 2, price: 35 }
          ],
          total_amount: 570,
          status: 'on_the_way',
          pickup_code: 'DEF456'
        }
      ]

      for (const order of sampleOrders) {
        await supabaseClient
          .from('delivery_orders')
          .insert([{
            ...order,
            estimated_pickup_time: new Date(Date.now() + 20 * 60 * 1000).toISOString(),
            estimated_delivery_time: new Date(Date.now() + 45 * 60 * 1000).toISOString()
          }])
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Sample orders created successfully'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'get_orders') {
      const { user_role } = body

      let query = supabaseClient
        .from('delivery_orders')
        .select('*')
        .order('created_at', { ascending: false })

      // Filter based on user role
      if (user_role === 'customer') {
        // In real app, filter by customer_id from token
        query = query.limit(10)
      } else if (user_role === 'driver') {
        // Show available orders and assigned orders
        query = query.in('status', ['pending', 'driver_assigned', 'driver_en_route', 'arrived_at_vendor', 'vendor_confirmed', 'pickup_verified', 'on_the_way', 'arrived_at_customer', 'delivered'])
      } else if (user_role === 'vendor') {
        // Show orders that need vendor confirmation
        query = query.in('status', ['arrived_at_vendor', 'vendor_confirmed', 'pickup_verified'])
      }

      const { data: orders, error } = await query

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true,
          orders: orders || []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'update_order_status') {
      const { order_id, status, user_role, rating, feedback } = body

      // Get current order
      const { data: currentOrder, error: fetchError } = await supabaseClient
        .from('delivery_orders')
        .select('*')
        .eq('id', order_id)
        .single()

      if (fetchError) throw fetchError

      // Validate status transition based on user role
      const isValidTransition = validateStatusTransition(currentOrder.status, status, user_role)
      
      if (!isValidTransition) {
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

      // Update order with timestamp tracking
      const updateData: any = {
        status: status,
        updated_at: new Date().toISOString()
      }

      // Add timestamp fields based on status
      if (status === 'driver_assigned') {
        updateData.driver_assigned_at = new Date().toISOString()
        // Auto-assign to nearest driver (simplified for demo)
        updateData.driver_id = 'demo-driver-id'
      } else if (status === 'vendor_confirmed') {
        updateData.vendor_confirmed_at = new Date().toISOString()
        // Generate pickup code
        updateData.pickup_code = Math.random().toString(36).substring(2, 8).toUpperCase()
      } else if (status === 'pickup_verified' || status === 'on_the_way') {
        updateData.pickup_verified_at = new Date().toISOString()
      } else if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString()
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
        if (rating) updateData.rating = rating
        if (feedback) updateData.feedback = feedback
      }

      const { data: updatedOrder, error: updateError } = await supabaseClient
        .from('delivery_orders')
        .update(updateData)
        .eq('id', order_id)
        .select()
        .single()

      if (updateError) throw updateError

      // Generate appropriate response message
      let message = 'Order status updated successfully'
      
      if (status === 'driver_assigned') {
        message = 'Driver assigned successfully. Customer has been notified.'
      } else if (status === 'vendor_confirmed') {
        message = `Driver arrival confirmed. Pickup code generated: ${updateData.pickup_code}`
      } else if (status === 'on_the_way') {
        message = 'Pickup verified successfully. Customer can now track delivery.'
      } else if (status === 'delivered') {
        message = 'Order marked as delivered. Waiting for customer confirmation.'
      } else if (status === 'completed') {
        message = 'Order completed successfully. Thank you for your feedback!'
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          order: updatedOrder,
          message: message
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'assign_to_nearest_driver') {
      const { order_id } = body

      // In a real app, this would find the nearest available driver
      // For demo purposes, we'll simulate the assignment
      
      const { data: updatedOrder, error } = await supabaseClient
        .from('delivery_orders')
        .update({
          status: 'driver_assigned',
          driver_id: 'demo-driver-id',
          driver_assigned_at: new Date().toISOString(),
          estimated_pickup_time: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          estimated_delivery_time: new Date(Date.now() + 40 * 60 * 1000).toISOString()
        })
        .eq('id', order_id)
        .eq('status', 'pending')
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true,
          order: updatedOrder,
          message: 'Order assigned to nearest driver'
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

function validateStatusTransition(currentStatus: string, newStatus: string, userRole: string): boolean {
  const validTransitions: Record<string, Record<string, string[]>> = {
    'pending': {
      'driver': ['driver_assigned']
    },
    'driver_assigned': {
      'driver': ['driver_en_route', 'arrived_at_vendor']
    },
    'driver_en_route': {
      'driver': ['arrived_at_vendor']
    },
    'arrived_at_vendor': {
      'vendor': ['vendor_confirmed'],
      'driver': [] // Driver cannot change status until vendor confirms
    },
    'vendor_confirmed': {
      'driver': ['pickup_verified', 'on_the_way']
    },
    'pickup_verified': {
      'driver': ['on_the_way']
    },
    'on_the_way': {
      'driver': ['arrived_at_customer']
    },
    'arrived_at_customer': {
      'driver': ['delivered']
    },
    'delivered': {
      'customer': ['completed']
    }
  }

  const allowedStatuses = validTransitions[currentStatus]?.[userRole] || []
  return allowedStatuses.includes(newStatus)
}