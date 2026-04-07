import { useEffect, useState, useCallback } from 'react';
import { TNexusLogo } from '@/components/TNexusLogo';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, Shield, Mail } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';


const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export function AdminAuthForm() {
  const navigate = useNavigate();
  const { signIn, user, roles } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const isAdminOrLeader = roles.includes('owner_system') || roles.includes('leader');


  useEffect(() => {
    if (user && isAdminOrLeader) {
      navigate('/dashboard');
    }
  }, [user, isAdminOrLeader, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[String(err.path[0])] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      toast({
        title: 'Đăng nhập thất bại',
        description: 'Email hoặc mật khẩu không chính xác.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Đăng nhập thành công',
      description: 'Chào mừng bạn quay lại!',
    });
    navigate('/dashboard');
  };


  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex flex-col items-center gap-2">
        <TNexusLogo variant="text" width={200} />
        <span className="font-heading font-semibold text-primary flex items-center gap-1">
          <Shield className="w-4 h-4" /> T-Nexus - Quản trị
        </span>
      </div>
      <Card className="w-full shadow-card-lg border-border/50">
        <CardHeader className="text-center pb-2">
          <CardTitle className="font-heading text-2xl">Đăng nhập Quản trị</CardTitle>
          <CardDescription>
            Nhập email và mật khẩu tài khoản quản trị
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="p-3 bg-primary/10 rounded-lg text-sm text-center">
              <Shield className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="font-medium text-primary">Dành cho Admin / Leader</p>
              <p className="text-muted-foreground text-xs">Quản lý toàn bộ hệ thống</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="Nhập email quản trị"
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Mật khẩu <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="Nhập mật khẩu"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>
            <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
              Đăng nhập
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
