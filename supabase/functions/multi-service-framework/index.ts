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

    if (action === 'get_available_services') {
      // Default services configuration
      const defaultServices = [
        {
          id: 'ride',
          name: 'Tricycle Ride',
          description: 'Book a tricycle for your destination',
          icon: 'ri-taxi-line',
          color: '#3B82F6',
          is_active: true,
          display_order: 1,
          route: '/ride'
        },
        {
          id: 'rideshare',
          name: 'Ride Share',
          description: 'Share rides with other passengers',
          icon: 'ri-group-line',
          color: '#10B981',
          is_active: true,
          display_order: 2,
          route: '/tricycle-rideshare'
        },
        {
          id: 'delivery',
          name: 'Food Delivery',
          description: 'Order food from local vendors',
          icon: 'ri-restaurant-line',
          color: '#F59E0B',
          is_active: true,
          display_order: 3,
          route: '/delivery'
        },
        {
          id: 'errand',
          name: 'Errand Service',
          description: 'Get help with daily tasks',
          icon: 'ri-shopping-bag-line',
          color: '#8B5CF6',
          is_active: true,
          display_order: 4,
          route: '/errand'
        },
        {
          id: 'parcel',
          name: 'Parcel Delivery',
          description: 'Send packages anywhere in town',
          icon: 'ri-package-line',
          color: '#EF4444',
          is_active: false,
          display_order: 5,
          route: '/parcel',
          coming_soon: true
        },
        {
          id: 'remittance',
          name: 'Money Transfer',
          description: 'Send money to family & friends',
          icon: 'ri-exchange-dollar-line',
          color: '#06B6D4',
          is_active: false,
          display_order: 6,
          route: '/remittance',
          coming_soon: true
        },
        {
          id: 'grocery',
          name: 'Grocery Shopping',
          description: 'Get groceries delivered to you',
          icon: 'ri-shopping-cart-line',
          color: '#84CC16',
          is_active: false,
          display_order: 7,
          route: '/grocery',
          coming_soon: true
        },
        {
          id: 'medical',
          name: 'Medical Transport',
          description: 'Safe transport for medical needs',
          icon: 'ri-health-book-line',
          color: '#EC4899',
          is_active: false,
          display_order: 8,
          route: '/medical',
          coming_soon: true
        }
      ]

      return new Response(
        JSON.stringify({ 
          success: true,
          services: defaultServices
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'enable_new_service') {
      const { 
        serviceId, 
        serviceName, 
        description, 
        icon, 
        color, 
        route,
        adminId 
      } = body

      // Store service enablement in manual_trips table as a workaround
      const { data: service, error } = await supabaseClient
        .from('manual_trips')
        .insert([
          {
            driver_id: adminId,
            trip_type: 'service_config',
            estimated_fare: 0,
            status: 'service_enabled',
            notes: JSON.stringify({
              service_id: serviceId,
              name: serviceName,
              description: description,
              icon: icon,
              color: color,
              route: route,
              enabled_at: new Date().toISOString()
            }),
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true,
          service: {
            id: serviceId,
            name: serviceName,
            description: description,
            icon: icon,
            color: color,
            route: route,
            is_active: true
          },
          message: `${serviceName} service enabled successfully`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'create_service_booking') {
      const { 
        userId, 
        serviceId, 
        bookingData, 
        estimatedFare 
      } = body

      // Create generic service booking using rides table
      const { data: booking, error } = await supabaseClient
        .from('rides')
        .insert([
          {
            user_id: userId,
            trip_type: 'generic_service',
            service_type: serviceId,
            pickup_location: bookingData.pickup || 'Service Booking',
            destination_location: bookingData.destination || 'Service Destination',
            fare_amount: estimatedFare,
            status: 'pending',
            notes: JSON.stringify(bookingData),
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (error) throw error

      let serviceResponse = {}
      
      switch (serviceId) {
        case 'parcel':
          serviceResponse = {
            message: 'Parcel delivery service will be available soon',
            estimatedLaunch: '2024 Q2'
          }
          break
        case 'remittance':
          serviceResponse = {
            message: 'Money transfer service will be available soon',
            estimatedLaunch: '2024 Q2'
          }
          break
        case 'grocery':
          serviceResponse = {
            message: 'Grocery shopping service will be available soon',
            estimatedLaunch: '2024 Q3'
          }
          break
        case 'medical':
          serviceResponse = {
            message: 'Medical transport service will be available soon',
            estimatedLaunch: '2024 Q2'
          }
          break
        default:
          serviceResponse = { message: 'Service handler not implemented yet' }
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          booking: booking,
          serviceResponse: serviceResponse
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'get_service_status') {
      const { serviceId } = body

      // Get recent bookings for this service type
      const { data: recentBookings } = await supabaseClient
        .from('rides')
        .select('status, created_at')
        .eq('service_type', serviceId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      const statusCounts = {
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0
      }

      recentBookings?.forEach(booking => {
        if (statusCounts.hasOwnProperty(booking.status)) {
          statusCounts[booking.status]++
        }
      })

      return new Response(
        JSON.stringify({ 
          success: true,
          service: {
            id: serviceId,
            is_active: ['ride', 'rideshare', 'delivery', 'errand'].includes(serviceId)
          },
          dailyStats: statusCounts,
          totalBookings: recentBookings?.length || 0
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