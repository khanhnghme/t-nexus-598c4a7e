import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { AuthForm } from '@/components/AuthForm';
import RememberLoginScreen from '@/components/RememberLoginScreen';
import { useAuth } from '@/contexts/AuthContext';
import LoadingScreen from '@/components/LoadingScreen';

export default function Auth() {
  const { user, profile, roles, isLoading: authLoading, signOut } = useAuth();

  if (authLoading) return <LoadingScreen message="Đang kiểm tra hệ thống..." />;

  // If user has active session + remember flag → show session confirmation screen
  const hasRememberFlag = localStorage.getItem('t-nexus_remember_login') === 'true';
  if (user && profile && profile.is_approved && hasRememberFlag) {
    return (
      <RememberLoginScreen
        profile={profile}
        roles={roles}
        onLogout={async () => {
          await signOut();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col">
      {/* Header */}
      <header className="bg-card border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Trang chủ
            </Button>
          </Link>
          <span className="hidden sm:inline font-heading text-sm text-muted-foreground">
            T-Nexus
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-y-auto flex items-start sm:items-center justify-center p-4">
        <AuthForm />
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-sm text-muted-foreground bg-card">
        © 2025 T-Nexus
      </footer>
    </div>
  );
}
