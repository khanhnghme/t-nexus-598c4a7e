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
  Plus,
  Eye,
  ChevronsUpDown,
  Check,
  FolderOpen,
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
  DropdownMenuSeparator,
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
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // Auto-expand projects when on project page
  useEffect(() => {
    const path = location.pathname;
    if (path === '/workspace/new') return;
    setExpanded(prev => {
      const next = new Set(prev);
      if (path.startsWith('/p/')) {
        next.add('projects');
      }
      return next;
    });
  }, [location.pathname]);

  const isProjectsExpanded = expanded.has('projects');

  const getRoleBadge = (role?: string | null) => {
    switch (role) {
      case 'workspace_owner': return '👑';
      case 'workspace_admin': return '🛡️';
      case 'workspace_member': return '🎫';
      case 'workspace_guest': return '👽';
      default: return '👽';
    }
  };

  const getRoleLabel = (role?: string | null) => {
    switch (role) {
      case 'workspace_owner': return 'Owner';
      case 'workspace_admin': return 'Admin';
      case 'workspace_member': return 'Member';
      case 'workspace_guest': return 'Guest';
      default: return '';
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
  const projectPaths = projects.map(p => `/p/${p.slug || p.id}`);

  /* ─── Collapsed mode ─── */
  if (collapsed) {
    return (
      <div className="tree-nav">
        {/* Workspace switcher - collapsed */}
        {isAvailable && activeWorkspace && (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button className="sidebar-nav-item ws-switcher-collapsed">
                    <div className="ws-avatar-mini">
                      {activeWorkspace.name.charAt(0).toUpperCase()}
                    </div>
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                <p className="font-medium">{activeWorkspace.name}</p>
                <p className="text-[10px] text-muted-foreground">{getRoleBadge(workspaceRole)} {getRoleLabel(workspaceRole)}</p>
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent side="right" align="start" className="w-56">
              {workspaces.map(ws => (
                <DropdownMenuItem
                  key={ws.id}
                  onClick={() => switchWorkspace(ws.id)}
                  className={cn(ws.id === activeWorkspace.id && 'bg-accent')}
                >
                  <div className="ws-avatar-mini mr-2 text-[10px]">
                    {ws.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate flex-1">{ws.name}</span>
                  {ws.id === activeWorkspace.id && <Check className="w-3.5 h-3.5 ml-1 text-primary" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/workspace/new')}>
                <Plus className="w-3.5 h-3.5 mr-2" />
                Tạo Workspace mới
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Dashboard */}
        <TreeItemCollapsed icon={LayoutDashboard} label="Dashboard" href="/dashboard" active={isPathActive('/dashboard')} />

        {/* All Projects */}
        <TreeItemCollapsed icon={FolderKanban} label="Dự án" href="/groups" active={isPathActive('/groups')} />

        {/* Workspace pages */}
        {isAvailable && activeWorkspace && !isGuest && (
          <>
            <TreeItemCollapsed icon={Eye} label="Tổng quan WS" href="/workspace/settings" active={isPathActive('/workspace/settings')} />
            <TreeItemCollapsed icon={Users} label="Thành viên WS" href="/workspace/members" active={isPathActive('/workspace/members')} />
          </>
        )}

        <div className="sidebar-nav-separator" />

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
      {/* ══ Workspace Switcher ══ */}
      {isAvailable && activeWorkspace && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ws-switcher">
              <div className="ws-avatar">
                {activeWorkspace.name.charAt(0).toUpperCase()}
              </div>
              <div className="ws-switcher-info">
                <span className="ws-switcher-name">{activeWorkspace.name}</span>
                <span className="ws-switcher-role">
                  {getRoleBadge(workspaceRole)} {getRoleLabel(workspaceRole)}
                </span>
              </div>
              <ChevronsUpDown className="w-3.5 h-3.5 ml-auto shrink-0 opacity-40" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] min-w-56">
            <div className="px-2 py-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Workspaces</p>
            </div>
            {workspaces.map(ws => (
              <DropdownMenuItem
                key={ws.id}
                onClick={() => switchWorkspace(ws.id)}
                className={cn('gap-2', ws.id === activeWorkspace.id && 'bg-accent')}
              >
                <div className="ws-avatar-mini">
                  {ws.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="truncate text-sm font-medium">{ws.name}</span>
                  <span className="text-[10px] text-muted-foreground">{getRoleBadge(ws.my_role)} {getRoleLabel(ws.my_role)}</span>
                </div>
                {ws.id === activeWorkspace.id && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/workspace/new')} className="gap-2">
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo Workspace mới</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {isGuest && (
        <div className="tree-guest-hint">
          👽 Bạn đang truy cập với vai trò khách mời
        </div>
      )}

      {/* ══ Workspace Navigation ══ */}
      {isAvailable && activeWorkspace && (
        <div className="ws-nav-section">
          {/* Dashboard */}
          <Link to="/dashboard" className={cn('sidebar-nav-item', isPathActive('/dashboard') && 'active')}>
            <LayoutDashboard className="nav-icon" strokeWidth={1.8} />
            <span className="nav-label">Dashboard</span>
          </Link>

          {/* Workspace management - only for non-guest */}
          {!isGuest && (
            <>
              <Link to="/workspace/settings" className={cn('sidebar-nav-item', isPathActive('/workspace/settings') && 'active')}>
                <Eye className="nav-icon" strokeWidth={1.8} />
                <span className="nav-label">Tổng quan</span>
              </Link>
              <Link to="/workspace/members" className={cn('sidebar-nav-item', isPathActive('/workspace/members') && 'active')}>
                <Users className="nav-icon" strokeWidth={1.8} />
                <span className="nav-label">Thành viên</span>
              </Link>
            </>
          )}

          {/* Projects sub-tree */}
          <button
            onClick={() => toggle('projects')}
            className={cn(
              'sidebar-nav-item w-full text-left group',
              hasActiveChild(projectPaths) && !isProjectsExpanded && 'semi-active'
            )}
          >
            <ChevronRight className={cn('nav-chevron', isProjectsExpanded && 'expanded')} />
            <FolderKanban className="nav-icon" strokeWidth={1.8} />
            <span className="nav-label">Dự án</span>
            <span className="text-[10px] opacity-40 tabular-nums">{projects.length}</span>
          </button>

          {isProjectsExpanded && (
            <div className="tree-children tree-level-1">
              {/* View all projects link */}
              <Link
                to="/groups"
                className={cn('sidebar-nav-item', location.pathname === '/groups' && 'active')}
              >
                <span className="nav-label text-muted-foreground">Xem tất cả</span>
              </Link>

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
        </div>
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
