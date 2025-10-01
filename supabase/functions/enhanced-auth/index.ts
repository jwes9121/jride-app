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

    const { action, phone, otp, email, password } = await req.json()

    if (action === 'send_otp') {
      // Phone signups are ENABLED for J-Ride
      const phoneSignupsEnabled = true;
      
      if (!phoneSignupsEnabled) {
        return new Response(
          JSON.stringify({ error: 'Phone signups are disabled' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Generate 6-digit OTP
      const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString()
      
      // For development - log OTP to console
      console.log(`OTP for ${phone}: ${generatedOTP}`)
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'OTP sent successfully',
          dev_otp: generatedOTP
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'verify_otp') {
      // For development - accept any 6-digit code
      if (otp && otp.length === 6) {
        return new Response(
          JSON.stringify({ success: true, message: 'OTP verified successfully' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        return new Response(
          JSON.stringify({ error: 'Invalid OTP' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
    }

    if (action === 'create_phone_user') {
      // Create user with phone number
      const tempPassword = Math.random().toString(36).slice(-12)
      
      const { data, error } = await supabaseClient.auth.admin.createUser({
        phone,
        password: tempPassword,
        user_metadata: {
          signup_type: 'phone_only',
          verification_status: 'unverified'
        }
      })

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true, 
          user: data.user,
          temp_password: tempPassword 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Default sign in with email/password
    if (email && password) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, user: data.user, session: data.session }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action or missing parameters' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (error) {
    console.error('Auth error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})