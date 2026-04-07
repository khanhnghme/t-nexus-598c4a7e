import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWorkspaceProjects } from '@/hooks/useWorkspaceProjects';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Building2,
  Users,
  Settings,
  FolderKanban,
  ChevronRight,
  Lock,
  Globe,
  Users as UsersIcon,
  CalendarDays,
  MessageSquare,
  UserCircle,
  BookOpen,
  Lightbulb,
  FolderArchive,
  Shield,
  Wrench,
  Ghost,
  Eye,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SidebarTreeNavProps {
  collapsed?: boolean;
}

export default function SidebarTreeNav({ collapsed }: SidebarTreeNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  const { activeWorkspace, workspaces, switchWorkspace, isAvailable, workspaceRole } = useWorkspace();
  const { projects, isGuest } = useWorkspaceProjects();

  const hiddenNav = Array.isArray(profile?.nav_hidden_pages)
    ? (profile.nav_hidden_pages as string[])
    : [];

  // Expanded state
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['workspace', 'projects']));

  const toggle = useCallback((key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Auto-expand based on current route
  useEffect(() => {
    const path = location.pathname;
    setExpanded(prev => {
      const next = new Set(prev);
      if (path.startsWith('/workspace/') || path.startsWith('/p/')) {
        next.add('workspace');
      }
      if (path.startsWith('/p/')) {
        next.add('projects');
      }
      return next;
    });
  }, [location.pathname]);

  const isWsExpanded = expanded.has('workspace');
  const isProjectsExpanded = expanded.has('projects');

  const getRoleBadge = (role?: string | null) => {
    switch (role) {
      case 'owner': return '👑';
      case 'admin': return '🛡️';
      case 'member': return '🎫';
      default: return '👽';
    }
  };

  const getVisibilityIcon = (v: string) => {
    switch (v) {
      case 'workspace_public': return <Globe className="w-3 h-3 opacity-50" />;
      case 'public_link': return <UsersIcon className="w-3 h-3 opacity-50" />;
      default: return <Lock className="w-3 h-3 opacity-50" />;
    }
  };

  // Navigation items
  const personalItems = [
    { name: 'Lịch', href: '/calendar', icon: CalendarDays },
    { name: 'Trao đổi', href: '/communication', icon: MessageSquare },
    { name: 'Tài khoản', href: '/personal-info', icon: UserCircle },
    { name: 'Mẹo', href: '/tips', icon: BookOpen },
    { name: 'Góp ý', href: '/feedback', icon: Lightbulb },
  ].filter(i => !hiddenNav.includes(i.href));

  const adminItems = [
    { name: 'Thành viên', href: '/members', icon: Users },
    { name: 'Sao lưu', href: '/admin/backup', icon: FolderArchive },
    { name: 'Quản trị', href: '/admin/system', icon: Shield },
    { name: 'Tiện ích', href: '/utilities', icon: Wrench },
  ].filter(i => !hiddenNav.includes(i.href));

  const isPathActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  const hasActiveChild = (paths: string[]) => paths.some(p => isPathActive(p));

  const wsChildPaths = ['/workspace/settings', '/workspace/members'];
  const projectPaths = projects.map(p => `/p/${p.slug || p.id}`);
  const isWsActive = hasActiveChild([...wsChildPaths, ...projectPaths, '/groups']);

  /* ─── Collapsed mode ─── */
  if (collapsed) {
    return (
      <div className="tree-nav">
        {/* Dashboard */}
        <TreeItemCollapsed icon={LayoutDashboard} label="Dashboard" href="/dashboard" active={isPathActive('/dashboard')} />

        {/* Workspace */}
        {isAvailable && activeWorkspace && (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button className={cn('sidebar-nav-item', isWsActive && 'active')}>
                    <Building2 className="nav-icon" strokeWidth={1.8} />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                <p className="font-medium">{activeWorkspace.name}</p>
                <p className="text-[10px] text-muted-foreground">{getRoleBadge(workspaceRole)} Workspace</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="right" align="start" className="w-56">
              {!isGuest && (
                <>
                  <DropdownMenuItem onClick={() => navigate('/workspace/settings')}>
                    <Eye className="w-3.5 h-3.5 mr-2" /> Tổng quan
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/workspace/members')}>
                    <Users className="w-3.5 h-3.5 mr-2" /> Thành viên WS
                  </DropdownMenuItem>
                </>
              )}
              {projects.map(p => (
                <DropdownMenuItem key={p.id} onClick={() => navigate(`/p/${p.slug || p.id}`)}>
                  <FolderKanban className="w-3.5 h-3.5 mr-2" />
                  <span className="truncate">{p.name}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Dự án */}
        <TreeItemCollapsed icon={FolderKanban} label="Dự án" href="/groups" active={isPathActive('/groups')} />

        {/* Personal */}
        {personalItems.map(item => (
          <TreeItemCollapsed key={item.href} icon={item.icon} label={item.name} href={item.href} active={isPathActive(item.href)} />
        ))}

        {/* Admin */}
        {isAdmin && adminItems.map(item => (
          <TreeItemCollapsed key={item.href} icon={item.icon} label={item.name} href={item.href} active={isPathActive(item.href)} />
        ))}
      </div>
    );
  }

  /* ─── Expanded mode ─── */
  return (
    <div className="tree-nav">
      {/* Dashboard */}
      <Link to="/dashboard" className={cn('sidebar-nav-item', isPathActive('/dashboard') && 'active')}>
        <LayoutDashboard className="nav-icon" strokeWidth={1.8} />
        <span className="nav-label">Dashboard</span>
      </Link>

      {/* Dự án (all projects page) */}
      <Link to="/groups" className={cn('sidebar-nav-item', location.pathname === '/groups' && 'active')}>
        <FolderKanban className="nav-icon" strokeWidth={1.8} />
        <span className="nav-label">Dự án</span>
      </Link>

      {/* ── Workspace tree ── */}
      {isAvailable && activeWorkspace && (
        <>
          <div className="sidebar-nav-separator" />
          <div className="sidebar-section-label">WORKSPACE</div>

          {/* Workspace header (collapsible) */}
          <button
            onClick={() => toggle('workspace')}
            className={cn(
              'sidebar-nav-item w-full text-left group',
              isWsActive && !isWsExpanded && 'semi-active'
            )}
          >
            <ChevronRight className={cn('nav-chevron', isWsExpanded && 'expanded')} />
            <Building2 className="nav-icon" strokeWidth={1.8} />
            <span className="nav-label flex-1 truncate">{activeWorkspace.name}</span>
            <span className="text-[10px] opacity-60 shrink-0">{getRoleBadge(workspaceRole)}</span>
            {workspaces.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <span className="text-[10px] opacity-40 hover:opacity-80 cursor-pointer px-0.5">⇅</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="w-52">
                  {workspaces.map(ws => (
                    <DropdownMenuItem key={ws.id} onClick={() => switchWorkspace(ws.id)}
                      className={cn(ws.id === activeWorkspace.id && 'bg-accent')}
                    >
                      <Building2 className="w-3.5 h-3.5 mr-2" />
                      <span className="truncate flex-1">{ws.name}</span>
                      <span className="text-[10px]">{getRoleBadge(ws.my_role)}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </button>

          {isGuest && (
            <div className="tree-guest-hint">
              👽 Bạn đang truy cập với vai trò khách mời
            </div>
          )}

          {/* Workspace children */}
          {isWsExpanded && (
            <div className="tree-children tree-level-1">
              {!isGuest && (
                <>
                  <Link to="/workspace/settings" className={cn('sidebar-nav-item', isPathActive('/workspace/settings') && 'active')}>
                    <span className="nav-label">Tổng quan</span>
                  </Link>
                  <Link to="/workspace/members" className={cn('sidebar-nav-item', isPathActive('/workspace/members') && 'active')}>
                    <span className="nav-label">Thành viên</span>
                  </Link>
                </>
              )}

              {/* Projects sub-tree */}
              {projects.length > 0 && (
                <>
                  <button
                    onClick={() => toggle('projects')}
                    className={cn(
                      'sidebar-nav-item w-full text-left',
                      hasActiveChild(projectPaths) && !isProjectsExpanded && 'semi-active'
                    )}
                  >
                    <ChevronRight className={cn('nav-chevron', isProjectsExpanded && 'expanded')} />
                    <span className="nav-label">Dự án</span>
                    <span className="text-[10px] opacity-40">{projects.length}</span>
                  </button>

                  {isProjectsExpanded && (
                    <div className="tree-children tree-level-2">
                      {projects.map(p => {
                        const href = `/p/${p.slug || p.id}`;
                        const active = location.pathname.startsWith(href);
                        return (
                          <Link
                            key={p.id}
                            to={href}
                            className={cn('sidebar-nav-item', active && 'active', !p.isMember && 'opacity-60')}
                          >
                            <span className="nav-label truncate">{p.name}</span>
                            {!p.isMember && (
                              <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground shrink-0">Mới</span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Personal section ── */}
      {personalItems.length > 0 && (
        <>
          <div className="sidebar-nav-separator" />
          <div className="sidebar-section-label">CÁ NHÂN</div>
          {personalItems.map(item => (
            <Link key={item.href} to={item.href} className={cn('sidebar-nav-item', isPathActive(item.href) && 'active')}>
              <item.icon className="nav-icon" strokeWidth={1.8} />
              <span className="nav-label">{item.name}</span>
            </Link>
          ))}
        </>
      )}

      {/* ── Admin section ── */}
      {isAdmin && adminItems.length > 0 && (
        <>
          <div className="sidebar-nav-separator" />
          <div className="sidebar-section-label">QUẢN TRỊ</div>
          {adminItems.map(item => (
            <Link key={item.href} to={item.href} className={cn('sidebar-nav-item', isPathActive(item.href) && 'active')}>
              <item.icon className="nav-icon" strokeWidth={1.8} />
              <span className="nav-label">{item.name}</span>
            </Link>
          ))}
        </>
      )}
    </div>
  );
}

/* ─── Helper: collapsed single item with tooltip ─── */
function TreeItemCollapsed({ icon: Icon, label, href, active }: { icon: any; label: string; href: string; active: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link to={href} className={cn('sidebar-nav-item', active && 'active')}>
          <Icon className="nav-icon" strokeWidth={1.8} />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={12}>
        <p className="font-medium">{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
