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

    const { action, amount, method, payment_details, payout_cycle, transaction_id, admin_approval, 
            trip_id, fare_amount, payment_method, driver_id, commission_rate = 0.10 } = await req.json()

    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', session.userId)
      .single()

    if (userError) throw userError

    // Process Trip Commission - Automatic Deduction/Credit System
    if (action === 'process_trip_commission') {
      const { data: driver } = await supabaseClient
        .from('users')
        .select('wallet_balance, full_name')
        .eq('id', driver_id)
        .eq('user_type', 'driver')
        .single()

      if (!driver) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Driver not found' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404 
          }
        )
      }

      const commission_amount = Math.round(fare_amount * commission_rate * 100) / 100
      const net_driver_earnings = fare_amount - commission_amount
      const transactionId = `COMM_${Date.now()}_${trip_id.slice(-6)}`

      if (payment_method === 'cash') {
        // Cash Payment: Passenger pays driver directly, system deducts commission from driver wallet
        const new_balance = driver.wallet_balance - commission_amount

        // Update driver wallet balance
        const { error: updateError } = await supabaseClient
          .from('users')
          .update({ wallet_balance: new_balance })
          .eq('id', driver_id)

        if (updateError) throw updateError

        // Create commission deduction transaction
        const { error: transactionError } = await supabaseClient
          .from('wallet_transactions')
          .insert([
            {
              user_id: driver_id,
              transaction_id: transactionId,
              type: 'commission_deduction',
              amount: -commission_amount,
              fee_amount: 0,
              net_amount: -commission_amount,
              description: `Commission deducted for cash trip`,
              status: 'completed',
              payment_method: 'cash',
              trip_reference: trip_id,
              fare_amount: fare_amount,
              commission_rate: commission_rate,
              driver_net_earnings: net_driver_earnings,
              completed_at: new Date().toISOString(),
              payment_details: {
                trip_id: trip_id,
                fare_amount: fare_amount,
                commission_amount: commission_amount,
                driver_received_cash: fare_amount,
                commission_deducted_from_wallet: commission_amount
              }
            }
          ])

        if (transactionError) throw transactionError

        // Create commission entry for company records
        await supabaseClient
          .from('commission_transactions')
          .insert([
            {
              trip_id: trip_id,
              driver_id: driver_id,
              fare_amount: fare_amount,
              commission_rate: commission_rate,
              commission_amount: commission_amount,
              payment_method: 'cash',
              status: 'completed',
              processed_at: new Date().toISOString()
            }
          ])

        console.log(`SMS: Commission deducted for ${driver.full_name}. Trip: ${trip_id}, Fare: ₱${fare_amount}, Commission: ₱${commission_amount}, New Balance: ₱${new_balance.toFixed(2)}`)

        return new Response(
          JSON.stringify({ 
            success: true,
            transaction_id: transactionId,
            trip_id: trip_id,
            fare_amount: fare_amount,
            commission_amount: commission_amount,
            driver_received_cash: fare_amount,
            driver_new_balance: new_balance,
            payment_method: 'cash',
            message: 'Cash trip commission deducted successfully'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )

      } else {
        // Online Payment: System receives payment, credits net earnings to driver wallet
        const new_balance = driver.wallet_balance + net_driver_earnings

        // Update driver wallet balance
        const { error: updateError } = await supabaseClient
          .from('users')
          .update({ wallet_balance: new_balance })
          .eq('id', driver_id)

        if (updateError) throw updateError

        // Create earnings credit transaction
        const { error: transactionError } = await supabaseClient
          .from('wallet_transactions')
          .insert([
            {
              user_id: driver_id,
              transaction_id: transactionId,
              type: 'trip_earnings',
              amount: net_driver_earnings,
              fee_amount: 0,
              net_amount: net_driver_earnings,
              description: `Trip earnings credited (online payment)`,
              status: 'completed',
              payment_method: payment_method,
              trip_reference: trip_id,
              fare_amount: fare_amount,
              commission_rate: commission_rate,
              driver_net_earnings: net_driver_earnings,
              completed_at: new Date().toISOString(),
              payment_details: {
                trip_id: trip_id,
                fare_amount: fare_amount,
                commission_amount: commission_amount,
                net_credited_to_driver: net_driver_earnings,
                payment_received_by_system: fare_amount
              }
            }
          ])

        if (transactionError) throw transactionError

        // Create commission entry for company records
        await supabaseClient
          .from('commission_transactions')
          .insert([
            {
              trip_id: trip_id,
              driver_id: driver_id,
              fare_amount: fare_amount,
              commission_rate: commission_rate,
              commission_amount: commission_amount,
              payment_method: payment_method,
              status: 'completed',
              processed_at: new Date().toISOString()
            }
          ])

        console.log(`SMS: Trip earnings credited for ${driver.full_name}. Trip: ${trip_id}, Fare: ₱${fare_amount}, Net Earnings: ₱${net_driver_earnings}, New Balance: ₱${new_balance.toFixed(2)}`)

        return new Response(
          JSON.stringify({ 
            success: true,
            transaction_id: transactionId,
            trip_id: trip_id,
            fare_amount: fare_amount,
            commission_amount: commission_amount,
            net_driver_earnings: net_driver_earnings,
            driver_new_balance: new_balance,
            payment_method: payment_method,
            message: 'Online trip earnings credited successfully'
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }
    }

    // Get Driver Wallet Ledger with Full Transparency
    if (action === 'get_driver_ledger') {
      if (user.user_type !== 'driver') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Driver access required' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403 
          }
        )
      }

      // Get all wallet transactions
      const { data: transactions } = await supabaseClient
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', session.userId)
        .order('created_at', { ascending: false })
        .limit(100)

      // Get commission summary
      const { data: commissionData } = await supabaseClient
        .from('commission_transactions')
        .select('*')
        .eq('driver_id', session.userId)
        .order('processed_at', { ascending: false })

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const ledgerSummary = {
        current_balance: user.wallet_balance,
        cash_trips: {
          count: 0,
          total_fares: 0,
          total_commissions_deducted: 0,
          net_cash_received: 0
        },
        online_trips: {
          count: 0,
          total_fares: 0,
          total_commissions_deducted: 0,
          net_credited: 0
        },
        cashouts: {
          count: 0,
          total_amount: 0,
          total_fees: 0,
          net_received: 0
        }
      }

      transactions?.forEach(transaction => {
        if (transaction.created_at >= thirtyDaysAgo.toISOString()) {
          if (transaction.type === 'commission_deduction') {
            ledgerSummary.cash_trips.count++
            ledgerSummary.cash_trips.total_fares += transaction.fare_amount || 0
            ledgerSummary.cash_trips.total_commissions_deducted += Math.abs(transaction.amount)
            ledgerSummary.cash_trips.net_cash_received += transaction.driver_net_earnings || 0
          } else if (transaction.type === 'trip_earnings') {
            ledgerSummary.online_trips.count++
            ledgerSummary.online_trips.total_fares += transaction.fare_amount || 0
            ledgerSummary.online_trips.total_commissions_deducted += (transaction.fare_amount || 0) - transaction.amount
            ledgerSummary.online_trips.net_credited += transaction.amount
          } else if (transaction.type === 'payout' || transaction.type === 'emergency_payout') {
            ledgerSummary.cashouts.count++
            ledgerSummary.cashouts.total_amount += transaction.amount
            ledgerSummary.cashouts.total_fees += transaction.fee_amount || 0
            ledgerSummary.cashouts.net_received += transaction.net_amount
          }
        }
      })

      return new Response(
        JSON.stringify({ 
          success: true,
          current_balance: user.wallet_balance,
          ledger_summary: ledgerSummary,
          recent_transactions: transactions || [],
          commission_history: commissionData || []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Enhanced Cashout with Updated Fee Structure
    if (action === 'request_driver_cashout') {
      if (user.user_type !== 'driver') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Driver access required' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403 
          }
        )
      }

      // Check minimum cashout amount
      if (amount < 500) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Minimum cashout amount is ₱500' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      // Check available balance (keep ₱100 minimum)
      const max_cashout = Math.max(0, user.wallet_balance - 100)
      if (amount > max_cashout) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Maximum cashout amount is ₱${max_cashout.toFixed(2)} (₱100 minimum balance required)` 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      // Calculate fees - ₱20 fee only for minimum ₱500 cashouts
      let fee = 0
      if (amount === 500) {
        fee = 20 // ₱20 fee only for exactly ₱500 cashouts
      }

      const net_amount = amount - fee
      const new_balance = user.wallet_balance - amount
      const transactionId = `DCOUT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Update wallet balance
      const { error: updateError } = await supabaseClient
        .from('users')
        .update({ wallet_balance: new_balance })
        .eq('id', session.userId)

      if (updateError) throw updateError

      // Create cashout transaction
      const { error: transactionError } = await supabaseClient
        .from('wallet_transactions')
        .insert([
          {
            user_id: session.userId,
            transaction_id: transactionId,
            type: 'driver_cashout',
            amount: amount,
            fee_amount: fee,
            net_amount: net_amount,
            description: `Driver cashout to ${method.toUpperCase()}${fee > 0 ? ` (₱${fee} service fee for ₱500 cashout)` : ' (no fees)'}`,
            status: 'completed',
            payment_method: method,
            payment_details: payment_details,
            completed_at: new Date().toISOString()
          }
        ])

      if (transactionError) throw transactionError

      console.log(`SMS: Driver cashout processed for ${user.phone}. Net amount: ₱${net_amount.toFixed(2)}${fee > 0 ? ` (₱${fee} fee for ₱500 cashout)` : ' (no fees)'}. Transaction ID: ${transactionId}`)

      return new Response(
        JSON.stringify({ 
          success: true,
          transaction_id: transactionId,
          gross_amount: amount,
          service_fee: fee,
          net_amount: net_amount,
          new_balance: new_balance,
          message: `Cashout processed successfully${fee > 0 ? ` (₱${fee} service fee for ₱500 cashout)` : ' with no fees'}`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Emergency Cash-Out for Drivers with Updated Fee Structure
    if (action === 'emergency_cashout') {
      if (user.user_type !== 'driver') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Emergency cash-out only available for drivers' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      if (amount < 500) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Minimum emergency cash-out amount is ₱500' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      const maxCashOut = Math.max(0, user.wallet_balance - 200)
      if (amount > maxCashOut) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Maximum emergency cash-out amount is ₱${maxCashOut.toFixed(2)} (₱200 must remain)` 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      // Calculate fees - ₱20 fee only for minimum ₱500 cashouts
      let serviceFee = 0
      if (amount === 500) {
        serviceFee = 20 // ₱20 fee only for exactly ₱500 cashouts
      }

      const netAmount = amount - serviceFee
      const newBalance = user.wallet_balance - amount
      const transactionId = `EMRG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      // Update wallet balance
      const { error: updateError } = await supabaseClient
        .from('users')
        .update({ wallet_balance: newBalance })
        .eq('id', session.userId)

      if (updateError) throw updateError

      // Create transaction record
      const { error: transactionError } = await supabaseClient
        .from('wallet_transactions')
        .insert([
          {
            user_id: session.userId,
            transaction_id: transactionId,
            type: 'emergency_payout',
            amount: amount,
            fee_amount: serviceFee,
            net_amount: netAmount,
            description: `Emergency cash-out to GCash${serviceFee > 0 ? ` (₱${serviceFee} service fee for ₱500 cashout)` : ' (no fees)'}`,
            status: 'completed',
            payment_method: method,
            payment_details: payment_details,
            completed_at: new Date().toISOString()
          }
        ])

      if (transactionError) throw transactionError

      console.log(`SMS: Emergency cash-out processed for ${user.phone}. Net amount: ₱${netAmount.toFixed(2)}${serviceFee > 0 ? ` (₱${serviceFee} fee for ₱500 cashout)` : ' (no fees)'}. Transaction ID: ${transactionId}`)

      return new Response(
        JSON.stringify({ 
          success: true,
          transaction_id: transactionId,
          new_balance: newBalance,
          gross_amount: amount,
          service_fee: serviceFee,
          net_amount: netAmount,
          message: `Emergency cash-out processed successfully${serviceFee > 0 ? ` (₱${serviceFee} service fee for ₱500 cashout)` : ' with no fees'}`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Weekly Automatic Payout Processing (for admin/system)
    if (action === 'process_weekly_payouts') {
      if (user.user_type !== 'admin') {
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

      // Get all drivers with balance > ₱200
      const { data: drivers } = await supabaseClient
        .from('users')
        .select('id, full_name, phone, wallet_balance, gcash_number')
        .eq('user_type', 'driver')
        .gt('wallet_balance', 200)

      const payoutResults = []

      for (const driver of drivers || []) {
        const payoutAmount = driver.wallet_balance - 200 // Keep ₱200 minimum
        
        if (payoutAmount > 0) {
          const transactionId = `WEEKLY_${Date.now()}_${driver.id.slice(-6)}`
          
          // Create payout transaction
          await supabaseClient
            .from('wallet_transactions')
            .insert([
              {
                user_id: driver.id,
                transaction_id: transactionId,
                type: 'weekly_payout',
                amount: payoutAmount,
                fee_amount: 0,
                net_amount: payoutAmount,
                description: `Weekly automatic payout to GCash`,
                status: 'completed',
                payment_method: 'gcash',
                payment_details: { gcash_number: driver.gcash_number },
                completed_at: new Date().toISOString()
              }
            ])

          // Update driver wallet balance
          await supabaseClient
            .from('users')
            .update({ wallet_balance: 200 })
            .eq('id', driver.id)

          payoutResults.push({
            driver_id: driver.id,
            driver_name: driver.full_name,
            phone: driver.phone,
            payout_amount: payoutAmount,
            transaction_id: transactionId
          })

          console.log(`SMS: Weekly payout processed for ${driver.phone}. Amount: ₱${payoutAmount.toFixed(2)}. Transaction ID: ${transactionId}`)
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          processed_payouts: payoutResults.length,
          total_amount: payoutResults.reduce((sum, p) => sum + p.payout_amount, 0),
          payouts: payoutResults
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'get_payout_history') {
      const { data: payoutHistory } = await supabaseClient
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', session.userId)
        .in('type', ['weekly_payout', 'emergency_payout'])
        .order('created_at', { ascending: false })
        .limit(50)

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const monthlyStats = {
        totalWeeklyPayouts: 0,
        totalEmergencyPayouts: 0,
        totalServiceFees: 0,
        totalNetReceived: 0
      }

      payoutHistory?.forEach(payout => {
        if (payout.created_at >= thirtyDaysAgo.toISOString()) {
          if (payout.type === 'weekly_payout') {
            monthlyStats.totalWeeklyPayouts += payout.net_amount
          } else if (payout.type === 'emergency_payout') {
            monthlyStats.totalEmergencyPayouts += payout.amount
            monthlyStats.totalServiceFees += payout.fee_amount || 0
          }
          monthlyStats.totalNetReceived += payout.net_amount
        }
      })

      return new Response(
        JSON.stringify({ 
          success: true,
          payout_history: payoutHistory || [],
          monthly_stats: monthlyStats
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'get_admin_dashboard') {
      if (user.user_type !== 'admin') {
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

      const { data: walletSummary } = await supabaseClient
        .from('users')
        .select('user_type, wallet_balance, full_name, phone')

      const balancesByType = {
        passengers: 0,
        drivers: 0,
        vendors: 0,
        total: 0
      }

      const driverBalances = []

      walletSummary?.forEach(u => {
        const balance = u.wallet_balance || 0
        balancesByType.total += balance
        if (u.user_type === 'passenger') balancesByType.passengers += balance
        else if (u.user_type === 'driver') {
          balancesByType.drivers += balance
          driverBalances.push({
            name: u.full_name,
            phone: u.phone,
            balance: balance,
            available_for_payout: Math.max(0, balance - 200)
          })
        }
        else if (u.user_type === 'vendor') balancesByType.vendors += balance
      })

      const { data: recentTransactions } = await supabaseClient
        .from('wallet_transactions')
        .select('*, users(full_name, user_type)')
        .order('created_at', { ascending: false })
        .limit(20)

      const { data: pendingWithdrawals } = await supabaseClient
        .from('wallet_transactions')
        .select('*, users(full_name, phone, user_type)')
        .eq('type', 'payout')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: monthlyStats } = await supabaseClient
        .from('wallet_transactions')
        .select('type, amount, fee_amount, status')
        .gte('created_at', thirtyDaysAgo.toISOString())

      const stats = {
        totalTopups: 0,
        totalWithdrawals: 0,
        totalRidePayments: 0,
        totalCommissions: 0,
        totalWeeklyPayouts: 0,
        totalEmergencyPayouts: 0,
        totalServiceFeesCollected: 0
      }

      monthlyStats?.forEach(t => {
        if (t.status === 'completed') {
          if (t.type === 'topup') stats.totalTopups += t.amount
          else if (t.type === 'payout') stats.totalWithdrawals += t.amount
          else if (t.type === 'ride_payment') stats.totalRidePayments += t.amount
          else if (t.type === 'commission') stats.totalCommissions += t.amount
          else if (t.type === 'weekly_payout') stats.totalWeeklyPayouts += t.amount
          else if (t.type === 'emergency_payout') {
            stats.totalEmergencyPayouts += t.amount
            stats.totalServiceFeesCollected += (t.fee_amount || 0)
          }
        }
      })

      return new Response(
        JSON.stringify({ 
          success: true,
          dashboard: {
            balancesByType,
            driverBalances,
            recentTransactions: recentTransactions || [],
            pendingWithdrawals: pendingWithdrawals || [],
            monthlyStats: stats
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'approve_withdrawal') {
      if (user.user_type !== 'admin') {
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

      const { data: transaction, error: txnError } = await supabaseClient
        .from('wallet_transactions')
        .select('*, users(full_name, phone)')
        .eq('transaction_id', transaction_id)
        .eq('type', 'payout')
        .single()

      if (txnError || !transaction) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Transaction not found' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404 
          }
        )
      }

      const newStatus = admin_approval ? 'completed' : 'rejected'
      
      const { error: updateError } = await supabaseClient
        .from('wallet_transactions')
        .update({ 
          status: newStatus,
          admin_approved_by: session.userId,
          admin_approved_at: new Date().toISOString(),
          completed_at: admin_approval ? new Date().toISOString() : null
        })
        .eq('id', transaction.id)

      if (updateError) throw updateError

      if (!admin_approval) {
        const { data: userToRefund } = await supabaseClient
          .from('users')
          .select('wallet_balance')
          .eq('id', transaction.user_id)
          .single()

        await supabaseClient
          .from('users')
          .update({ 
            wallet_balance: (userToRefund.wallet_balance || 0) + transaction.amount
          })
          .eq('id', transaction.user_id)
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          message: `Withdrawal ${admin_approval ? 'approved' : 'rejected'} successfully`,
          transaction_status: newStatus
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'get_transactions') {
      const { data: transactions, error } = await supabaseClient
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', session.userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true,
          transactions: transactions || []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'initiate_topup') {
      const minAmount = user.user_type === 'passenger' ? 50 : 500
      if (amount < minAmount) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Minimum top-up amount is ₱${minAmount}` 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const { error: transactionError } = await supabaseClient
        .from('wallet_transactions')
        .insert([
          {
            user_id: session.userId,
            transaction_id: transactionId,
            type: 'topup',
            amount: amount,
            description: `Wallet top-up via ${method.toUpperCase()}`,
            status: 'pending',
            payment_method: method,
            payment_details: payment_details
          }
        ])

      if (transactionError) throw transactionError

      console.log(`SMS: Top-up initiated for ${user.phone}. Amount: ₱${amount}. Transaction ID: ${transactionId}`)

      return new Response(
        JSON.stringify({ 
          success: true,
          transaction_id: transactionId,
          message: 'Top-up initiated successfully'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'confirm_payment') {
      const { data: transaction, error: txnError } = await supabaseClient
        .from('wallet_transactions')
        .select('*')
        .eq('transaction_id', transaction_id)
        .eq('user_id', session.userId)
        .single()

      if (txnError || !transaction) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Transaction not found' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404 
          }
        )
      }

      if (transaction.status !== 'pending') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Transaction already processed' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      const newBalance = user.wallet_balance + transaction.amount

      const { error: updateError } = await supabaseClient
        .from('users')
        .update({ wallet_balance: newBalance })
        .eq('id', session.userId)

      if (updateError) throw updateError

      const { error: completeError } = await supabaseClient
        .from('wallet_transactions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', transaction.id)

      if (completeError) throw completeError

      console.log(`SMS: Payment confirmed for ${user.phone}. New balance: ₱${newBalance.toFixed(2)}. Transaction ID: ${transaction_id}`)

      return new Response(
        JSON.stringify({ 
          success: true,
          new_balance: newBalance,
          message: 'Payment confirmed successfully'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'request_cashout') {
      if (user.user_type === 'passenger') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Cash out not available for passengers. Wallet is only convertible to GCash with admin authorization.' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      const maxCashOut = Math.max(0, user.wallet_balance - 100)
      if (amount > maxCashOut) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Maximum cash out amount is ₱${maxCashOut.toFixed(2)} (₱100 must remain for bookings)` 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      if (amount < 100) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Minimum cash out amount is ₱100' 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }

      const transactionId = `COUT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      let fee = 0
      let estimatedTime = 'Pending admin approval'
      
      if (payout_cycle === 'instant') {
        fee = amount * 0.02
        estimatedTime = 'Within 5 minutes after approval'
      } else if (payout_cycle === 'daily') {
        fee = amount * 0.01
        estimatedTime = 'Next business day after approval'
      } else if (payout_cycle === 'weekly') {
        fee = 0
        estimatedTime = 'Next Friday after approval'
      }

      const netAmount = amount - fee
      const newBalance = user.wallet_balance - amount

      const { error: updateError } = await supabaseClient
        .from('users')
        .update({ wallet_balance: newBalance })
        .eq('id', session.userId)

      if (updateError) throw updateError

      const { error: transactionError } = await supabaseClient
        .from('wallet_transactions')
        .insert([
          {
            user_id: session.userId,
            transaction_id: transactionId,
            type: 'payout',
            amount: amount,
            fee_amount: fee,
            net_amount: netAmount,
            description: `Cash out via ${method.toUpperCase()} - ${payout_cycle} payout (Pending admin approval)`,
            status: 'pending',
            payment_method: method,
            payment_details: payment_details,
            payout_cycle: payout_cycle,
            estimated_completion: estimatedTime
          }
        ])

      if (transactionError) throw transactionError

      console.log(`SMS: Cash out requested for ${user.phone}. Amount: ₱${netAmount.toFixed(2)} (fee: ₱${fee.toFixed(2)}). Transaction ID: ${transactionId}. Status: Pending admin approval`)

      return new Response(
        JSON.stringify({ 
          success: true,
          transaction_id: transactionId,
          new_balance: newBalance,
          fee_amount: fee,
          net_amount: netAmount,
          estimated_time: estimatedTime,
          message: 'Cash out request submitted successfully. Awaiting admin approval.'
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