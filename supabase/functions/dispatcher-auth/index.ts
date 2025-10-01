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

    const { action, username, password } = await req.json()

    console.log('Dispatcher auth request:', { action, username })

    if (action === 'dispatcher_login') {
      // Check dispatcher credentials
      const { data: dispatcher, error } = await supabaseClient
        .from('dispatchers')
        .select('*')
        .eq('username', username)
        .eq('is_active', true)
        .single()

      console.log('Database query result:', { dispatcher, error })

      if (error || !dispatcher) {
        console.log('No dispatcher found or error:', error)
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid username or account inactive' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      // Simple password check
      if (dispatcher.password !== password) {
        console.log('Password mismatch')
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid password' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }

      // Update last login
      await supabaseClient
        .from('dispatchers')
        .update({ last_login: new Date().toISOString() })
        .eq('id', dispatcher.id)

      console.log('Login successful for:', dispatcher.username)

      return new Response(
        JSON.stringify({ 
          success: true, 
          dispatcher: {
            id: dispatcher.id,
            username: dispatcher.username,
            full_name: dispatcher.full_name,
            town_assigned: dispatcher.town_assigned
          },
          message: 'Login successful'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'create_test_dispatchers') {
      // Create test dispatcher accounts
      const testDispatchers = [
        {
          username: 'admin_Lagawe',
          password: 'disp123',
          full_name: 'Admin Lagawe',
          town_assigned: 'Lagawe',
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          username: 'admin_Kiangan',
          password: 'disp456',
          full_name: 'Admin Kiangan',  
          town_assigned: 'Kiangan',
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          username: 'admin_Banaue',
          password: 'disp789',
          full_name: 'Admin Banaue',
          town_assigned: 'Banaue',
          is_active: true,
          created_at: new Date().toISOString()
        },
        {
          username: 'admin_Lamut',
          password: 'disp123',
          full_name: 'Admin Lamut',
          town_assigned: 'Lamut',
          is_active: true,
          created_at: new Date().toISOString()
        }
      ]

      const { data: newDispatchers, error } = await supabaseClient
        .from('dispatchers')
        .upsert(testDispatchers, { onConflict: 'username' })
        .select()

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true, 
          dispatchers: newDispatchers,
          message: 'Test dispatchers created successfully'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Invalid action' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (error) {
    console.error('Dispatcher auth error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})