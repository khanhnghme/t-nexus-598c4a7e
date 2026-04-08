import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface PlanLimits {
  maxWorkspaces: number | null;
  maxProjectsPerWorkspace: number | null;
  maxMembersPerWorkspace: number | null;
  maxStorageMb: number | null;
  isLoading: boolean;
}

/**
 * Hook to fetch plan limits for the active workspace's owner plan.
 * Returns null for any limit = UNLIMITED (no restriction).
 * Cascading billing: limits come from workspace owner's plan.
 */
export function usePlanLimits(): PlanLimits {
  const { activeWorkspace } = useWorkspace();
  const [limits, setLimits] = useState<PlanLimits>({
    maxWorkspaces: null,
    maxProjectsPerWorkspace: null,
    maxMembersPerWorkspace: null,
    maxStorageMb: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!activeWorkspace) {
      setLimits(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const fetchLimits = async () => {
      try {
        // Get workspace owner's plan via RPC
        const { data: planText } = await supabase.rpc('get_workspace_plan', {
          _workspace_id: activeWorkspace.id,
        });

        if (!planText) {
          setLimits(prev => ({ ...prev, isLoading: false }));
          return;
        }

        // Query plan_limits table
        const { data: planData } = await supabase
          .from('plan_limits')
          .select('*')
          .eq('plan', planText as any)
          .maybeSingle();

        // If no plan_limits row found → UNLIMITED (all null)
        setLimits({
          maxWorkspaces: planData?.max_workspaces ?? null,
          maxProjectsPerWorkspace: planData?.max_projects_per_workspace ?? null,
          maxMembersPerWorkspace: planData?.max_members_per_workspace ?? null,
          maxStorageMb: planData?.max_storage_mb ?? null,
          isLoading: false,
        });
      } catch (err) {
        console.warn('Error fetching plan limits:', err);
        setLimits(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchLimits();
  }, [activeWorkspace?.id]);

  return limits;
}

/**
 * Check if a count exceeds a limit.
 * If limit is null → UNLIMITED → always returns false (not exceeded).
 */
export function isLimitExceeded(current: number, limit: number | null): boolean {
  if (limit === null) return false; // UNLIMITED
  return current >= limit;
}
