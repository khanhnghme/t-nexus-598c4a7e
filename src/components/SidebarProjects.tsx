import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { FolderKanban, Lock, Globe, Users as UsersIcon } from 'lucide-react';
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
}

interface SidebarProjectsProps {
  collapsed?: boolean;
}

export default function SidebarProjects({ collapsed }: SidebarProjectsProps) {
  const { user } = useAuth();
  const { activeWorkspace, isAvailable } = useWorkspace();
  const location = useLocation();
  const [projects, setProjects] = useState<SidebarProject[]>([]);

  useEffect(() => {
    if (!user || !isAvailable || !activeWorkspace) {
      setProjects([]);
      return;
    }

    const fetchProjects = async () => {
      // Get groups where user is a member AND belong to active workspace
      const { data: memberData } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id);

      if (!memberData?.length) {
        setProjects([]);
        return;
      }

      const groupIds = memberData.map(m => m.group_id);

      const { data } = await supabase
        .from('groups')
        .select('id, name, slug, visibility')
        .in('id', groupIds)
        .eq('workspace_id', activeWorkspace.id)
        .order('name');

      setProjects((data || []) as SidebarProject[]);
    };

    fetchProjects();
  }, [user, activeWorkspace, isAvailable]);

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
      <div className="sidebar-section-label">PROJECTS</div>
      {projects.map(p => {
        const href = `/p/${p.slug || p.id}`;
        const active = location.pathname.startsWith(href);

        if (collapsed) {
          return (
            <Tooltip key={p.id}>
              <TooltipTrigger asChild>
                <Link to={href} className={`sidebar-nav-item ${active ? 'active' : ''}`}>
                  <FolderKanban className="nav-icon" strokeWidth={1.8} />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                <p className="font-medium">{p.name}</p>
              </TooltipContent>
            </Tooltip>
          );
        }

        return (
          <Link
            key={p.id}
            to={href}
            className={`sidebar-nav-item ${active ? 'active' : ''}`}
          >
            <FolderKanban className="nav-icon" strokeWidth={1.8} />
            <span className="nav-label truncate flex-1">{p.name}</span>
            {getVisibilityIcon(p.visibility)}
          </Link>
        );
      })}
    </>
  );
}
