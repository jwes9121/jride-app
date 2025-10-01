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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const webhookData = await req.json()
    
    // Verify webhook signature (implement based on Xendit's webhook verification)
    const xenditWebhookToken = Deno.env.get('XENDIT_WEBHOOK_TOKEN')
    const receivedToken = req.headers.get('x-callback-token')
    
    if (xenditWebhookToken && receivedToken !== xenditWebhookToken) {
      throw new Error('Invalid webhook token')
    }

    // Handle different webhook events
    if (webhookData.event && webhookData.event === 'ewallet.charge.succeeded') {
      const chargeData = webhookData.data
      
      // Find the pending transaction
      const { data: transaction } = await supabaseClient
        .from('wallet_transactions')
        .select('*')
        .eq('transaction_id', chargeData.id)
        .single()

      if (transaction && transaction.status === 'pending') {
        // Update transaction status
        await supabaseClient
          .from('wallet_transactions')
          .update({ 
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('transaction_id', chargeData.id)

        // Update user balance
        const { data: user_data } = await supabaseClient
          .from('users')
          .select('wallet_balance')
          .eq('id', transaction.user_id)
          .single()

        const currentBalance = user_data?.wallet_balance || 0
        const newBalance = currentBalance + transaction.amount

        await supabaseClient
          .from('users')
          .update({ wallet_balance: newBalance })
          .eq('id', transaction.user_id)

        console.log(`Payment completed for user ${transaction.user_id}: ₱${transaction.amount}`)
      }
    }

    if (webhookData.event && webhookData.event === 'ewallet.charge.failed') {
      const chargeData = webhookData.data
      
      // Update failed transaction
      await supabaseClient
        .from('wallet_transactions')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('transaction_id', chargeData.id)

      console.log(`Payment failed for charge ${chargeData.id}`)
    }

    if (webhookData.event && webhookData.event === 'disbursement.completed') {
      const disbursementData = webhookData.data
      
      console.log(`Payout completed: ${disbursementData.id}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})