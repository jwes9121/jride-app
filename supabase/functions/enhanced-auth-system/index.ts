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

    const { action, ...data } = await req.json()

    switch (action) {
      case 'get_user_profile':
        return await getUserProfile(supabaseClient, data)
      case 'update_user_profile':
        return await updateUserProfile(supabaseClient, data)
      case 'verify_user':
        return await verifyUser(supabaseClient, data)
      case 'upload_verification_document':
        return await uploadVerificationDocument(supabaseClient, data)
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function getUserProfile(supabaseClient: any, data: any) {
  const { user_id } = data

  // Get user from auth
  const { data: authUser, error: authError } = await supabaseClient.auth.admin.getUserById(user_id)
  if (authError) throw authError

  // Get user profile from database
  const { data: profile, error: profileError } = await supabaseClient
    .from('users')
    .select('*')
    .eq('id', user_id)
    .single()

  if (profileError && profileError.code !== 'PGRST116') {
    throw profileError
  }

  // Combine auth and profile data
  const userProfile = {
    id: authUser.user.id,
    email: authUser.user.email,
    phone: authUser.user.phone,
    user_metadata: authUser.user.user_metadata,
    profile: profile || null,
    status: profile?.user_status || 'unverified_passenger',
    created_at: authUser.user.created_at,
    last_sign_in_at: authUser.user.last_sign_in_at
  }

  return new Response(
    JSON.stringify({ success: true, user: userProfile }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function updateUserProfile(supabaseClient: any, data: any) {
  const { user_id, name, email, phone, address, avatar_url } = data

  // Update auth user metadata
  const { error: authError } = await supabaseClient.auth.admin.updateUserById(
    user_id,
    {
      user_metadata: {
        name,
        address,
        avatar_url
      }
    }
  )

  if (authError) throw authError

  // Upsert user profile in database
  const { data: profile, error: profileError } = await supabaseClient
    .from('users')
    .upsert({
      id: user_id,
      name,
      email,
      phone,
      address,
      avatar_url,
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (profileError) throw profileError

  return new Response(
    JSON.stringify({ success: true, profile }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function verifyUser(supabaseClient: any, data: any) {
  const { user_id, status, admin_id, notes } = data

  // Update user status
  const { data: updatedUser, error: updateError } = await supabaseClient
    .from('users')
    .update({
      user_status: status,
      verified_at: status === 'verified_passenger' ? new Date().toISOString() : null,
      verification_notes: notes,
      updated_at: new Date().toISOString()
    })
    .eq('id', user_id)
    .select()
    .single()

  if (updateError) throw updateError

  // Log admin action
  if (admin_id) {
    await supabaseClient
      .from('admin_actions')
      .insert([{
        admin_id,
        action_type: 'user_verification',
        target_id: user_id,
        details: {
          status,
          notes
        }
      }])
  }

  return new Response(
    JSON.stringify({ success: true, user: updatedUser }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function uploadVerificationDocument(supabaseClient: any, data: any) {
  const { user_id, document_type, document_url } = data

  // Save document info to database
  const { data: document, error: docError } = await supabaseClient
    .from('verification_documents')
    .insert([{
      user_id,
      document_type,
      document_url,
      status: 'pending',
      uploaded_at: new Date().toISOString()
    }])
    .select()
    .single()

  if (docError) throw docError

  // Update user status to pending verification
  await supabaseClient
    .from('users')
    .update({
      user_status: 'pending_verification',
      updated_at: new Date().toISOString()
    })
    .eq('id', user_id)

  return new Response(
    JSON.stringify({ success: true, document }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}