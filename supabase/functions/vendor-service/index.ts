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

    // Create necessary tables
    const createTablesQuery = `
      CREATE TABLE IF NOT EXISTS vendors (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('store', 'meatshop', 'sari_sari', 'grocery')),
        address TEXT NOT NULL,
        phone TEXT NOT NULL,
        rating DECIMAL(2,1) DEFAULT 4.5,
        delivery_fee DECIMAL(10,2) DEFAULT 10.00,
        min_order DECIMAL(10,2) DEFAULT 50.00,
        operating_hours TEXT DEFAULT '6:00 AM - 10:00 PM',
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS vendor_products (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        vendor_id UUID REFERENCES vendors(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        category TEXT NOT NULL,
        stock INTEGER DEFAULT 100,
        unit TEXT DEFAULT 'pcs',
        description TEXT,
        image_url TEXT,
        status TEXT DEFAULT 'available',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS vendor_orders (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        vendor_id UUID REFERENCES vendors(id),
        customer_id UUID REFERENCES users(id),
        driver_id UUID REFERENCES users(id),
        vendor_name TEXT NOT NULL,
        vendor_address TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_address TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        items JSONB NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        delivery_fee DECIMAL(10,2) NOT NULL,
        j_ride_commission DECIMAL(10,2) NOT NULL,
        customer_fee DECIMAL(10,2) NOT NULL DEFAULT 10.00,
        driver_fee DECIMAL(10,2) NOT NULL DEFAULT 5.00,
        total_amount DECIMAL(10,2) NOT NULL,
        status TEXT DEFAULT 'pending',
        driver_assigned_at TIMESTAMP,
        driver_at_vendor_at TIMESTAMP,
        order_picked_up_at TIMESTAMP,
        on_the_way_at TIMESTAMP,
        delivered_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_vendors_type ON vendors(type);
      CREATE INDEX IF NOT EXISTS idx_vendor_products_vendor ON vendor_products(vendor_id);
      CREATE INDEX IF NOT EXISTS idx_vendor_orders_status ON vendor_orders(status);
      CREATE INDEX IF NOT EXISTS idx_vendor_orders_customer ON vendor_orders(customer_id);
      CREATE INDEX IF NOT EXISTS idx_vendor_orders_driver ON vendor_orders(driver_id);
    `

    await supabaseClient.rpc('exec_sql', { sql: createTablesQuery })

    if (action === 'create_sample_data') {
      // Create sample vendors
      const sampleVendors = [
        {
          name: 'Mama Aling Rosa Sari-Sari Store',
          type: 'sari_sari',
          address: 'Barangay Centro, Main Street',
          phone: '09171234567',
          rating: 4.8,
          min_order: 30
        },
        {
          name: 'Fresh Meat Shop',
          type: 'meatshop', 
          address: 'Public Market, Stall 15',
          phone: '09187654321',
          rating: 4.6,
          min_order: 100
        },
        {
          name: 'Green Valley Grocery',
          type: 'grocery',
          address: 'Commerce Plaza, Ground Floor',
          phone: '09195551234',
          rating: 4.7,
          min_order: 50
        },
        {
          name: 'Corner Mini Mart',
          type: 'store',
          address: 'Residential Area, Corner Lot',
          phone: '09162223333',
          rating: 4.5,
          min_order: 25
        }
      ]

      for (const vendor of sampleVendors) {
        const { data: newVendor } = await supabaseClient
          .from('vendors')
          .insert([vendor])
          .select()
          .single()

        // Add sample products for each vendor
        let sampleProducts = []
        
        if (vendor.type === 'sari_sari') {
          sampleProducts = [
            { name: 'Lucky Me Pancit Canton', price: 15, category: 'food', unit: 'pack', stock: 50 },
            { name: 'Coca Cola 1.5L', price: 65, category: 'beverages', unit: 'bottle', stock: 20 },
            { name: 'Tide Detergent Powder', price: 125, category: 'household', unit: 'pack', stock: 15 },
            { name: 'San Miguel Beer', price: 45, category: 'beverages', unit: 'bottle', stock: 30 },
            { name: 'Garlic', price: 25, category: 'vegetables', unit: 'pack', stock: 25 },
            { name: 'Onion', price: 35, category: 'vegetables', unit: 'kg', stock: 20 }
          ]
        } else if (vendor.type === 'meatshop') {
          sampleProducts = [
            { name: 'Pork Liempo', price: 280, category: 'meat', unit: 'kg', stock: 50 },
            { name: 'Chicken Whole', price: 160, category: 'meat', unit: 'kg', stock: 30 },
            { name: 'Beef Cube', price: 350, category: 'meat', unit: 'kg', stock: 25 },
            { name: 'Ground Pork', price: 250, category: 'meat', unit: 'kg', stock: 20 },
            { name: 'Chicken Wings', price: 200, category: 'meat', unit: 'kg', stock: 40 },
            { name: 'Pork Chop', price: 320, category: 'meat', unit: 'kg', stock: 35 }
          ]
        } else if (vendor.type === 'grocery') {
          sampleProducts = [
            { name: 'Jasmine Rice 5kg', price: 230, category: 'food', unit: 'bag', stock: 25 },
            { name: 'Cooking Oil 1L', price: 85, category: 'food', unit: 'bottle', stock: 40 },
            { name: 'Soy Sauce', price: 35, category: 'food', unit: 'bottle', stock: 50 },
            { name: 'Tomato', price: 45, category: 'vegetables', unit: 'kg', stock: 30 },
            { name: 'Potato', price: 55, category: 'vegetables', unit: 'kg', stock: 35 },
            { name: 'Banana Lakatan', price: 80, category: 'food', unit: 'kg', stock: 25 }
          ]
        } else if (vendor.type === 'store') {
          sampleProducts = [
            { name: 'Bread Loaf', price: 55, category: 'food', unit: 'pack', stock: 20 },
            { name: 'Fresh Milk 1L', price: 85, category: 'beverages', unit: 'carton', stock: 15 },
            { name: 'Eggs', price: 180, category: 'food', unit: 'tray', stock: 10 },
            { name: 'Instant Coffee', price: 125, category: 'beverages', unit: 'pack', stock: 25 },
            { name: 'Tissue Paper', price: 65, category: 'household', unit: 'pack', stock: 30 },
            { name: 'Shampoo Sachet', price: 8, category: 'household', unit: 'pcs', stock: 100 }
          ]
        }

        for (const product of sampleProducts) {
          await supabaseClient
            .from('vendor_products')
            .insert([{
              vendor_id: newVendor.id,
              ...product,
              description: `Fresh ${product.name.toLowerCase()} from ${vendor.name}`
            }])
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Sample vendors and products created successfully'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'get_vendors') {
      const { data: vendors, error } = await supabaseClient
        .from('vendors')
        .select(`
          *,
          vendor_products (*)
        `)
        .eq('status', 'active')
        .order('rating', { ascending: false })

      if (error) throw error

      // Format vendors with products
      const formattedVendors = vendors?.map(vendor => ({
        ...vendor,
        products: vendor.vendor_products || []
      })) || []

      return new Response(
        JSON.stringify({ 
          success: true,
          vendors: formattedVendors
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'place_order') {
      const { order } = body

      // Calculate commission breakdown
      const subtotal = order.subtotal
      const jRideCommission = Math.round(subtotal * 0.1) + 15 // 10% + ₱15
      const customerFee = 10 // ₱10 charged to customer
      const driverFee = 5   // ₱5 charged to driver
      const deliveryFee = customerFee // Customer pays ₱10

      const orderData = {
        ...order,
        j_ride_commission: jRideCommission,
        customer_fee: customerFee,
        driver_fee: driverFee,
        delivery_fee: deliveryFee,
        customer_name: 'Sample Customer', // In real app, get from token
        estimated_delivery_time: new Date(Date.now() + 45 * 60 * 1000).toISOString()
      }

      const { data: newOrder, error } = await supabaseClient
        .from('vendor_orders')
        .insert([orderData])
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true,
          order: newOrder,
          message: 'Order placed successfully! Finding nearest driver...'
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
        .from('vendor_orders')
        .select('*')
        .order('created_at', { ascending: false })

      // Filter based on user role
      if (user_role === 'customer') {
        // In real app, filter by customer_id from token
        query = query.limit(20)
      } else if (user_role === 'driver') {
        query = query.in('status', ['pending', 'driver_assigned', 'driver_at_vendor', 'order_picked_up', 'on_the_way', 'delivered'])
      } else if (user_role === 'vendor') {
        query = query.in('status', ['driver_assigned', 'driver_at_vendor', 'order_picked_up'])
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
      const { order_id, status, user_role } = body

      // Get current order
      const { data: currentOrder, error: fetchError } = await supabaseClient
        .from('vendor_orders')
        .select('*')
        .eq('id', order_id)
        .single()

      if (fetchError) throw fetchError

      // Validate status transition
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
        updateData.driver_id = 'demo-driver-id' // In real app, assign actual driver
      } else if (status === 'driver_at_vendor') {
        updateData.driver_at_vendor_at = new Date().toISOString()
      } else if (status === 'order_picked_up') {
        updateData.order_picked_up_at = new Date().toISOString()
      } else if (status === 'on_the_way') {
        updateData.on_the_way_at = new Date().toISOString()
      } else if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString()
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
        
        // Record commission transaction
        await supabaseClient
          .from('commission_transactions')
          .insert([
            {
              order_id: order_id,
              order_type: 'vendor_order',
              subtotal: currentOrder.subtotal,
              j_ride_commission: currentOrder.j_ride_commission,
              customer_fee: currentOrder.customer_fee,
              driver_fee: currentOrder.driver_fee,
              commission_rate: 0.10,
              fixed_fee: 15.00,
              transaction_date: new Date().toISOString()
            }
          ])
      }

      const { data: updatedOrder, error: updateError } = await supabaseClient
        .from('vendor_orders')
        .update(updateData)
        .eq('id', order_id)
        .select()
        .single()

      if (updateError) throw updateError

      // Generate response message
      let message = 'Order status updated successfully'
      
      if (status === 'driver_assigned') {
        message = 'Driver assigned successfully. Heading to vendor location.'
      } else if (status === 'driver_at_vendor') {
        message = 'Driver has arrived at vendor. Preparing order for pickup.'
      } else if (status === 'order_picked_up') {
        message = 'Order picked up successfully. Starting delivery to customer.'
      } else if (status === 'on_the_way') {
        message = 'Driver is on the way to customer location.'
      } else if (status === 'delivered') {
        message = 'Order delivered. Waiting for customer confirmation.'
      } else if (status === 'completed') {
        message = `Order completed! Commission recorded: ₱${currentOrder.j_ride_commission}`
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
      'driver': ['driver_at_vendor']
    },
    'driver_at_vendor': {
      'driver': ['order_picked_up'],
      'vendor': [] // Vendor confirms but doesn't change status
    },
    'order_picked_up': {
      'driver': ['on_the_way']
    },
    'on_the_way': {
      'driver': ['delivered']
    },
    'delivered': {
      'customer': ['completed']
    }
  }

  const allowedStatuses = validTransitions[currentStatus]?.[userRole] || []
  return allowedStatuses.includes(newStatus)
}