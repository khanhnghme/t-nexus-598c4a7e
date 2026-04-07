import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_PASSWORD = "123456";

interface RequestBody {
  action: string;
  email?: string;
  password?: string;
  student_id?: string;
  full_name?: string;
  institution?: string;
  role?: string;
  new_role?: string;
  user_id?: string;
  requester_id?: string;
  profiles?: any[];
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body: RequestBody = await req.json();
    console.log("Action:", body.action);

    // ═══════════════════════════════════════════════
    // SETUP SYSTEM ACCOUNTS (using OWNER_SYSTEM_* secrets)
    // ═══════════════════════════════════════════════
    if (body.action === "setup_system_accounts") {
      const adminEmail = Deno.env.get("OWNER_SYSTEM_EMAIL");
      const adminPassword = Deno.env.get("OWNER_SYSTEM_PASSWORD") || "changeme123";
      const adminStudentId = Deno.env.get("OWNER_SYSTEM_STUDENT_ID") || "00000000";
      const adminFullName = Deno.env.get("OWNER_SYSTEM_FULL_NAME") || "System Owner";
      const adminInstitution = Deno.env.get("OWNER_SYSTEM_INSTITUTION") || "T-Nexus System";

      if (!adminEmail) {
        return new Response(JSON.stringify({ error: "OWNER_SYSTEM_EMAIL secret is not configured" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
      const existingAdmin = userList?.users?.find(u => u.email === adminEmail);

      if (existingAdmin) {
        await supabaseAdmin.auth.admin.updateUserById(existingAdmin.id, {
          password: adminPassword,
          email_confirm: true,
        });

        await supabaseAdmin.from("profiles").upsert({
          id: existingAdmin.id,
          email: adminEmail,
          student_id: adminStudentId,
          full_name: adminFullName,
          institution: adminInstitution,
          is_approved: true,
          must_change_password: false,
        }, { onConflict: "id" });

        await supabaseAdmin.from("user_roles").upsert({
          user_id: existingAdmin.id,
          role: "system_owner",
        }, { onConflict: "user_id,role" });

        await supabaseAdmin.from("demo_passwords").upsert({
          user_id: existingAdmin.id,
          plain_password: adminPassword,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        console.log("System owner account updated");
      } else {
        const { data: newAdmin, error: adminError } = await supabaseAdmin.auth.admin.createUser({
          email: adminEmail,
          password: adminPassword,
          email_confirm: true,
          user_metadata: { student_id: adminStudentId, full_name: adminFullName, institution: adminInstitution }
        });

        if (adminError) {
          console.error("System owner creation error:", adminError);
        } else if (newAdmin.user) {
          await supabaseAdmin.from("profiles").upsert({
            id: newAdmin.user.id,
            email: adminEmail,
            student_id: adminStudentId,
            full_name: adminFullName,
            institution: adminInstitution,
            is_approved: true,
            must_change_password: false,
          }, { onConflict: "id" });

          await supabaseAdmin.from("user_roles").insert({
            user_id: newAdmin.user.id,
            role: "system_owner",
          });

          await supabaseAdmin.from("demo_passwords").upsert({
            user_id: newAdmin.user.id,
            plain_password: adminPassword,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

          console.log("System owner created successfully");
        }
      }

      await supabaseAdmin.from("system_settings").upsert({
        key: "admin_contact",
        value: { email: adminEmail },
        updated_by: null,
      }, { onConflict: "key" });

      return new Response(JSON.stringify({ success: true, message: "System accounts setup complete" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════
    // CREATE MEMBER (no system role assigned - just profile)
    // ═══════════════════════════════════════════════
    if (body.action === "create_member") {
      const { email, student_id, full_name, institution } = body;
      
      if (!email || !student_id || !full_name) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u: any) => u.email === email);

      if (existingUser) {
        return new Response(JSON.stringify({ error: "Email này đã được đăng ký trong hệ thống. Vui lòng sử dụng email khác." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userMetadata: Record<string, string> = { student_id, full_name };
      if (institution) userMetadata.institution = institution;

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: userMetadata,
      });

      if (createError) {
        console.error("Create member error:", createError);
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (newUser.user) {
        await supabaseAdmin.from("profiles").upsert({
          id: newUser.user.id,
          email,
          student_id,
          full_name,
          is_approved: true,
          must_change_password: true,
        }, { onConflict: "id" });

        // No system role assigned for regular members

        await supabaseAdmin.from("demo_passwords").upsert({
          user_id: newUser.user.id,
          plain_password: DEFAULT_PASSWORD,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        console.log("Member created successfully:", email);
      }

      return new Response(JSON.stringify({ success: true, user: newUser.user }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════
    // SAVE DEMO PASSWORD
    // ═══════════════════════════════════════════════
    if (body.action === "save_demo_password") {
      const { user_id, password } = body;
      
      if (!user_id || !password) {
        return new Response(JSON.stringify({ error: "Missing user_id or password" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin.from("demo_passwords").upsert({
        user_id,
        plain_password: password,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════
    // UPDATE PASSWORD
    // ═══════════════════════════════════════════════
    if (body.action === "update_password") {
      const { user_id, password, requester_id } = body;
      
      if (!user_id || !password) {
        return new Response(JSON.stringify({ error: "Missing user_id or password" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (requester_id) {
        const { data: targetIsOwner } = await supabaseAdmin.rpc('is_system_owner', { _user_id: user_id });
        const { data: requesterIsOwner } = await supabaseAdmin.rpc('is_system_owner', { _user_id: requester_id });
        
        if (targetIsOwner && !requesterIsOwner) {
          return new Response(JSON.stringify({ error: "Bạn không có quyền đổi mật khẩu của System Owner" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, { password });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin.from("profiles").update({ must_change_password: false }).eq("id", user_id);

      await supabaseAdmin.from("demo_passwords").upsert({
        user_id,
        plain_password: password,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════
    // CLEAR MUST CHANGE PASSWORD
    // ═══════════════════════════════════════════════
    if (body.action === "clear_must_change_password") {
      const { user_id } = body;
      
      if (!user_id) {
        return new Response(JSON.stringify({ error: "Missing user_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin.from("profiles").update({ must_change_password: false }).eq("id", user_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════
    // DELETE USER
    // ═══════════════════════════════════════════════
    if (body.action === "delete_user") {
      const { user_id, requester_id } = body;
      
      if (!user_id) {
        return new Response(JSON.stringify({ error: "Missing user_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (requester_id) {
        const { data: targetIsOwner } = await supabaseAdmin.rpc('is_system_owner', { _user_id: user_id });
        const { data: requesterIsOwner } = await supabaseAdmin.rpc('is_system_owner', { _user_id: requester_id });
        
        if (targetIsOwner && !requesterIsOwner) {
          return new Response(JSON.stringify({ error: "Bạn không có quyền xóa System Owner" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════
    // UPDATE EMAIL
    // ═══════════════════════════════════════════════
    if (body.action === "update_email") {
      const { user_id, email } = body;
      
      if (!user_id || !email) {
        return new Response(JSON.stringify({ error: "Missing user_id or email" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        email,
        email_confirm: true,
      });

      if (authError) {
        return new Response(JSON.stringify({ error: authError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin.from("profiles").update({ email }).eq("id", user_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════
    // UPDATE ROLE (system roles only: system_admin or remove)
    // ═══════════════════════════════════════════════
    if (body.action === "update_role") {
      const { user_id, new_role, requester_id } = body;
      
      if (!user_id || !new_role || !requester_id) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Only system_owner can change system roles
      const { data: requesterIsOwner } = await supabaseAdmin.rpc('is_system_owner', { _user_id: requester_id });
      if (!requesterIsOwner) {
        return new Response(JSON.stringify({ error: "Chỉ System Owner mới có quyền thay đổi vai trò hệ thống" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: targetIsOwner } = await supabaseAdmin.rpc('is_system_owner', { _user_id: user_id });
      if (targetIsOwner) {
        return new Response(JSON.stringify({ error: "Không thể thay đổi vai trò của System Owner" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new_role === 'system_owner') {
        return new Response(JSON.stringify({ error: "Không thể nâng quyền lên System Owner" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Remove all existing system roles
      await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id);

      // Assign new role if it's a valid system role
      if (new_role === 'system_admin') {
        await supabaseAdmin.from("user_roles").insert({ user_id, role: 'system_admin' });
      }
      // If new_role is 'none' or anything else, user has no system role (regular user)

      console.log(`System role updated for ${user_id}: ${new_role}`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ═══════════════════════════════════════════════
    // RESTORE MEMBERS
    // ═══════════════════════════════════════════════
    if (body.action === "restore_members") {
      const { profiles } = body;
      
      if (!profiles || !Array.isArray(profiles) || profiles.length === 0) {
        return new Response(JSON.stringify({ error: "Missing or empty profiles array" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const mapping: Record<string, string> = {};
      let created = 0;
      let existing = 0;

      for (const profile of profiles) {
        const { id: oldId, student_id, full_name, email } = profile;
        if (!oldId || !student_id || !email) continue;

        try {
          const { data: existingProfile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("student_id", student_id)
            .maybeSingle();

          if (existingProfile) {
            mapping[oldId] = existingProfile.id;
            existing++;
            continue;
          }

          const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
          const existingByEmail = userList?.users?.find(u => u.email === email);

          if (existingByEmail) {
            mapping[oldId] = existingByEmail.id;
            existing++;
            continue;
          }

          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: DEFAULT_PASSWORD,
            email_confirm: true,
            user_metadata: { student_id, full_name }
          });

          if (createError) {
            console.error(`Failed to create user ${email}:`, createError);
            mapping[oldId] = oldId;
            continue;
          }

          if (newUser.user) {
            await supabaseAdmin.from("profiles").upsert({
              id: newUser.user.id,
              email,
              student_id,
              full_name,
              is_approved: true,
              must_change_password: true,
              avatar_url: profile.avatar_url || null,
              year_batch: profile.year_batch || null,
              major: profile.major || null,
              phone: profile.phone || null,
              skills: profile.skills || null,
              bio: profile.bio || null,
              username: profile.username || null,
              social_links: profile.social_links || '{}',
              onboarding_completed: profile.onboarding_completed || false,
            }, { onConflict: "id" });

            // No system role assigned for restored members

            mapping[oldId] = newUser.user.id;
            created++;
          }
        } catch (err) {
          console.error(`Error processing member ${student_id}:`, err);
          mapping[oldId] = oldId;
        }
      }

      return new Response(JSON.stringify({ success: true, mapping, created, existing }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
