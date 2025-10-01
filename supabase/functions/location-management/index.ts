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
    if (!authHeader) throw new Error('No authorization header')

    const token = authHeader.replace('Bearer ', '')
    const session = JSON.parse(atob(token))
    
    if (session.exp < Date.now()) throw new Error('Session expired')

    const { action, locationData } = await req.json()

    if (action === 'save_location') {
      const { data: savedLocation, error } = await supabaseClient
        .from('saved_locations')
        .insert([{
          user_id: session.userId,
          name: locationData.name,
          address: locationData.address,
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          location_type: locationData.location_type || 'custom',
          is_shared: locationData.is_shared || false,
          shared_with_family: locationData.shared_with_family || false,
          privacy_level: locationData.location_type === 'home' ? 'private' : 'shareable'
        }])
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true,
          location: savedLocation,
          message: `Location saved as ${locationData.name}${locationData.shared_with_family ? ' and shared with family' : ''}`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'get_saved_locations') {
      const { data: savedLocations, error } = await supabaseClient
        .from('saved_locations')
        .select('*')
        .eq('user_id', session.userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true,
          locations: savedLocations
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'get_family_shared_locations') {
      // In a real implementation, you'd have family relationships
      // For now, we'll return locations marked as shared
      const { data: sharedLocations, error } = await supabaseClient
        .from('saved_locations')
        .select(`
          *,
          users!inner(full_name, phone)
        `)
        .eq('shared_with_family', true)
        .neq('privacy_level', 'private')
        .order('created_at', { ascending: false })

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true,
          shared_locations: sharedLocations
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    if (action === 'update_sharing') {
      const { locationId, shared_with_family } = locationData

      const { data: updatedLocation, error } = await supabaseClient
        .from('saved_locations')
        .update({
          shared_with_family,
          privacy_level: shared_with_family ? 'shareable' : 'private'
        })
        .eq('id', locationId)
        .eq('user_id', session.userId)
        .select()
        .single()

      if (error) throw error

      return new Response(
        JSON.stringify({ 
          success: true,
          location: updatedLocation,
          message: shared_with_family ? 'Location shared with family' : 'Location made private'
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