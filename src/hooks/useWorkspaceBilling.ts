import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

interface WorkspaceBilling {
  ownerPlan: string | null;
  ownerName: string | null;
  ownerId: string | null;
  projectCount: number;
  maxProjects: number | null;
  isLoading: boolean;
}

/**
 * Fetches cascading billing info for the active workspace:
 * - Owner's plan name (from profiles.user_plan via owner_id)
 * - Owner's display name
 * - Current project count in workspace
 * - Max projects limit from plan_limits (null = UNLIMITED)
 */
export function useWorkspaceBilling(): WorkspaceBilling {
  const { activeWorkspace } = useWorkspace();
  const [billing, setBilling] = useState<WorkspaceBilling>({
    ownerPlan: null,
    ownerName: null,
    ownerId: null,
    projectCount: 0,
    maxProjects: null,
    isLoading: true,
  });

  useEffect(() => {
    if (!activeWorkspace) {
      setBilling(prev => ({ ...prev, isLoading: false }));
      return;
    }

    const fetch = async () => {
      try {
        const [planRes, ownerRes, countRes] = await Promise.all([
          // Get plan text via RPC
          supabase.rpc('get_workspace_plan', { _workspace_id: activeWorkspace.id }),
          // Get owner profile
          supabase.from('profiles').select('id, full_name, user_plan').eq('id', activeWorkspace.owner_id).maybeSingle(),
          // Count projects in workspace
          supabase.from('groups').select('id', { count: 'exact', head: true }).eq('workspace_id', activeWorkspace.id),
        ]);

        const planText = planRes.data as string | null;

        // Get limits from plan_limits table
        let maxProjects: number | null = null;
        if (planText) {
          const { data: limitsData } = await supabase
            .from('plan_limits')
            .select('max_projects_per_workspace')
            .eq('plan', planText as any)
            .maybeSingle();
          maxProjects = limitsData?.max_projects_per_workspace ?? null;
        }

        setBilling({
          ownerPlan: planText,
          ownerName: ownerRes.data?.full_name ?? null,
          ownerId: activeWorkspace.owner_id,
          projectCount: countRes.count ?? 0,
          maxProjects,
          isLoading: false,
        });
      } catch (err) {
        console.warn('Error fetching workspace billing:', err);
        setBilling(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetch();
  }, [activeWorkspace?.id, activeWorkspace?.owner_id]);

  return billing;
}

/** Format plan name for display: 'plan_pro' → 'Pro' */
export function formatPlanName(plan: string | null): string {
  if (!plan) return 'Free';
  return plan.replace(/^plan_/, '').replace(/^\w/, c => c.toUpperCase());
}
