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

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    if (req.method === 'GET' && action === 'search') {
      const query = url.searchParams.get('query') || ''
      const lat = parseFloat(url.searchParams.get('lat') || '0')
      const lng = parseFloat(url.searchParams.get('lng') || '0')
      const radius = parseFloat(url.searchParams.get('radius') || '5') // 5km default

      let queryBuilder = supabaseClient
        .from('landmarks')
        .select('*')
        .eq('status', 'approved') // Only show approved landmarks
        .order('usage_count', { ascending: false })
        .limit(20)

      if (query) {
        queryBuilder = queryBuilder.or(`name.ilike.%${query}%,town.ilike.%${query}%,address.ilike.%${query}%`)
      }

      // If location provided, filter by radius (approximate)
      if (lat && lng) {
        const latRange = radius / 111.32 // roughly 1 degree = 111.32 km
        const lngRange = radius / (111.32 * Math.cos(lat * Math.PI / 180))
        
        queryBuilder = queryBuilder
          .gte('latitude', lat - latRange)
          .lte('latitude', lat + latRange)
          .gte('longitude', lng - lngRange)
          .lte('longitude', lng + lngRange)
      }

      const { data: landmarks, error } = await queryBuilder

      if (error) throw error

      return new Response(
        JSON.stringify({ success: true, landmarks }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        throw new Error('No authorization header')
      }

      const token = authHeader.replace('Bearer ', '')
      const session = JSON.parse(atob(token))
      
      if (session.exp < Date.now()) {
        throw new Error('Session expired')
      }

      const requestData = await req.json()
      const { name, description, latitude, longitude, address, town, action, landmarkId } = requestData

      // Check if user is admin/developer - multiple checks for your developer account
      const isAdminUser = session.userId === 'developer' || 
                         session.username === 'admin' || 
                         session.phone === '09123456789' || // Developer phone
                         session.userId === 'admin' ||
                         (session.email && session.email.includes('admin')) ||
                         session.fullName === 'Developer' ||
                         session.isAdmin === true

      if (action === 'tag') {
        // Check if landmark already exists nearby (within 100m) with similar name
        const { data: existing } = await supabaseClient
          .from('landmarks')
          .select('*')
          .gte('latitude', latitude - 0.001)
          .lte('latitude', latitude + 0.001)
          .gte('longitude', longitude - 0.001)
          .lte('longitude', longitude + 0.001)
          .ilike('name', `%${name.slice(0, 10)}%`)
          .single()

        if (existing) {
          // Update usage count and auto-approve if needed
          const updates: any = { 
            usage_count: existing.usage_count + 1,
            last_used: new Date().toISOString()
          }
          
          // Auto-approve if pending or if admin user
          if (existing.status === 'pending' || isAdminUser) {
            updates.status = 'approved'
            updates.approved_by = session.userId
            updates.approved_at = new Date().toISOString()
          }

          const { data: updated, error } = await supabaseClient
            .from('landmarks')
            .update(updates)
            .eq('id', existing.id)
            .select()
            .single()

          if (error) throw error

          return new Response(
            JSON.stringify({ 
              success: true, 
              landmark: updated,
              message: isAdminUser 
                ? 'Landmark updated with admin privileges!'
                : 'Landmark updated and is now available!'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Create new landmark - admin gets automatic approval, others need approval
        const landmarkStatus = isAdminUser ? 'approved' : 'pending'
        const approvedBy = isAdminUser ? session.userId : null
        const approvedAt = isAdminUser ? new Date().toISOString() : null

        const { data: landmark, error } = await supabaseClient
          .from('landmarks')
          .insert([{
            name: name.trim(),
            description: description?.trim() || null,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            address: address?.trim() || null,
            town: town?.trim() || null,
            tagged_by: session.userId,
            status: landmarkStatus,
            approved_by: approvedBy,
            approved_at: approvedAt,
            usage_count: 1,
            created_at: new Date().toISOString(),
            last_used: new Date().toISOString()
          }])
          .select()
          .single()

        if (error) throw error

        // Log the landmark creation
        await supabaseClient
          .from('landmark_reviews')
          .insert([{
            landmark_id: landmark.id,
            action: isAdminUser ? 'created_admin_approved' : 'created_pending',
            created_by: session.userId,
            notes: isAdminUser 
              ? `Admin landmark "${name}" created and auto-approved`
              : `New landmark "${name}" created, pending dispatcher approval`
          }])

        return new Response(
          JSON.stringify({ 
            success: true, 
            landmark,
            message: isAdminUser
              ? 'Landmark added with admin privileges - immediately available!'
              : 'Landmark submitted for dispatcher approval!'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (action === 'select') {
        // Increment usage count when landmark is selected
        const { data: landmark, error: selectError } = await supabaseClient
          .from('landmarks')
          .select('*')
          .eq('id', landmarkId)
          .single()

        if (selectError) throw selectError

        // Update usage count and last used timestamp
        await supabaseClient
          .from('landmarks')
          .update({ 
            usage_count: landmark.usage_count + 1,
            last_used: new Date().toISOString()
          })
          .eq('id', landmarkId)

        return new Response(
          JSON.stringify({ 
            success: true, 
            landmark,
            message: 'Landmark selected'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (action === 'get_pending_landmarks') {
        // Only dispatchers and admins can view pending landmarks
        const isDispatcher = session.username && session.username.startsWith('admin_')
        
        if (!isAdminUser && !isDispatcher) {
          throw new Error('Unauthorized to view pending landmarks')
        }

        const { data: landmarks, error } = await supabaseClient
          .from('landmarks')
          .select(`
            *,
            tagged_user:users!landmarks_tagged_by_fkey(full_name, phone)
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: true })

        if (error) throw error

        return new Response(
          JSON.stringify({ 
            success: true, 
            landmarks
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (action === 'approve_landmark') {
        const { edits } = requestData
        
        // Only dispatchers and admins can approve landmarks
        const isDispatcher = session.username && session.username.startsWith('admin_')
        
        if (!isAdminUser && !isDispatcher) {
          throw new Error('Unauthorized to approve landmarks')
        }

        const updates: any = {
          status: 'approved',
          approved_by: session.userId,
          approved_at: new Date().toISOString()
        }

        // Apply edits if provided
        if (edits) {
          if (edits.name?.trim()) updates.name = edits.name.trim()
          if (edits.description?.trim()) updates.description = edits.description.trim()
          if (edits.address?.trim()) updates.address = edits.address.trim()
          if (edits.town?.trim()) updates.town = edits.town.trim()
        }

        const { data: landmark, error } = await supabaseClient
          .from('landmarks')
          .update(updates)
          .eq('id', landmarkId)
          .select()
          .single()

        if (error) throw error

        // Log the approval
        await supabaseClient
          .from('landmark_reviews')
          .insert([{
            landmark_id: landmarkId,
            action: 'approved',
            created_by: session.userId,
            notes: `Landmark approved${edits ? ' with edits' : ''}`
          }])

        return new Response(
          JSON.stringify({ 
            success: true, 
            landmark,
            message: 'Landmark approved successfully'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (action === 'reject_landmark') {
        const { reason } = requestData
        
        // Only dispatchers and admins can reject landmarks
        const isDispatcher = session.username && session.username.startsWith('admin_')
        
        if (!isAdminUser && !isDispatcher) {
          throw new Error('Unauthorized to reject landmarks')
        }

        const { data: landmark, error } = await supabaseClient
          .from('landmarks')
          .update({
            status: 'rejected',
            rejected_by: session.userId,
            rejected_at: new Date().toISOString(),
            rejection_reason: reason
          })
          .eq('id', landmarkId)
          .select()
          .single()

        if (error) throw error

        // Log the rejection
        await supabaseClient
          .from('landmark_reviews')
          .insert([{
            landmark_id: landmarkId,
            action: 'rejected',
            created_by: session.userId,
            notes: `Landmark rejected: ${reason}`
          }])

        return new Response(
          JSON.stringify({ 
            success: true, 
            landmark,
            message: 'Landmark rejected'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (action === 'get_all_landmarks') {
        // Only admins can view all landmarks
        if (!isAdminUser) {
          throw new Error('Unauthorized to view all landmarks')
        }

        const { data: landmarks, error } = await supabaseClient
          .from('landmarks')
          .select(`
            *,
            tagged_user:users!landmarks_tagged_by_fkey(full_name, phone)
          `)
          .order('created_at', { ascending: false })

        if (error) throw error

        return new Response(
          JSON.stringify({ 
            success: true, 
            landmarks
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (action === 'update_landmark') {
        const { updates } = requestData
        
        // Only admins can update landmarks directly
        if (!isAdminUser) {
          throw new Error('Unauthorized to update landmarks')
        }
        
        const { data: landmark, error } = await supabaseClient
          .from('landmarks')
          .update(updates)
          .eq('id', landmarkId)
          .select()
          .single()

        if (error) throw error

        return new Response(
          JSON.stringify({ 
            success: true, 
            landmark,
            message: 'Landmark updated successfully'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (action === 'delete_landmark') {
        // Only admins can delete landmarks
        if (!isAdminUser) {
          throw new Error('Unauthorized to delete landmarks')
        }

        const { error } = await supabaseClient
          .from('landmarks')
          .delete()
          .eq('id', landmarkId)

        if (error) throw error

        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Landmark deleted successfully'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (action === 'get_approval_stats') {
        // Only dispatchers and admins can view stats
        const isDispatcher = session.username && session.username.startsWith('admin_')
        
        if (!isAdminUser && !isDispatcher) {
          throw new Error('Unauthorized to view approval stats')
        }

        const today = new Date().toISOString().split('T')[0]

        const { data: stats, error } = await supabaseClient
          .from('landmarks')
          .select('status, approved_at, rejected_at')

        if (error) throw error

        const approvalStats = {
          pendingLandmarks: stats.filter(s => s.status === 'pending').length,
          pendingFares: 0, // Placeholder for fare approvals
          todayApproved: stats.filter(s => 
            s.status === 'approved' && 
            s.approved_at && 
            s.approved_at.startsWith(today)
          ).length,
          todayRejected: stats.filter(s => 
            s.status === 'rejected' && 
            s.rejected_at && 
            s.rejected_at.startsWith(today)
          ).length
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            stats: approvalStats
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Invalid request' }),
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