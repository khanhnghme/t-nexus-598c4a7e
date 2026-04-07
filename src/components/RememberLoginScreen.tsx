import { useNavigate } from 'react-router-dom';
import { TNexusLogo } from '@/components/TNexusLogo';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { LogOut, ArrowRight } from 'lucide-react';
import bgImg from '@/assets/remember-login-bg.jpg';
import type { Profile, AppRole } from '@/types/database';
import { getSystemRoleLabel } from '@/lib/roleLabels';

interface RememberLoginScreenProps {
  profile: Profile;
  roles: AppRole[];
  onLogout: () => void;
}

function getRoleBadgeStyle(role: AppRole) {
  switch (role) {
    case 'owner_system':
      return 'bg-red-600 text-white shadow-sm shadow-red-600/30';
    case 'project_admin':
      return 'bg-primary text-primary-foreground shadow-sm shadow-primary/30';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export default function RememberLoginScreen({ profile, roles, onLogout }: RememberLoginScreenProps) {
  const navigate = useNavigate();
  const isAdvancedMember = roles.includes('system_admin') || roles.includes('system_owner');
  const [countdown, setCountdown] = useState(10);

  const initials = profile.full_name
    ?.split(' ')
    .map((w) => w[0])
    .join('')
    .slice(-2)
    .toUpperCase() || '?';

  const handleContinue = useCallback(() => {
    navigate('/dashboard');
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('t-nexus_remember_login');
    onLogout();
  };

  // Auto-continue countdown
  useEffect(() => {
    if (countdown <= 0) {
      handleContinue();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, handleContinue]);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left — Background Image (2/3) */}
      <div className="hidden lg:block lg:w-[66%] relative overflow-hidden">
        <img src={bgImg} alt="Background" className="absolute inset-0 w-full h-full object-cover" />
        <div className={`absolute inset-0 ${isAdvancedMember ? 'bg-gradient-to-r from-amber-500/30 via-yellow-400/20 to-background/70' : 'bg-gradient-to-r from-black/10 via-transparent to-background/70'}`} />
        <div className={`absolute inset-0 ${isAdvancedMember ? 'bg-gradient-to-t from-amber-600/30 via-transparent to-transparent' : 'bg-gradient-to-t from-black/30 via-transparent to-transparent'}`} />
      </div>

      {/* Right — Session Confirmation (1/3) */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-sm space-y-7">
          {/* Logo & Title */}
          <div className="flex flex-col items-center gap-2 text-center">
            <TNexusLogo variant="text" width={140} />
            <div className="mt-2 space-y-1">
              <h1 className="text-xl font-heading font-bold text-foreground">
                Xác minh tài khoản
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Phiên đăng nhập trước đó vẫn còn hiệu lực.<br />
                Xác minh danh tính để tiếp tục sử dụng <span className="font-semibold text-foreground">T-Nexus</span>.
              </p>
            </div>
          </div>

          {/* User Card */}
          <div className={`border rounded-xl shadow-sm overflow-hidden ${isAdvancedMember ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700' : 'bg-card border-border'}`}>
            {/* Avatar + Name + Roles */}
            <div className="px-5 pt-5 pb-4 flex flex-col items-center text-center gap-3">
              <div className="relative">
                <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name} />
                  <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-card" />
              </div>
              <div className="space-y-1.5">
                <h2 className="font-heading font-bold text-lg text-foreground leading-tight">
                  {profile.full_name}
                </h2>
                <div className="flex flex-wrap justify-center gap-1">
                  {roles.map((role) => (
                    <Badge
                      key={role}
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border-0 ${getRoleBadgeStyle(role)}`}
                    >
                      {getSystemRoleLabel(role)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Info chips */}
            <div className="border-t border-border bg-muted/20 px-5 py-4 flex flex-col gap-2.5">
              {profile.institution && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-12 shrink-0 font-medium">ĐVĐT</span>
                  <span className="text-sm text-foreground font-medium truncate">{profile.institution}</span>
                </div>
              )}
              {profile.student_id && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-12 shrink-0 font-medium">MSSV</span>
                  <span className="text-sm text-foreground font-semibold tracking-wide">{profile.student_id}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-12 shrink-0 font-medium">Email</span>
                <span className="text-sm text-foreground font-medium truncate">{profile.email}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button
              onClick={handleContinue}
              className="w-full h-11 font-semibold gap-2 rounded-lg shadow-md relative overflow-hidden"
            >
              {/* Countdown progress bar */}
              <div
                className="absolute inset-0 bg-primary-foreground/10 origin-left transition-transform duration-1000 ease-linear"
                style={{ transform: `scaleX(${countdown / 10})` }}
              />
              <span className="relative flex items-center gap-2">
                Tiếp tục vào hệ thống ({countdown}s)
                <ArrowRight className="w-4 h-4" />
              </span>
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full h-10 gap-2 rounded-lg text-muted-foreground"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </Button>
          </div>

          {/* Footer */}
          <p className="text-center text-[10px] text-muted-foreground/50">
            © 2025 T-Nexus {'— ETT'}
          </p>
        </div>
      </div>
    </div>
  );
}
