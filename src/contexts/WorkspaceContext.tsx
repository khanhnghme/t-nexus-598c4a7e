import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Workspace, WorkspaceRole } from '@/types/database';

interface WorkspaceContextType {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  workspaceRole: WorkspaceRole | null;
  isLoading: boolean;
  isAvailable: boolean;
  switchWorkspace: (workspaceId: string) => void;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const ACTIVE_WS_KEY = 'tnexus_active_workspace';

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);

  const fetchWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      setWorkspaceRole(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data: ownedWs, error: ownedErr } = await (supabase as any)
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id);

      if (ownedErr) {
        console.info('[WorkspaceContext] Workspaces table not available yet.');
        setIsAvailable(false);
        setIsLoading(false);
        return;
      }

      setIsAvailable(true);

      const { data: memberWs } = await (supabase as any)
        .from('workspace_members')
        .select('role, workspaces(*)')
        .eq('user_id', user.id);

      // Fetch owner plans for cascading billing
      const ownerIds = [...new Set([
        ...(ownedWs || []).map((w: any) => w.owner_id),
        ...(memberWs || []).map((m: any) => m.workspaces?.owner_id),
      ].filter(Boolean))];

      let ownerPlanMap: Record<string, string> = {};
      if (ownerIds.length > 0) {
        const { data: ownerProfiles } = await (supabase as any)
          .from('profiles')
          .select('id, user_plan')
          .in('id', ownerIds);
        ownerPlanMap = Object.fromEntries(
          (ownerProfiles || []).map((p: any) => [p.id, p.user_plan])
        );
      }

      const premiumPlans = ['plan_plus', 'plan_pro', 'plan_business', 'plan_custom'];

      const allWorkspaces: Workspace[] = [
        ...(ownedWs || []).map((w: any) => ({
          ...w,
          my_role: 'workspace_owner' as WorkspaceRole,
          owner_plan: ownerPlanMap[w.owner_id] || 'plan_free',
          is_premium: premiumPlans.includes(ownerPlanMap[w.owner_id] || 'plan_free'),
        })),
        ...(memberWs || []).map((m: any) => ({
          ...m.workspaces,
          my_role: m.role as WorkspaceRole,
          owner_plan: ownerPlanMap[m.workspaces?.owner_id] || 'plan_free',
          is_premium: premiumPlans.includes(ownerPlanMap[m.workspaces?.owner_id] || 'plan_free'),
        })),
      ];

      setWorkspaces(allWorkspaces);

      const savedWsId = localStorage.getItem(ACTIVE_WS_KEY);
      const savedWs = allWorkspaces.find(w => w.id === savedWsId);

      if (savedWs) {
        setActiveWorkspace(savedWs);
        setWorkspaceRole(savedWs.my_role || null);
      } else if (allWorkspaces.length > 0) {
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

  const switchWorkspace = useCallback((workspaceId: string) => {
    const ws = workspaces.find(w => w.id === workspaceId);
    if (ws) {
      setActiveWorkspace(ws);
      setWorkspaceRole(ws.my_role || null);
      localStorage.setItem(ACTIVE_WS_KEY, ws.id);
    }
  }, [workspaces]);

  const refreshWorkspaces = useCallback(async () => {
    await fetchWorkspaces();
  }, [fetchWorkspaces]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

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

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
