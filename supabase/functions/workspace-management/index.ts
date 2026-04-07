import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Action =
  | "create_workspace"
  | "update_workspace"
  | "delete_workspace"
  | "invite_workspace_member"
  | "invite_project_guest"
  | "accept_invite"
  | "decline_invite"
  | "remove_workspace_member"
  | "change_workspace_role"
  | "leave_workspace"
  | "list_my_workspaces"
  | "get_workspace_members"
  | "transfer_ownership";

interface RequestBody {
  action: Action;
  workspace_id?: string;
  name?: string;
  description?: string;
  logo_url?: string;
  invite_id?: string;
  email?: string;
  role?: string;
  group_id?: string;
  target_user_id?: string;
  new_role?: string;
  new_owner_id?: string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function err(message: string, status = 400) {
  return json({ error: message }, status);
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

    const authHeader = req.headers.get("Authorization");
    let callerId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      callerId = user?.id ?? null;
    }

    const body: RequestBody = await req.json();
    console.log(`[workspace-mgmt] action=${body.action} caller=${callerId}`);

    // ═══════════════════════════════════════════════
    // CREATE WORKSPACE
    // ═══════════════════════════════════════════════
    if (body.action === "create_workspace") {
      if (!callerId) return err("Authentication required", 401);
      if (!body.name) return err("Name is required");

      const { data: slug } = await supabaseAdmin.rpc("generate_workspace_slug", {
        _name: body.name,
      });

      const { data: ws, error: wsErr } = await supabaseAdmin
        .from("workspaces")
        .insert({
          name: body.name,
          slug: slug || `ws-${Date.now()}`,
          description: body.description || null,
          logo_url: body.logo_url || null,
          owner_id: callerId,
          plan: "free",
          max_projects: 2,
          max_members: 5,
          max_storage_mb: 250,
        })
        .select()
        .single();

      if (wsErr) return err(wsErr.message);
      return json({ success: true, workspace: ws });
    }

    // ═══════════════════════════════════════════════
    // UPDATE WORKSPACE
    // ═══════════════════════════════════════════════
    if (body.action === "update_workspace") {
      if (!callerId) return err("Authentication required", 401);
      if (!body.workspace_id) return err("workspace_id required");

      const { data: role } = await supabaseAdmin.rpc("get_workspace_role", {
        _user_id: callerId,
        _workspace_id: body.workspace_id,
      });

      if (role !== "workspace_owner" && role !== "workspace_admin") {
        return err("Only owner or admin can update workspace settings", 403);
      }

      const updates: Record<string, unknown> = {};
      if (body.name !== undefined) updates.name = body.name;
      if (body.description !== undefined) updates.description = body.description;
      if (body.logo_url !== undefined) updates.logo_url = body.logo_url;

      const { data: ws, error: wsErr } = await supabaseAdmin
        .from("workspaces")
        .update(updates)
        .eq("id", body.workspace_id)
        .select()
        .single();

      if (wsErr) return err(wsErr.message);
      return json({ success: true, workspace: ws });
    }

    // ═══════════════════════════════════════════════
    // DELETE WORKSPACE
    // ═══════════════════════════════════════════════
    if (body.action === "delete_workspace") {
      if (!callerId) return err("Authentication required", 401);
      if (!body.workspace_id) return err("workspace_id required");

      const { data: isOwner } = await supabaseAdmin.rpc("is_workspace_owner", {
        _user_id: callerId,
        _workspace_id: body.workspace_id,
      });

      if (!isOwner) return err("Only workspace owner can delete", 403);

      const { error: delErr } = await supabaseAdmin
        .from("workspaces")
        .delete()
        .eq("id", body.workspace_id);

      if (delErr) return err(delErr.message);
      return json({ success: true });
    }

