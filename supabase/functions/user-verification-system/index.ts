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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { action } = await req.json()

    switch (action) {
      case 'submit_verification': {
        const { full_name, email, phone, address, id_type, id_document_url } = await req.json()

        // Validate required fields
        if (!full_name || !email || !phone || !address || !id_type || !id_document_url) {
          return new Response(JSON.stringify({ 
            error: 'All fields are required',
            missing_fields: {
              full_name: !full_name,
              email: !email,
              phone: !phone,
              address: !address,
              id_type: !id_type,
              id_document_url: !id_document_url
            }
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Valid ID types
        const validIdTypes = [
          'drivers_license', 'national_id', 'passport', 'voters_id', 
          'postal_id', 'philhealth_id', 'student_id'
        ]

        if (!validIdTypes.includes(id_type)) {
          return new Response(JSON.stringify({ 
            error: 'Invalid ID type',
            valid_types: validIdTypes
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Check if user already has a pending verification request
        const { data: existingRequest } = await supabase
          .from('user_verification_requests')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'pending')
          .single()

        if (existingRequest) {
          return new Response(JSON.stringify({ 
            error: 'You already have a pending verification request',
            request_id: existingRequest.id,
            submitted_at: existingRequest.submitted_at
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Create verification request
        const { data: verificationRequest, error: requestError } = await supabase
          .from('user_verification_requests')
          .insert({
            user_id: user.id,
            full_name,
            email,
            phone,
            address,
            id_type,
            id_document_url,
            status: 'pending'
          })
          .select()
          .single()

        if (requestError) {
          return new Response(JSON.stringify({ error: requestError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Update user status to pending
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({ 
            verification_status: 'pending',
            full_name,
            email,
            phone,
            address,
            id_type,
            id_document_url,
            submitted_at: new Date().toISOString()
          })
          .eq('id', user.id)

        if (userUpdateError) {
          return new Response(JSON.stringify({ error: userUpdateError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return new Response(JSON.stringify({ 
          success: true,
          message: 'Verification request submitted successfully',
          request_id: verificationRequest.id,
          status: 'pending'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'get_verification_status': {
        const { data: userData } = await supabase
          .from('users')
          .select('verification_status, id_type, submitted_at, verified_at')
          .eq('id', user.id)
          .single()

        const { data: verificationRequest } = await supabase
          .from('user_verification_requests')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        return new Response(JSON.stringify({ 
          user_status: userData?.verification_status || 'unverified',
          id_type: userData?.id_type,
          submitted_at: userData?.submitted_at,
          verified_at: userData?.verified_at,
          latest_request: verificationRequest
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'admin_approve_verification': {
        // Check if user is admin
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (!adminUser || !['admin', 'dispatcher'].includes(adminUser.role)) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const { request_id, decision, rejection_reason } = await req.json()

        if (!request_id || !decision || !['approved', 'rejected'].includes(decision)) {
          return new Response(JSON.stringify({ error: 'Invalid request parameters' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        if (decision === 'rejected' && !rejection_reason) {
          return new Response(JSON.stringify({ error: 'Rejection reason is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Get verification request
        const { data: verificationRequest } = await supabase
          .from('user_verification_requests')
          .select('*')
          .eq('id', request_id)
          .single()

        if (!verificationRequest) {
          return new Response(JSON.stringify({ error: 'Verification request not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Update verification request
        const { error: requestUpdateError } = await supabase
          .from('user_verification_requests')
          .update({
            status: decision,
            rejection_reason: decision === 'rejected' ? rejection_reason : null,
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id
          })
          .eq('id', request_id)

        if (requestUpdateError) {
          return new Response(JSON.stringify({ error: requestUpdateError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        // Update user verification status
        const newUserStatus = decision === 'approved' ? 'verified' : 'unverified'
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({ 
            verification_status: newUserStatus,
            verified_at: decision === 'approved' ? new Date().toISOString() : null
          })
          .eq('id', verificationRequest.user_id)

        if (userUpdateError) {
          return new Response(JSON.stringify({ error: userUpdateError.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return new Response(JSON.stringify({ 
          success: true,
          message: `Verification request ${decision}`,
          user_id: verificationRequest.user_id,
          new_status: newUserStatus
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'get_pending_verifications': {
        // Check if user is admin
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (!adminUser || !['admin', 'dispatcher'].includes(adminUser.role)) {
          return new Response(JSON.stringify({ error: 'Unauthorized - Admin access required' }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        const { data: pendingRequests, error } = await supabase
          .from('user_verification_requests')
          .select(`
            *,
            users!inner(
              phone,
              created_at
            )
          `)
          .eq('status', 'pending')
          .order('submitted_at', { ascending: true })

        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }

        return new Response(JSON.stringify({ 
          pending_requests: pendingRequests || []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      case 'check_booking_restrictions': {
        const { booking_time } = await req.json()

        const { data: userData } = await supabase
          .from('users')
          .select('verification_status')
          .eq('id', user.id)
          .single()

        const userStatus = userData?.verification_status || 'unverified'
        const bookingHour = new Date(booking_time).getHours()
        const isNightTime = bookingHour >= 19 || bookingHour < 5 // 7PM - 5AM

        let restrictions = {
          can_book: true,
          warnings: [],
          restrictions_applied: []
        }

        if (userStatus === 'unverified') {
          restrictions.restrictions_applied.push('No promo codes or rewards')
          restrictions.restrictions_applied.push('No referral bonuses')
          restrictions.restrictions_applied.push('No loyalty points')
          restrictions.restrictions_applied.push('No student discounts')

          if (isNightTime) {
            restrictions.warnings.push('Drivers may cancel unverified bookings during night time (7PM-5AM)')
            restrictions.warnings.push('Verify your account for guaranteed rides')
          }
        }

        return new Response(JSON.stringify({ 
          user_status: userStatus,
          is_night_time: isNightTime,
          restrictions
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      default: {
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})