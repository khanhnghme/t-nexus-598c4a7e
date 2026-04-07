import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import type { WorkspaceRole } from '@/types/database';

export interface WorkspaceMemberInfo {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  student_id: string;
  role: WorkspaceRole;
  joined_at: string | null;
}

interface UseWorkspaceMembersReturn {
  members: WorkspaceMemberInfo[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  inviteMember: (email: string, role: 'workspace_admin' | 'workspace_member') => Promise<{ success: boolean; error?: string }>;
  inviteGuest: (email: string, groupId: string, role: string) => Promise<{ success: boolean; error?: string }>;
  removeMember: (userId: string) => Promise<{ success: boolean; error?: string }>;
  changeRole: (userId: string, newRole: 'workspace_admin' | 'workspace_member') => Promise<{ success: boolean; error?: string }>;
}

export function useWorkspaceMembers(): UseWorkspaceMembersReturn {
  const { user } = useAuth();
  const { activeWorkspace, isAvailable } = useWorkspace();
  const [members, setMembers] = useState<WorkspaceMemberInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    if (!activeWorkspace || !isAvailable) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('workspace-management', {
        body: {
          action: 'get_workspace_members',
          workspace_id: activeWorkspace.id,
        },
      });

      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);

      setMembers(data.members || []);
    } catch (err: any) {
      console.warn('[useWorkspaceMembers] Error:', err);
      setError(err.message || 'Failed to load members');
    } finally {
      setIsLoading(false);
    }
  }, [activeWorkspace, isAvailable]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const inviteMember = useCallback(async (email: string, role: 'workspace_admin' | 'workspace_member') => {
    if (!activeWorkspace) return { success: false, error: 'No active workspace' };

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('workspace-management', {
        body: {
          action: 'invite_workspace_member',
          workspace_id: activeWorkspace.id,
          email,
          role,
        },
      });

      if (fnErr) {
        // Try to extract readable error from response body
        const body = data || {};
        const msg = body.error || fnErr.message || 'Invitation failed';
        return { success: false, error: msg };
      }
      if (data?.error) return { success: false, error: data.error };

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Invitation failed' };
    }
  }, [activeWorkspace]);

  const inviteGuest = useCallback(async (email: string, groupId: string, role: string) => {
    if (!activeWorkspace) return { success: false, error: 'No active workspace' };

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('workspace-management', {
        body: {
          action: 'invite_project_guest',
          workspace_id: activeWorkspace.id,
          group_id: groupId,
          email,
          role,
        },
      });

      if (fnErr) throw fnErr;
      if (data?.error) return { success: false, error: data.error };

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [activeWorkspace]);

  const removeMember = useCallback(async (userId: string) => {
    if (!activeWorkspace) return { success: false, error: 'No active workspace' };

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('workspace-management', {
        body: {
          action: 'remove_workspace_member',
          workspace_id: activeWorkspace.id,
          target_user_id: userId,
        },
      });

      if (fnErr) throw fnErr;
      if (data?.error) return { success: false, error: data.error };

      await fetchMembers();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [activeWorkspace, fetchMembers]);

  const changeRole = useCallback(async (userId: string, newRole: 'workspace_admin' | 'workspace_member') => {
    if (!activeWorkspace) return { success: false, error: 'No active workspace' };

    try {
      const { data, error: fnErr } = await supabase.functions.invoke('workspace-management', {
        body: {
          action: 'change_workspace_role',
          workspace_id: activeWorkspace.id,
          target_user_id: userId,
          new_role: newRole,
        },
      });

      if (fnErr) throw fnErr;
      if (data?.error) return { success: false, error: data.error };

      await fetchMembers();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }, [activeWorkspace, fetchMembers]);

  return {
    members,
    isLoading,
    error,
    refresh: fetchMembers,
    inviteMember,
    inviteGuest,
    removeMember,
    changeRole,
  };
}
