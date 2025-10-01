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

    const { phone, otp, action } = await req.json()

    if (action === 'send_otp') {
      // Generate 6-digit OTP
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString()
      
      // Store OTP temporarily (you can use a separate table or cache)
      console.log(`OTP for ${phone}: ${generatedOtp}`)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'OTP sent successfully',
          otp: generatedOtp // Remove this in production
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'verify_otp') {
      // In production, verify against stored OTP
      // For demo purposes, accept any 6-digit OTP
      if (otp && otp.length === 6) {
        // Check if user exists
        let { data: user, error: userError } = await supabaseClient
          .from('users')
          .select('*')
          .eq('phone', phone)
          .single()

        if (userError && userError.code === 'PGRST116') {
          // User doesn't exist, create new user with ₱500 wallet bonus
          const { data: newUser, error: createError } = await supabaseClient
            .from('users')
            .insert([
              { 
                phone: phone,
                wallet_balance: 500.00,
                is_first_time: true
              }
            ])
            .select()
            .single()

          if (createError) {
            throw createError
          }
          user = newUser
        }

        // Create session token (simplified)
        const sessionToken = btoa(JSON.stringify({ 
          userId: user.id, 
          phone: user.phone,
          exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
        }))

        return new Response(
          JSON.stringify({ 
            success: true,
            session: { access_token: sessionToken },
            user: {
              id: user.id,
              phone: user.phone,
              wallet_balance: user.wallet_balance,
              is_first_time: user.is_first_time
            }
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200 
          }
        )
      }

      return new Response(
        JSON.stringify({ success: false, message: 'Invalid OTP' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
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