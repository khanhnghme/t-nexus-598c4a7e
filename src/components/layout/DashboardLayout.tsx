import { ReactNode, useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardLayoutContext } from '@/contexts/DashboardLayoutContext';
import UserAvatar from '@/components/UserAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  LayoutDashboard,
  FolderKanban,
  CalendarDays,
  LogOut,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Key,
  Menu,
  X,
  Users,
  BookOpen,
  Lightbulb,
  FolderArchive,
  MessageSquare,
  UserCircle,
  Shield,
  Moon,
  Sun,
  Wrench,
} from 'lucide-react';
import SidebarTreeNav from '@/components/SidebarTreeNav';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import tNexusLogo from '@/assets/t-nexus-logo.png';
import tNexusTextWhite from '@/assets/t-nexus-text-white.png';
import UserChangePasswordDialog from '@/components/UserChangePasswordDialog';
import NotificationBell from '@/components/NotificationBell';
import AvatarUpload from '@/components/AvatarUpload';
import AIAssistantButton from '@/components/ai/AIAssistantButton';
import MusicPlayer from '@/components/MusicPlayer';
import NetworkDiagnostic from '@/components/NetworkDiagnostic';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { useLoginStreak } from '@/hooks/useLoginStreak';
// WorkspaceSwitcher and SidebarProjects replaced by SidebarTreeNav

/* ------------------------------------------------------------------ */
/*  Theme toggle (sidebar-friendly)                                    */
/* ------------------------------------------------------------------ */
function SidebarThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
        >
          {isDark
            ? <Moon className="w-[1.05rem] h-[1.05rem]" />
            : <Sun className="w-[1.05rem] h-[1.05rem]" />}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={8}>
        <p>{isDark ? 'Chế độ sáng' : 'Chế độ tối'}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/* ------------------------------------------------------------------ */
/*  Keyboard shortcut map                                              */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Keyboard shortcut map                                              */
/* ------------------------------------------------------------------ */
const shortcutMap: Record<string, string> = {
  d: '/dashboard',
  p: '/groups',
  l: '/calendar',
  m: '/communication',
};

/* ------------------------------------------------------------------ */
/*  Layout component                                                   */
/* ------------------------------------------------------------------ */
interface DashboardLayoutProps {
  children?: ReactNode;
  projectId?: string;
  projectName?: string;
  zaloLink?: string | null;
  useOutlet?: boolean;
}

