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
    if (!authHeader) {
      throw new Error('No authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const session = JSON.parse(atob(token))
    
    if (session.exp < Date.now()) {
      throw new Error('Session expired')
    }

    const body = await req.json()
    const { action } = body

    if (action === 'create_payment') {
      const { 
        amount, 
        ride_fare, 
        processing_fees,
        booking_id, 
        payment_method, 
        description 
      } = body

      // Generate transaction ID
      const transactionId = `JRIDE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Create payment record in database
      const { data: payment, error: paymentError } = await supabaseClient
        .from('xendit_payments')
        .insert([
          {
            transaction_id: transactionId,
            booking_id: booking_id,
            user_id: session.userId,
            ride_fare: ride_fare,
            processing_fees: processing_fees,
            total_amount: amount,
            payment_method: payment_method,
            description: description,
            status: 'pending',
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single()

      if (paymentError) throw paymentError

      // In a real implementation, you would integrate with Xendit API here
      // For now, we'll simulate the payment process
      
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Update payment status to completed (in real scenario, this would be done by webhook)
      const { error: updateError } = await supabaseClient
        .from('xendit_payments')
        .update({
          status: 'completed',
          paid_at: new Date().toISOString(),
          xendit_payment_id: `xendit_${transactionId}`,
          payment_method_details: {
            type: payment_method,
            account_identifier: '09XXXXXXXXX'
          }
        })
        .eq('id', payment.id)

      if (updateError) throw updateError

      // Update ride payment status
      await supabaseClient
        .from('rides')
        .update({
          payment_status: 'paid',
          xendit_transaction_id: transactionId,
          paid_at: new Date().toISOString()
        })
        .eq('id', booking_id)

      // Log payment for collections tracking
      await supabaseClient
        .from('payment_logs')
        .upsert([
          {
            ride_id: booking_id,
            user_id: session.userId,
            payment_method: 'gcash_xendit',
            payment_type: 'online',
            ride_fare: ride_fare,
            processing_fees: processing_fees,
            total_amount: amount,
            transaction_id: transactionId,
            status: 'completed',
            logged_at: new Date().toISOString()
          }
        ])

      return new Response(
        JSON.stringify({ 
          success: true,
          transaction_id: transactionId,
          payment_id: payment.id,
          status: 'completed',
          amount: amount,
          ride_fare: ride_fare,
          processing_fees: processing_fees,
          message: 'Payment processed successfully'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'get_payment_status') {
      const { transaction_id } = body

      const { data: payment, error } = await supabaseClient
        .from('xendit_payments')
        .select('*')
        .eq('transaction_id', transaction_id)
        .single()

      if (error || !payment) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Payment not found' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404 
          }
        )
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          payment: payment
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'get_payment_history') {
      const { data: payments, error } = await supabaseClient
        .from('xendit_payments')
        .select('*, rides(pickup_location, destination_location)')
        .eq('user_id', session.userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true,
          payments: payments || []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'get_collections_report') {
      // Admin only - get collections summary
      const { data: user } = await supabaseClient
        .from('users')
        .select('user_type')
        .eq('id', session.userId)
        .single()

      if (user?.user_type !== 'admin') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Admin access required' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403 
          }
        )
      }

      const { data: paymentLogs, error } = await supabaseClient
        .from('payment_logs')
        .select('*')
        .order('logged_at', { ascending: false })

      if (error) throw error

      // Calculate collections summary
      const summary = {
        totalCashPayments: 0,
        totalOnlinePayments: 0,
        totalProcessingFees: 0,
        totalRideFares: 0,
        cashCount: 0,
        onlineCount: 0
      }

      paymentLogs?.forEach(log => {
        if (log.payment_type === 'cash') {
          summary.totalCashPayments += log.ride_fare
          summary.cashCount++
        } else if (log.payment_type === 'online') {
          summary.totalOnlinePayments += log.total_amount
          summary.totalProcessingFees += log.processing_fees
          summary.onlineCount++
        }
        summary.totalRideFares += log.ride_fare
      })

      return new Response(
        JSON.stringify({ 
          success: true,
          summary: summary,
          payment_logs: paymentLogs || []
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