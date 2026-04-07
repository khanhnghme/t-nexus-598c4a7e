import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { FolderKanban, Lock, Globe, Users as UsersIcon, Ghost } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SidebarProject {
  id: string;
  name: string;
  slug: string | null;
  visibility: string;
  isMember: boolean;
}

interface SidebarProjectsProps {
  collapsed?: boolean;
}

export default function SidebarProjects({ collapsed }: SidebarProjectsProps) {
  const { user } = useAuth();
  const { activeWorkspace, isAvailable, workspaceRole } = useWorkspace();
  const location = useLocation();
  const [projects, setProjects] = useState<SidebarProject[]>([]);

  useEffect(() => {
    if (!user || !isAvailable || !activeWorkspace) {
      setProjects([]);
      return;
    }

    const fetchProjects = async () => {
      // 1. Get groups where user is a member in this workspace
      const { data: memberData } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      const joinedIds = new Set((memberData || []).map(m => m.group_id));

      // 2. Get joined projects in this workspace
      let joinedProjects: SidebarProject[] = [];
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
      let publicProjects: SidebarProject[] = [];
      if (workspaceRole) {
        // workspaceRole is set => user is owner/admin/member of workspace
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

      // Merge: joined first, then public (not joined)
      setProjects([...joinedProjects, ...publicProjects]);
    };

    fetchProjects();
  }, [user, activeWorkspace, isAvailable, workspaceRole]);

  const isGuest = isAvailable && activeWorkspace && !workspaceRole;

  if (!isAvailable || !activeWorkspace || projects.length === 0) return null;

  const getVisibilityIcon = (v: string) => {
    switch (v) {
      case 'workspace_public': return <Globe className="w-3 h-3 opacity-50" />;
      case 'public_link': return <UsersIcon className="w-3 h-3 opacity-50" />;
      default: return <Lock className="w-3 h-3 opacity-50" />;
    }
  };

  return (
    <>
      <div className="sidebar-nav-separator" />
      <div className="sidebar-section-label flex items-center gap-1.5">
        {isGuest && <Ghost className="w-3 h-3" />}
        {isGuest ? 'GUEST PROJECTS' : 'PROJECTS'}
      </div>
      {isGuest && !collapsed && (
        <div className="px-3 pb-1">
          <div className="text-[10px] text-muted-foreground/70 leading-tight">
            Bạn đang truy cập với vai trò khách mời.
          </div>
        </div>
      )}
      {projects.map(p => {
        const href = `/p/${p.slug || p.id}`;
        const active = location.pathname.startsWith(href);

        if (collapsed) {
          return (
            <Tooltip key={p.id}>
              <TooltipTrigger asChild>
                <Link to={href} className={cn('sidebar-nav-item', active && 'active', !p.isMember && 'opacity-60')}>
                  <FolderKanban className="nav-icon" strokeWidth={1.8} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                <p className="font-medium">{p.name}</p>
                {!p.isMember && <p className="text-[10px] text-muted-foreground">Chưa tham gia</p>}
              </TooltipContent>
            </Tooltip>
          );
        }

        return (
          <Link
            key={p.id}
            to={href}
            className={cn('sidebar-nav-item', active && 'active', !p.isMember && 'opacity-60')}
          >
            <FolderKanban className="nav-icon" strokeWidth={1.8} />
            <span className="nav-label truncate flex-1">{p.name}</span>
            {!p.isMember && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">Mới</span>
            )}
            {getVisibilityIcon(p.visibility)}
          </Link>
        );
      })}
    </>
  );
}
