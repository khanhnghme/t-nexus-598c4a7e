import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_PASSWORD = "123456";

interface CreateMemberRequest {
  action: "create_member" | "setup_system_accounts" | "update_password" | "clear_must_change_password" | "delete_user" | "update_email" | "update_role" | "restore_members";
  email?: string;
  password?: string;
  student_id?: string;
  full_name?: string;
  institution?: string;
  role?: "member" | "leader" | "admin";
  new_role?: "member" | "leader" | "admin";
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

    const body: CreateMemberRequest = await req.json();
    console.log("Action:", body.action);

    if (body.action === "setup_system_accounts") {
      // Read admin config from secrets (remix-safe)
      const adminEmail = Deno.env.get("ADMIN_EMAIL");
      const adminPassword = Deno.env.get("ADMIN_DEFAULT_PASSWORD") || "changeme123";
      const adminStudentId = Deno.env.get("ADMIN_STUDENT_ID") || "00000000";
      const adminFullName = Deno.env.get("ADMIN_FULL_NAME") || "System Admin";
      const adminInstitution = "T-Nexus System";

      if (!adminEmail) {
        return new Response(JSON.stringify({ error: "ADMIN_EMAIL secret is not configured" }), {
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
          role: "admin",
        }, { onConflict: "user_id,role" });

        // Save admin password for demo
        await supabaseAdmin.from("demo_passwords").upsert({
          user_id: existingAdmin.id,
          plain_password: adminPassword,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        console.log("Admin account updated");
      } else {
        const { data: newAdmin, error: adminError } = await supabaseAdmin.auth.admin.createUser({
          email: adminEmail,
          password: adminPassword,
          email_confirm: true,
          user_metadata: { student_id: adminStudentId, full_name: adminFullName, institution: adminInstitution }
        });

        if (adminError) {
          console.error("Admin creation error:", adminError);
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
            role: "admin",
          });

          // Save admin password for demo
          await supabaseAdmin.from("demo_passwords").upsert({
            user_id: newAdmin.user.id,
            plain_password: adminPassword,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

          console.log("Admin created successfully");
        }
      }

      // Store admin contact for frontend
      await supabaseAdmin.from("system_settings").upsert({
        key: "admin_contact",
        value: { email: adminEmail },
        updated_by: null,
      }, { onConflict: "key" });

      return new Response(JSON.stringify({ success: true, message: "System accounts setup complete" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "create_member") {
      const { email, student_id, full_name, institution } = body;
      
      if (!email || !student_id || !full_name) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if email already exists - try to find by email first
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

        await supabaseAdmin.from("user_roles").insert({
          user_id: newUser.user.id,
          role: "member",
        });

        // Save default password for demo
        await supabaseAdmin.from("demo_passwords").upsert({
          user_id: newUser.user.id,
          plain_password: DEFAULT_PASSWORD,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        console.log("Member created successfully with default password:", email);
      }

      return new Response(JSON.stringify({ success: true, user: newUser.user }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    if (body.action === "update_password") {
      const { user_id, password, requester_id } = body;
      
      if (!user_id || !password) {
        return new Response(JSON.stringify({ error: "Missing user_id or password" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (requester_id) {
        const { data: targetIsAdmin } = await supabaseAdmin.rpc('is_admin', { _user_id: user_id });
        const { data: requesterIsAdmin } = await supabaseAdmin.rpc('is_admin', { _user_id: requester_id });
        
        if (targetIsAdmin && !requesterIsAdmin) {
          return new Response(JSON.stringify({ error: "Bạn không có quyền đổi mật khẩu của Admin" }), {
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

      // Save password for demo
      await supabaseAdmin.from("demo_passwords").upsert({
        user_id,
        plain_password: password,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    if (body.action === "delete_user") {
      const { user_id, requester_id } = body;
      
      if (!user_id) {
        return new Response(JSON.stringify({ error: "Missing user_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (requester_id) {
        const { data: targetIsAdmin } = await supabaseAdmin.rpc('is_admin', { _user_id: user_id });
        const { data: requesterIsAdmin } = await supabaseAdmin.rpc('is_admin', { _user_id: requester_id });
        
        if (targetIsAdmin && !requesterIsAdmin) {
          return new Response(JSON.stringify({ error: "Bạn không có quyền xóa Admin" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);

      if (error) {
        console.error("Delete user error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log("User deleted successfully:", user_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        console.error("Update email error:", authError);
        return new Response(JSON.stringify({ error: authError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin.from("profiles").update({ email }).eq("id", user_id);

      console.log("Email updated successfully:", user_id, email);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.action === "update_role") {
      const { user_id, new_role, requester_id } = body;
      
      if (!user_id || !new_role || !requester_id) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: requesterIsAdmin } = await supabaseAdmin.rpc('is_admin', { _user_id: requester_id });
      if (!requesterIsAdmin) {
        return new Response(JSON.stringify({ error: "Chỉ Admin mới có quyền thay đổi vai trò" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: targetIsAdmin } = await supabaseAdmin.rpc('is_owner_system', { _user_id: user_id });
      if (targetIsAdmin) {
        return new Response(JSON.stringify({ error: "Không thể thay đổi vai trò của OwnerSystem" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new_role === 'owner_system') {
        return new Response(JSON.stringify({ error: "Không thể nâng quyền lên OwnerSystem" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseAdmin.from("user_roles").delete().eq("user_id", user_id).neq("role", "owner_system");
      await supabaseAdmin.from("user_roles").insert({ user_id, role: new_role });

      console.log(`Role updated for ${user_id}: ${new_role}`);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
          // Check if user exists by student_id
          const { data: existingProfile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("student_id", student_id)
            .maybeSingle();

          if (existingProfile) {
            mapping[oldId] = existingProfile.id;
            existing++;
            console.log(`Member found by student_id ${student_id}: ${existingProfile.id}`);
            continue;
          }

          // Check if email already exists in auth
          const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
          const existingByEmail = userList?.users?.find(u => u.email === email);

          if (existingByEmail) {
            // Email exists but different student_id - map to existing user
            mapping[oldId] = existingByEmail.id;
            existing++;
            console.log(`Member found by email ${email}: ${existingByEmail.id}`);
            continue;
          }

          // Create new auth user
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: DEFAULT_PASSWORD,
            email_confirm: true,
            user_metadata: { student_id, full_name }
          });

          if (createError) {
            console.error(`Failed to create user ${email}:`, createError);
            // Still try to map by keeping old ID (might work if user exists)
            mapping[oldId] = oldId;
            continue;
          }

          if (newUser.user) {
            // Upsert profile with all backup data
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

            // Add member role
            await supabaseAdmin.from("user_roles").upsert({
              user_id: newUser.user.id,
              role: "member",
            }, { onConflict: "user_id,role" });

            mapping[oldId] = newUser.user.id;
            created++;
            console.log(`Member created: ${email} (${student_id}) -> ${newUser.user.id}`);
          }
        } catch (err) {
          console.error(`Error processing member ${student_id}:`, err);
          mapping[oldId] = oldId; // fallback
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        mapping, 
        created, 
        existing 
      }), {
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