    // ═══════════════════════════════════════════════
    // INVITE WORKSPACE MEMBER
    // ═══════════════════════════════════════════════
    if (body.action === "invite_workspace_member") {
      if (!callerId) return err("Authentication required", 401);
      if (!body.workspace_id || !body.email) return err("workspace_id and email required");

      const inviteRole = body.role || "workspace_member";
      if (inviteRole !== "workspace_admin" && inviteRole !== "workspace_member") {
        return err("Role must be 'workspace_admin' or 'workspace_member'");
      }

      const { data: callerRole } = await supabaseAdmin.rpc("get_workspace_role", {
        _user_id: callerId,
        _workspace_id: body.workspace_id,
      });

      if (callerRole !== "workspace_owner" && callerRole !== "workspace_admin") {
        return err("Only owner or admin can invite members", 403);
      }

      const { data: inviteeProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", body.email)
        .maybeSingle();

      if (inviteeProfile) {
        const { data: existingMember } = await supabaseAdmin
          .from("workspace_members")
          .select("user_id")
          .eq("workspace_id", body.workspace_id)
          .eq("user_id", inviteeProfile.id)
          .maybeSingle();

        const { data: ws } = await supabaseAdmin
          .from("workspaces")
          .select("owner_id")
          .eq("id", body.workspace_id)
          .single();

        if (existingMember || ws?.owner_id === inviteeProfile.id) {
          return err("User is already a workspace member");
        }
      }

      const { data: existingInvite } = await supabaseAdmin
        .from("workspace_invites")
        .select("id")
        .eq("workspace_id", body.workspace_id)
        .eq("invitee_email", body.email)
        .eq("scope", "workspace")
        .eq("status", "pending")
        .maybeSingle();

      if (existingInvite) {
        return err("An invitation is already pending for this email");
      }

      const { data: invite, error: invErr } = await supabaseAdmin
        .from("workspace_invites")
        .insert({
          scope: "workspace",
          workspace_id: body.workspace_id,
          invitee_email: body.email,
          invitee_user_id: inviteeProfile?.id || null,
          role_granted: inviteRole,
          is_guest: false,
          invited_by: callerId,
        })
        .select()
        .single();

      if (invErr) return err(invErr.message);
      return json({ success: true, invite });
    }

    // ═══════════════════════════════════════════════
    // INVITE PROJECT GUEST
    // ═══════════════════════════════════════════════
    if (body.action === "invite_project_guest") {
      if (!callerId) return err("Authentication required", 401);
      if (!body.workspace_id || !body.group_id || !body.email) {
        return err("workspace_id, group_id, and email required");
      }

      const guestRole = body.role || "project_member";

      const { data: callerWsRole } = await supabaseAdmin.rpc("get_workspace_role", {
        _user_id: callerId,
        _workspace_id: body.workspace_id,
      });

      const { data: callerGroupMember } = await supabaseAdmin
        .from("group_members")
        .select("role")
        .eq("group_id", body.group_id)
        .eq("user_id", callerId)
        .maybeSingle();

      const canInvite =
        callerWsRole === "workspace_owner" ||
        callerWsRole === "workspace_admin" ||
        callerGroupMember?.role === "project_owner" ||
        callerGroupMember?.role === "project_admin";

      if (!canInvite) {
        return err("Insufficient permissions to invite guests to this project", 403);
      }

      const { data: inviteeProfile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("email", body.email)
        .maybeSingle();

      const { data: invite, error: invErr } = await supabaseAdmin
        .from("workspace_invites")
        .insert({
          scope: "project",
          workspace_id: body.workspace_id,
          group_id: body.group_id,
          invitee_email: body.email,
          invitee_user_id: inviteeProfile?.id || null,
          role_granted: guestRole,
          is_guest: true,
          invited_by: callerId,
        })
        .select()
        .single();

      if (invErr) return err(invErr.message);
      return json({ success: true, invite });
    }

    // ═══════════════════════════════════════════════
    // ACCEPT INVITE
    // ═══════════════════════════════════════════════
    if (body.action === "accept_invite") {
      if (!callerId) return err("Authentication required", 401);
      if (!body.invite_id) return err("invite_id required");

      const { data: invite, error: findErr } = await supabaseAdmin
        .from("workspace_invites")
        .select("*")
        .eq("id", body.invite_id)
        .eq("status", "pending")
        .single();

      if (findErr || !invite) return err("Invite not found or already processed");

      const { data: callerProfile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", callerId)
        .single();

      if (callerProfile?.email !== invite.invitee_email) {
        return err("This invite is not for you", 403);
      }

      if (new Date(invite.expires_at) < new Date()) {
        await supabaseAdmin
          .from("workspace_invites")
          .update({ status: "expired" })
          .eq("id", invite.id);
        return err("Invite has expired");
      }

      if (invite.scope === "workspace") {
        const { error: addErr } = await supabaseAdmin
          .from("workspace_members")
          .insert({
            workspace_id: invite.workspace_id,
            user_id: callerId,
            role: invite.role_granted, // workspace_admin or workspace_member
            invited_by: invite.invited_by,
          });

        if (addErr) return err(addErr.message);
      } else if (invite.scope === "project" && invite.group_id) {
        const { error: addErr } = await supabaseAdmin
          .from("group_members")
          .insert({
            group_id: invite.group_id,
            user_id: callerId,
            role: invite.role_granted, // project_member, project_guest, etc.
            is_guest: true,
          });

        if (addErr) return err(addErr.message);
      }

      await supabaseAdmin
        .from("workspace_invites")
        .update({ status: "accepted", invitee_user_id: callerId })
        .eq("id", invite.id);

      return json({ success: true });
    }

    // ═══════════════════════════════════════════════
    // DECLINE INVITE
    // ═══════════════════════════════════════════════
    if (body.action === "decline_invite") {
      if (!callerId) return err("Authentication required", 401);
      if (!body.invite_id) return err("invite_id required");

      await supabaseAdmin
        .from("workspace_invites")
        .update({ status: "declined" })
        .eq("id", body.invite_id);

      return json({ success: true });
    }

    // ═══════════════════════════════════════════════
    // REMOVE WORKSPACE MEMBER
    // ═══════════════════════════════════════════════
    if (body.action === "remove_workspace_member") {
      if (!callerId) return err("Authentication required", 401);
      if (!body.workspace_id || !body.target_user_id) {
        return err("workspace_id and target_user_id required");
      }

      const { data: callerRole } = await supabaseAdmin.rpc("get_workspace_role", {
        _user_id: callerId,
        _workspace_id: body.workspace_id,
      });

      if (callerRole !== "workspace_owner" && callerRole !== "workspace_admin") {
        return err("Only owner or admin can remove members", 403);
      }

      const { data: ws } = await supabaseAdmin
        .from("workspaces")
        .select("owner_id")
        .eq("id", body.workspace_id)
        .single();

      if (ws?.owner_id === body.target_user_id) {
        return err("Cannot remove the workspace owner");
      }

      if (callerRole === "workspace_admin") {
        const { data: targetRole } = await supabaseAdmin.rpc("get_workspace_role", {
          _user_id: body.target_user_id,
          _workspace_id: body.workspace_id,
        });
        if (targetRole === "workspace_admin") {
          return err("Admins cannot remove other admins. Only the owner can.", 403);
        }
      }

      const { error: delErr } = await supabaseAdmin
        .from("workspace_members")
        .delete()
        .eq("workspace_id", body.workspace_id)
        .eq("user_id", body.target_user_id);

      if (delErr) return err(delErr.message);
      return json({ success: true });
    }

    // ═══════════════════════════════════════════════
    // CHANGE WORKSPACE ROLE
    // ═══════════════════════════════════════════════
    if (body.action === "change_workspace_role") {
      if (!callerId) return err("Authentication required", 401);
      if (!body.workspace_id || !body.target_user_id || !body.new_role) {
        return err("workspace_id, target_user_id, and new_role required");
      }

      const { data: isOwner } = await supabaseAdmin.rpc("is_workspace_owner", {
        _user_id: callerId,
        _workspace_id: body.workspace_id,
      });

      if (!isOwner) return err("Only workspace owner can change roles", 403);

      if (body.new_role !== "workspace_admin" && body.new_role !== "workspace_member") {
        return err("Role must be 'workspace_admin' or 'workspace_member'");
      }

      const { error: updErr } = await supabaseAdmin
        .from("workspace_members")
        .update({ role: body.new_role })
        .eq("workspace_id", body.workspace_id)
        .eq("user_id", body.target_user_id);

      if (updErr) return err(updErr.message);
      return json({ success: true });
    }

    // ═══════════════════════════════════════════════
    // LEAVE WORKSPACE
    // ═══════════════════════════════════════════════
    if (body.action === "leave_workspace") {
      if (!callerId) return err("Authentication required", 401);
      if (!body.workspace_id) return err("workspace_id required");

      const { data: isOwner } = await supabaseAdmin.rpc("is_workspace_owner", {
        _user_id: callerId,
        _workspace_id: body.workspace_id,
      });

      if (isOwner) {
        return err("Owner cannot leave. Transfer ownership first.");
      }

      const { error: delErr } = await supabaseAdmin
        .from("workspace_members")
        .delete()
        .eq("workspace_id", body.workspace_id)
        .eq("user_id", callerId);

      if (delErr) return err(delErr.message);
      return json({ success: true });
    }

    // ═══════════════════════════════════════════════
    // LIST MY WORKSPACES
    // ═══════════════════════════════════════════════
    if (body.action === "list_my_workspaces") {
      if (!callerId) return err("Authentication required", 401);

      const { data: owned } = await supabaseAdmin
        .from("workspaces")
        .select("*, workspace_members(count)")
        .eq("owner_id", callerId);

      const { data: memberOf } = await supabaseAdmin
        .from("workspace_members")
        .select("role, workspace:workspaces(*)")
        .eq("user_id", callerId);

      const workspaces = [
        ...(owned || []).map((w: any) => ({
          ...w,
          my_role: "workspace_owner",
          member_count: w.workspace_members?.[0]?.count || 0,
        })),
        ...(memberOf || []).map((m: any) => ({
          ...m.workspace,
          my_role: m.role, // already workspace_admin or workspace_member
        })),
      ];

      return json({ success: true, workspaces });
    }

    // ═══════════════════════════════════════════════
    // GET WORKSPACE MEMBERS
    // ═══════════════════════════════════════════════
    if (body.action === "get_workspace_members") {
      if (!callerId) return err("Authentication required", 401);
      if (!body.workspace_id) return err("workspace_id required");

      const { data: isParticipant } = await supabaseAdmin.rpc("is_workspace_participant", {
        _user_id: callerId,
        _workspace_id: body.workspace_id,
      });

      if (!isParticipant) return err("Not a workspace participant", 403);

      const { data: ws } = await supabaseAdmin
        .from("workspaces")
        .select("owner_id")
        .eq("id", body.workspace_id)
        .single();

      const { data: ownerProfile } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, email, avatar_url, student_id")
        .eq("id", ws?.owner_id)
        .single();

      const { data: members } = await supabaseAdmin
        .from("workspace_members")
        .select("user_id, role, joined_at, profiles:user_id(id, full_name, email, avatar_url, student_id)")
        .eq("workspace_id", body.workspace_id);

      const result = [
        {
          ...ownerProfile,
          role: "workspace_owner",
          joined_at: null,
        },
        ...(members || []).map((m: any) => ({
          ...m.profiles,
          role: m.role, // workspace_admin or workspace_member
          joined_at: m.joined_at,
        })),
      ];

      return json({ success: true, members: result });
    }

    // ═══════════════════════════════════════════════
    // TRANSFER OWNERSHIP
    // ═══════════════════════════════════════════════
    if (body.action === "transfer_ownership") {
      if (!callerId) return err("Authentication required", 401);
      if (!body.workspace_id || !body.new_owner_id) {
        return err("workspace_id and new_owner_id required");
      }

      const { data: isOwner } = await supabaseAdmin.rpc("is_workspace_owner", {
        _user_id: callerId,
        _workspace_id: body.workspace_id,
      });

      if (!isOwner) return err("Only current owner can transfer ownership", 403);

      const { data: newOwnerMember } = await supabaseAdmin
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", body.workspace_id)
        .eq("user_id", body.new_owner_id)
        .maybeSingle();

      if (!newOwnerMember) return err("New owner must be an existing workspace member");

      await supabaseAdmin
        .from("workspaces")
        .update({ owner_id: body.new_owner_id })
        .eq("id", body.workspace_id);

      await supabaseAdmin
        .from("workspace_members")
        .delete()
        .eq("workspace_id", body.workspace_id)
        .eq("user_id", body.new_owner_id);

      await supabaseAdmin
        .from("workspace_members")
        .insert({
          workspace_id: body.workspace_id,
          user_id: callerId,
          role: "workspace_admin",
        });

      return json({ success: true });
    }

    return err("Invalid action");
  } catch (error: unknown) {
    console.error("[workspace-mgmt] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ error: message }, 500);
  }
});
