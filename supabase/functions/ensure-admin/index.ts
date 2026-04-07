import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Read OwnerSystem config from secrets
    const ADMIN_EMAIL = Deno.env.get('OWNER_SYSTEM_EMAIL')
    const ADMIN_STUDENT_ID = Deno.env.get('OWNER_SYSTEM_STUDENT_ID') || '00000000'
    const ADMIN_FULL_NAME = Deno.env.get('OWNER_SYSTEM_FULL_NAME') || 'System Owner'
    const ADMIN_DEFAULT_PASSWORD = Deno.env.get('OWNER_SYSTEM_PASSWORD') || 'changeme123'
    const ADMIN_INSTITUTION = Deno.env.get('OWNER_SYSTEM_INSTITUTION') || 'T-Nexus System'

    if (!ADMIN_EMAIL) {
      return new Response(
        JSON.stringify({ success: false, error: 'OWNER_SYSTEM_EMAIL secret is not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Also store admin contact in system_settings for frontend usage
    await supabaseAdmin.from('system_settings').upsert({
      key: 'admin_contact',
      value: { email: ADMIN_EMAIL },
      updated_by: null,
    }, { onConflict: 'key' })

    // Check if admin already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers()
    const adminExists = existingUsers?.users?.find(u => u.email === ADMIN_EMAIL)

    if (adminExists) {
      const adminId = adminExists.id

      await supabaseAdmin.from('profiles').upsert({
        id: adminId,
        email: ADMIN_EMAIL,
        student_id: ADMIN_STUDENT_ID,
        full_name: ADMIN_FULL_NAME,
        institution: ADMIN_INSTITUTION,
        is_approved: true,
        must_change_password: false
      }, { onConflict: 'id' })

      await supabaseAdmin.from('user_roles').upsert({
        user_id: adminId,
        role: 'owner_system'
      }, { onConflict: 'user_id,role' })

      return new Response(
        JSON.stringify({ success: true, message: 'Admin account already exists and verified', admin_id: adminId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create new admin user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { student_id: ADMIN_STUDENT_ID, full_name: ADMIN_FULL_NAME, institution: ADMIN_INSTITUTION }
    })

    if (createError) throw createError

    const adminId = newUser.user.id

    await supabaseAdmin.from('profiles').upsert({
      id: adminId,
      email: ADMIN_EMAIL,
      student_id: ADMIN_STUDENT_ID,
      full_name: ADMIN_FULL_NAME,
      institution: ADMIN_INSTITUTION,
      is_approved: true,
      must_change_password: false
    }, { onConflict: 'id' })

    await supabaseAdmin.from('user_roles').upsert({
      user_id: adminId,
      role: 'owner_system'
    }, { onConflict: 'user_id,role' })

    return new Response(
      JSON.stringify({ success: true, message: 'Admin account created successfully', admin_id: adminId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