export default function DashboardLayout({
  children,
  projectId,
  projectName,
  zaloLink,
  useOutlet,
}: DashboardLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, isAdmin, isLeader, signOut, refreshProfile } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useDashboardLayoutContext();

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const hiddenNav = Array.isArray(profile?.nav_hidden_pages)
    ? (profile.nav_hidden_pages as string[])
    : [];

  // Activity tracking & streak
  useActivityTracker(user?.id);
  const streak = useLoginStreak(user?.id);

  useEffect(() => {
    const handler = () => refreshProfile();
    window.addEventListener('nav-visibility-changed', handler);
    return () => window.removeEventListener('nav-visibility-changed', handler);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Keyboard shortcuts (⌘/Ctrl + key)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (!(e.metaKey || e.ctrlKey)) return;

      const key = e.key.toLowerCase();
      const dest = shortcutMap[key];
      if (dest) {
        e.preventDefault();
        navigate(dest);
      }
      // ⌘K → focus search (global)
      if (key === 'k') {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getRoleText = () => {
    if (isAdmin) return 'OwnerSystem';
    if (isLeader) return 'Thành viên NC';
    return 'Thành viên';
  };

  // Keep nav items for search dialog
  const allSearchItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, shortcut: '⌘D' },
    { name: 'Dự án', href: '/groups', icon: FolderKanban, shortcut: '⌘P' },
    { name: 'Lịch', href: '/calendar', icon: CalendarDays, shortcut: '⌘L' },
    { name: 'Trao đổi', href: '/communication', icon: MessageSquare, shortcut: '⌘M' },
    { name: 'Tài khoản', href: '/personal-info', icon: UserCircle },
    { name: 'Mẹo', href: '/tips', icon: BookOpen },
    { name: 'Góp ý', href: '/feedback', icon: Lightbulb },
    ...(isAdmin ? [
      { name: 'Thành viên', href: '/members', icon: Users },
      { name: 'Sao lưu', href: '/admin/backup', icon: FolderArchive },
      { name: 'Quản trị', href: '/admin/system', icon: Shield },
      { name: 'Tiện ích', href: '/utilities', icon: Wrench },
    ] : []),
  ].filter(i => !hiddenNav.includes(i.href));
  /* ---------------------------------------------------------------- */
  return (
    <>
      {/* -------- Mobile overlay backdrop -------- */}
      <div
        className={`sidebar-mobile-backdrop ${isMobileOpen ? 'visible' : ''}`}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* -------- Mobile top bar -------- */}
      <div className="dashboard-mobile-topbar">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="flex items-center justify-center w-10 h-10 rounded-lg"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Link to="/dashboard" className="flex items-center gap-2">
          <img src={tNexusLogo} alt="T-Nexus" className="h-7 w-7" />
          <img src={tNexusTextWhite} alt="T-Nexus" className="h-4 w-auto mobile-logo-text" />
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
        </div>
      </div>

      {/* -------- Sidebar -------- */}
      <TooltipProvider delayDuration={0}>
        <aside
          className={`dashboard-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}
        >
          {/* Logo */}
          <div className="sidebar-logo">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 min-w-0"
            >
              <img
                src={tNexusLogo}
                alt="T-Nexus"
                className="h-7 w-7 shrink-0"
              />
              <span className="sidebar-logo-text whitespace-nowrap overflow-hidden">
                <img
                  src={tNexusTextWhite}
                  alt="T-Nexus"
                  className="h-[15px] w-auto max-w-full"
                />
              </span>
            </Link>

            <div className={`ml-auto flex items-center gap-1 transition-opacity ${sidebarCollapsed ? 'hidden' : 'opacity-100'}`}>
              <NetworkDiagnostic />
              <MusicPlayer showDisc />
              <SidebarThemeToggle />
              <NotificationBell />
            </div>

            {/* Desktop toggle */}
            <button
              className={cn(
                "hidden md:flex items-center justify-center transition-all bg-background border border-border shadow-sm text-muted-foreground hover:text-foreground hover:bg-muted z-50",
                sidebarCollapsed
                  ? "absolute -right-3.5 top-6 w-7 h-7 rounded-full"
                  : "sidebar-toggle-btn ml-auto relative"
              )}
              onClick={toggleSidebar}
              title={sidebarCollapsed ? 'Mở rộng' : 'Thu gọn'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronLeft className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Mobile close */}
            <button
              className="sidebar-toggle-btn ml-auto md:hidden"
              onClick={() => setIsMobileOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation — Tree Nav (workspace switcher is inside) */}

          {/* Scrollable navigation — Tree Nav */}
          <div className="sidebar-nav-scroll">
            <SidebarTreeNav collapsed={sidebarCollapsed} />
          </div>

          {/* Bottom section */}
          <div className="sidebar-bottom">
            {/* User profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="sidebar-user-profile">
                  <UserAvatar
                    src={profile?.avatar_url}
                    name={profile?.full_name}
                    size="sm"
                    className="border border-white/20 shrink-0"
                  />
                  <div className="user-info">
                    <div className="user-name">
                      {profile?.full_name || 'Đang tải...'}
                    </div>
                    <div className="user-role">{getRoleText()}</div>
                  </div>
                  <ChevronDown
                    className="user-chevron w-3.5 h-3.5 ml-auto shrink-0"
                    style={{ color: 'var(--_sb-muted)' }}
                  />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-56 mb-1"
              >
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold">{profile?.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {profile?.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      MSSV: {profile?.student_id}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsProfileOpen(true)}>
                  <UserCircle className="w-4 h-4 mr-2" />
                  Cập nhật ảnh đại diện
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsChangePasswordOpen(true)}
                >
                  <Key className="w-4 h-4 mr-2" />
                  Đổi mật khẩu
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>
      </TooltipProvider>

      {/* -------- Content area -------- */}
      <div
        className={`dashboard-content-area ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}
      >
        <div className="max-w-[1100px] mx-auto px-12 py-8">
          {useOutlet ? <Outlet /> : children}
        </div>
      </div>

      {/* -------- Dialogs -------- */}
      <UserChangePasswordDialog
        open={isChangePasswordOpen}
        onOpenChange={setIsChangePasswordOpen}
      />

      <Dialog open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cập nhật ảnh đại diện</DialogTitle>
            <DialogDescription>
              Nhấn vào ảnh để tải lên ảnh mới (tối đa 5MB)
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <AvatarUpload
              currentAvatarUrl={profile?.avatar_url}
              fullName={profile?.full_name || ''}
              size="lg"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Global Search Dialog */}
      <CommandDialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <CommandInput placeholder="Tìm kiếm trang & tính năng..." />
        <CommandList>
          <CommandEmpty>Không tìm thấy kết quả.</CommandEmpty>
          <CommandGroup heading="Tính năng">
            {allSearchItems.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => {
                  navigate(item.href);
                  setIsSearchOpen(false);
                }}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.name}</span>
                {'shortcut' in item && item.shortcut && <span className="ml-auto text-xs text-muted-foreground">{item.shortcut}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* AI Assistant */}
      <AIAssistantButton
        projectId={projectId}
        projectName={projectName}
        zaloLink={zaloLink}
      />
    </>
  );
}
