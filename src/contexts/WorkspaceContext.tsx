import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Workspace, WorkspaceRole } from '@/types/database';

/* ═══════════════════════════════════════════════════════════════ */
/*  Types                                                         */
/* ═══════════════════════════════════════════════════════════════ */

interface WorkspaceContextType {
  /** List of workspaces the current user belongs to */
  workspaces: Workspace[];
  /** Currently active workspace */
  activeWorkspace: Workspace | null;
  /** User's role in the active workspace */
  workspaceRole: WorkspaceRole | null;
  /** Whether workspace data is being loaded */
  isLoading: boolean;
  /** Whether workspace feature is available (tables exist) */
  isAvailable: boolean;
  /** Switch to a different workspace */
  switchWorkspace: (workspaceId: string) => void;
  /** Refresh workspace list */
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

/* ═══════════════════════════════════════════════════════════════ */
/*  Storage key for persisting active workspace                   */
/* ═══════════════════════════════════════════════════════════════ */
const ACTIVE_WS_KEY = 'tnexus_active_workspace';

/* ═══════════════════════════════════════════════════════════════ */
/*  Provider                                                      */
/* ═══════════════════════════════════════════════════════════════ */

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);

  /* ── Fetch all workspaces for the current user ── */
  const fetchWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      setWorkspaceRole(null);
      setIsLoading(false);
      return;
    }

    try {
      // Try to fetch workspaces — if table doesn't exist, gracefully fail
      const { data: ownedWs, error: ownedErr } = await (supabase as any)
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id);

      if (ownedErr) {
        // Table likely doesn't exist yet — workspace feature not available
        console.info('[WorkspaceContext] Workspaces table not available yet. Running in legacy mode.');
        setIsAvailable(false);
        setIsLoading(false);
        return;
      }

      setIsAvailable(true);

      // Get workspaces where user is a member (not owner)
      const { data: memberWs } = await (supabase as any)
        .from('workspace_members')
        .select('role, workspaces(*)')
        .eq('user_id', user.id);

      const allWorkspaces: Workspace[] = [
        ...(ownedWs || []).map((w: any) => ({ ...w, my_role: 'owner' as WorkspaceRole })),
        ...(memberWs || []).map((m: any) => ({
          ...m.workspaces,
          my_role: m.role as WorkspaceRole,
        })),
      ];

      setWorkspaces(allWorkspaces);

      // Restore last active workspace from localStorage
      const savedWsId = localStorage.getItem(ACTIVE_WS_KEY);
      const savedWs = allWorkspaces.find(w => w.id === savedWsId);

      if (savedWs) {
        setActiveWorkspace(savedWs);
        setWorkspaceRole(savedWs.my_role || null);
      } else if (allWorkspaces.length > 0) {
        // Default to first workspace (usually the owned one)
        const defaultWs = allWorkspaces[0];
        setActiveWorkspace(defaultWs);
        setWorkspaceRole(defaultWs.my_role || null);
        localStorage.setItem(ACTIVE_WS_KEY, defaultWs.id);
      }
    } catch (err) {
      console.warn('[WorkspaceContext] Error fetching workspaces:', err);
      setIsAvailable(false);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /* ── Switch workspace ── */
  const switchWorkspace = useCallback((workspaceId: string) => {
    const ws = workspaces.find(w => w.id === workspaceId);
    if (ws) {
      setActiveWorkspace(ws);
      setWorkspaceRole(ws.my_role || null);
      localStorage.setItem(ACTIVE_WS_KEY, ws.id);
    }
  }, [workspaces]);

  /* ── Refresh ── */
  const refreshWorkspaces = useCallback(async () => {
    await fetchWorkspaces();
  }, [fetchWorkspaces]);

  /* ── Effect: fetch on user change ── */
  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  /* ── Clear on logout ── */
  useEffect(() => {
    if (!user) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      setWorkspaceRole(null);
      setIsLoading(false);
    }
  }, [user]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        workspaceRole,
        isLoading,
        isAvailable,
        switchWorkspace,
        refreshWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  Hook                                                          */
/* ═══════════════════════════════════════════════════════════════ */

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
