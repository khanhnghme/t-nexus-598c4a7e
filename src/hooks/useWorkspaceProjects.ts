import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export interface WorkspaceProject {
  id: string;
  name: string;
  slug: string | null;
  visibility: string;
  isMember: boolean;
}

export function useWorkspaceProjects() {
  const { user } = useAuth();
  const { activeWorkspace, isAvailable, workspaceRole } = useWorkspace();
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user || !isAvailable || !activeWorkspace) {
      setProjects([]);
      return;
    }

    const fetchProjects = async () => {
      setIsLoading(true);

      // 1. Get groups where user is a member in this workspace
      const { data: memberData } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      const joinedIds = new Set((memberData || []).map(m => m.group_id));

      // 2. Get joined projects in this workspace
      let joinedProjects: WorkspaceProject[] = [];
      if (joinedIds.size > 0) {
        const { data } = await supabase
          .from('groups')
          .select('id, name, slug, visibility')
          .in('id', Array.from(joinedIds))
          .eq('workspace_id', activeWorkspace.id)
          .order('name');
        joinedProjects = (data || []).map(g => ({ ...g, isMember: true }));
      }

      // 3. If user is a WS member (not guest), also fetch workspace_public / public_link projects
      let publicProjects: WorkspaceProject[] = [];
      if (workspaceRole) {
        const { data } = await supabase
          .from('groups')
          .select('id, name, slug, visibility')
          .eq('workspace_id', activeWorkspace.id)
          .in('visibility', ['workspace_public', 'public_link'])
          .order('name');
        publicProjects = (data || [])
          .filter(g => !joinedIds.has(g.id))
          .map(g => ({ ...g, isMember: false }));
      }

      setProjects([...joinedProjects, ...publicProjects]);
      setIsLoading(false);
    };

    fetchProjects();
  }, [user, activeWorkspace, isAvailable, workspaceRole]);

  const isGuest = isAvailable && !!activeWorkspace && !workspaceRole;

  return { projects, isLoading, isGuest };
}
