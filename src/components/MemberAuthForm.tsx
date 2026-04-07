import { useEffect, useState, useRef, useMemo } from 'react';
import { TNexusLogo } from '@/components/TNexusLogo';
import { OtpVerifyScreen } from '@/components/OtpVerifyScreen';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

import { useToast } from '@/hooks/use-toast';
import { Loader2, Hash, Lock, Users, Mail, User, UserPlus, LogIn, FileText, Shield, KeyRound, AlertTriangle, GraduationCap, Check, ChevronsUpDown, CheckCircle2 } from 'lucide-react';
import uehLogoWhite from '@/assets/t-nexus-text-white.png';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { INSTITUTIONS, REGIONS, searchInstitutions } from '@/lib/institutions';
import { cn } from '@/lib/utils';

import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

const loginSchema = z.object({
  identifier: z.string().min(1, 'Vui lòng nhập MSSV hoặc Email'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
});

const registerSchema = z.object({
  studentId: z.string().min(1, 'Vui lòng nhập MSSV').max(20, 'MSSV tối đa 20 ký tự'),
  fullName: z.string().min(1, 'Vui lòng nhập họ tên').max(100, 'Họ tên tối đa 100 ký tự'),
  institution: z.string().min(1, 'Vui lòng chọn đơn vị đào tạo'),
  email: z.string().email('Email không hợp lệ').max(255, 'Email tối đa 255 ký tự'),
  password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự'),
  confirmPassword: z.string().min(6, 'Xác nhận mật khẩu tối thiểu 6 ký tự'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
});

function PolicyCheckbox({
  checked,
  onCheckedChange,
  policyContent,
  policyUpdatedAt,
  error,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  policyContent: string;
  policyUpdatedAt: string | null;
  error?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Checkbox
          id="policy-agree"
          checked={checked}
          onCheckedChange={(v) => onCheckedChange(v === true)}
          className="shrink-0 h-3.5 w-3.5 rounded-full border border-muted-foreground/40 data-[state=checked]:border-primary data-[state=checked]:bg-transparent transition-all duration-200 [&_svg]:h-3 [&_svg]:w-3 [&_svg]:text-primary"
        />
        <div className="text-xs leading-none flex items-baseline gap-1 flex-wrap">
          <label htmlFor="policy-agree" className="cursor-pointer">
            Tôi đồng ý với
          </label>
          <Dialog>
            <DialogTrigger asChild>
              <button type="button" className="text-warning hover:underline font-semibold">
                Chính sách hệ thống
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] w-[1280px] h-[720px] max-h-[90vh] p-0 overflow-hidden flex flex-col border-0 shadow-2xl">
              <DialogDescription className="sr-only">
                Nội dung chính sách hệ thống T-Nexus.
              </DialogDescription>
              {/* Header with UEH branding */}
              <div className="relative shrink-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-accent" />
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }} />
                <div className="relative px-6 py-5 flex items-center gap-4">
                  <div className="p-2 rounded-xl">
                                          <img src={uehLogoWhite} alt="Logo" style={{ width: 56, height: 'auto' }} />
                  </div>
                  <div className="text-primary-foreground">
                    <DialogTitle className="text-xl font-bold">Chính sách hệ thống</DialogTitle>
                    <p className="text-sm opacity-80">
                      T-Nexus — Vui lòng đọc kỹ các điều khoản trước khi sử dụng
                    </p>
                  </div>
                  {policyUpdatedAt && (
                    <Badge className="ml-auto bg-white/20 text-primary-foreground border-0 backdrop-blur-sm text-xs">
                      Cập nhật: {format(new Date(policyUpdatedAt), "dd/MM/yyyy", { locale: vi })}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-8 py-6">
                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-primary prose-h1:text-2xl prose-h1:border-b prose-h1:border-primary/20 prose-h1:pb-3 prose-h2:text-lg prose-h2:mt-6 prose-a:text-accent prose-strong:text-foreground">
                  {policyContent ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{policyContent}</ReactMarkdown>
                  ) : (
                    <div className="text-center py-16">
                      <FileText className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                      <p className="text-muted-foreground">Chưa có nội dung chính sách.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t bg-muted/30 shrink-0 flex items-center justify-between">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" />
                  {policyUpdatedAt
                    ? `Cập nhật lần cuối: ${format(new Date(policyUpdatedAt), "HH:mm 'ngày' dd/MM/yyyy", { locale: vi })}`
                    : 'T-Nexus'}
                </p>
                <p className="text-[10px] text-muted-foreground">© T-Nexus</p>
              </div>
            </DialogContent>
          </Dialog>
          {policyUpdatedAt && (
            <span className="text-[10px] text-muted-foreground leading-none">· {format(new Date(policyUpdatedAt), "dd/MM/yyyy", { locale: vi })}</span>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-destructive ml-6">{error}</p>}
    </div>
  );
}

export function MemberAuthForm() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isEmailVerified = searchParams.get('verified') === 'true';
  const { signUp, signIn, user, profile, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [registerSuccess, setRegisterSuccess] = useState<false | 'pending' | 'approved' | 'verify_email'>(false);
  const isRegisteringRef = useRef(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotEmailInput, setForgotEmailInput] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotStep, setForgotStep] = useState<'input' | 'otp' | 'newpass' | 'done'>('input');
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  // Login fields
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loginPolicyAgreed, setLoginPolicyAgreed] = useState(true);
  const [rememberLogin, setRememberLogin] = useState(true);

  // Register fields
  const [regStudentId, setRegStudentId] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regInstitution, setRegInstitution] = useState('');
  const [regInstitutionOpen, setRegInstitutionOpen] = useState(false);
  const [regInstitutionSearch, setRegInstitutionSearch] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUserId, setRegUserId] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regPolicyAgreed, setRegPolicyAgreed] = useState(false);

  // Policy
  const [policyContent, setPolicyContent] = useState('');
  const [policyUpdatedAt, setPolicyUpdatedAt] = useState<string | null>(null);
  
  // Login animation - always enabled
  const loginAnimEnabled = true;
  const pendingLoginTransitionRef = useRef(false);

  useEffect(() => {
    if (user && profile) {
      if (profile.is_approved) {
        // Don't navigate if pending login transition setup or during registration
        if (pendingLoginTransitionRef.current || isRegisteringRef.current) return;
        navigate('/dashboard');
      }
    }
  }, [user, profile, navigate]);

  // Fetch policy
  useEffect(() => {
    const fetchPolicy = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'system_policy')
        .maybeSingle();
      if (data?.value) {
        const val = data.value as { content?: string; updated_at?: string };
        setPolicyContent(val.content ?? '');
        setPolicyUpdatedAt(val.updated_at ?? null);
      }
    };
    fetchPolicy();
  }, []);


  // If logged in but not approved, show pending screen (skip during registration flow)
  if (user && profile && !profile.is_approved && !isRegisteringRef.current) {
    return (
      <div className="w-full max-w-md">
      <div className="mb-6 flex flex-col items-center gap-2">
          <TNexusLogo variant="text" width={120} />
          <span className="font-heading font-semibold text-primary flex items-center gap-1">
            <Users className="w-4 h-4" /> T-Nexus
          </span>
        </div>
        <Card className="w-full shadow-card-lg border-border/50">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="text-xl font-heading font-semibold">Tài khoản đang chờ duyệt</h2>
            <p className="text-sm text-muted-foreground">
              Tài khoản của bạn đã được tạo thành công. Vui lòng chờ Admin xét duyệt trước khi sử dụng hệ thống.
            </p>
            <div className="bg-muted/50 rounded-lg p-3 text-left text-sm space-y-1">
              <p><span className="text-muted-foreground">Họ tên:</span> <span className="font-medium">{profile.full_name}</span></p>
              <p><span className="text-muted-foreground">MSSV:</span> <span className="font-medium">{profile.student_id}</span></p>
              <p><span className="text-muted-foreground">Email:</span> <span className="font-medium">{profile.email}</span></p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                await supabase.auth.signOut({ scope: 'local' });
                window.location.reload();
              }}
            >
              Đăng xuất
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!loginPolicyAgreed) {
      setErrors({ policy: 'Vui lòng đồng ý với Chính sách hệ thống để tiếp tục' });
      return;
    }

    const result = loginSchema.safeParse({ identifier, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    const input = identifier.trim();
    const isEmail = input.includes('@');
    
    try {
      let loginEmail = input;
      let profileQuery: 'email' | 'student_id' = isEmail ? 'email' : 'student_id';

      if (!isEmail) {
        // MSSV path: lookup email
        const { data: foundEmail, error: lookupError } = await supabase
          .rpc('get_email_by_student_id', { _student_id: input });

        if (lookupError) {
          setIsLoading(false);
          toast({ title: 'Lỗi hệ thống', description: 'Không thể kiểm tra MSSV.', variant: 'destructive' });
          return;
        }

        if (!foundEmail) {
          setIsLoading(false);
          toast({
            title: 'MSSV không tồn tại',
            description: 'Mã số sinh viên này chưa được đăng ký trong hệ thống. Bạn có thể chuyển sang tab "Tạo tài khoản" để đăng ký.',
            variant: 'destructive',
          });
          return;
        }
        loginEmail = foundEmail;
      }

      // Check approval
      const { data: profileData } = await supabase
        .from('profiles')
        .select('is_approved, full_name')
        .eq(profileQuery, input)
        .maybeSingle();

      if (profileData && !profileData.is_approved) {
        setIsLoading(false);
        toast({
          title: 'Tài khoản chờ duyệt',
          description: 'Tài khoản của bạn đã được tạo nhưng đang chờ Admin xét duyệt. Vui lòng thử lại sau.',
        });
        return;
      }

      if (isEmail && !profileData) {
        setIsLoading(false);
        toast({
          title: 'Email không tồn tại',
          description: 'Email này chưa được đăng ký trong hệ thống. Bạn có thể chuyển sang tab "Tạo tài khoản" để đăng ký.',
          variant: 'destructive',
        });
        return;
      }

      // Set ref BEFORE signIn to prevent race condition with useEffect navigation
      if (loginAnimEnabled) {
        pendingLoginTransitionRef.current = true;
      }

      const { error } = await signIn(loginEmail, password);
      setIsLoading(false);

      if (error) {
        pendingLoginTransitionRef.current = false;
        toast({
          title: 'Đăng nhập thất bại',
          description: error.message === 'Invalid login credentials' ? 'MSSV/Email hoặc mật khẩu không đúng' : error.message,
          variant: 'destructive',
        });
      } else {
        // Save remember login preference
        if (rememberLogin) {
          localStorage.setItem('t-nexus_remember_login', 'true');
        } else {
          localStorage.removeItem('t-nexus_remember_login');
        }
        toast({ title: 'Đăng nhập thành công', description: 'Chào mừng bạn quay lại!' });
        if (loginAnimEnabled) {
          sessionStorage.setItem('login_transition', JSON.stringify({
            userName: profileData?.full_name || '',
          }));
        }
        pendingLoginTransitionRef.current = false;
        navigate('/dashboard');
      }
    } catch (err) {
      setIsLoading(false);
      toast({ title: 'Lỗi hệ thống', description: 'Có lỗi xảy ra. Vui lòng thử lại sau.', variant: 'destructive' });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!regPolicyAgreed) {
      setErrors({ policy: 'Vui lòng đồng ý với Chính sách hệ thống để đăng ký' });
      return;
    }

    const result = registerSchema.safeParse({
      studentId: regStudentId,
      fullName: regFullName,
      institution: regInstitution,
      email: regEmail,
      password: regPassword,
      confirmPassword: regConfirmPassword,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const { data: existingEmail } = await supabase
        .rpc('get_email_by_student_id', { _student_id: regStudentId.trim() });

      if (existingEmail) {
        setIsLoading(false);
        toast({ title: 'MSSV đã tồn tại', description: 'Mã số sinh viên này đã được đăng ký trong hệ thống.', variant: 'destructive' });
        return;
      }

      // Set flag to prevent useEffect from navigating during signup flow
      isRegisteringRef.current = true;
      const { data: signUpData, error } = await signUp(regEmail.trim(), regPassword, regStudentId.trim(), regFullName.trim(), regInstitution);

      if (error) {
        isRegisteringRef.current = false;
        setIsLoading(false);
        const msg = error.message?.toLowerCase() || '';
        if (msg.includes('already registered') || msg.includes('already exists')) {
          toast({ title: 'Email đã tồn tại', description: 'Email này đã được sử dụng. Vui lòng dùng email khác.', variant: 'destructive' });
        } else {
          toast({ title: 'Đăng ký thất bại', description: error.message, variant: 'destructive' });
        }
      } else {
        // Save plain password for demo purposes (fire-and-forget, don't block signup flow)
        if (signUpData?.user?.id) {
          supabase.functions.invoke('manage-users', {
            body: { action: 'save_demo_password', user_id: signUpData.user.id, password: regPassword },
          }).catch(err => console.warn('demo_passwords signup save failed:', err));
        }

        // Check if auto-approve is enabled
        const [{ data: settingData }, { data: verifSetting }] = await Promise.all([
          supabase.from('system_settings').select('value').eq('key', 'auto_approve_accounts').maybeSingle(),
          supabase.from('system_settings').select('value').eq('key', 'require_email_verification').maybeSingle(),
        ]);
        const isAutoApproved = settingData?.value && (settingData.value as any).enabled === true;
        const requireVerification = verifSetting?.value && (verifSetting.value as any).enabled === true;

        if (requireVerification) {
          // Send OTP code for email verification
          if (signUpData?.user?.id) {
            setRegUserId(signUpData.user.id);
            try {
              await supabase.functions.invoke('signup-email-otp', {
                body: { action: 'send_code', email: regEmail.trim().toLowerCase(), user_id: signUpData.user.id },
              });
            } catch (e) {
              console.warn('Failed to send OTP:', e);
            }
          }
          await supabase.auth.signOut({ scope: 'local' });
          setIsLoading(false);
          setRegisterSuccess('verify_email');
          toast({
            title: 'Kiểm tra email',
            description: 'Mã OTP 6 số đã được gửi đến email của bạn.',
          });
        } else {
          // Auto-confirm user email via edge function (since auto_confirm is OFF globally)
          if (signUpData?.user?.id) {
            try {
              await supabase.functions.invoke('auto-confirm-user', {
                body: { user_id: signUpData.user.id },
              });
            } catch (e) {
              console.warn('Auto-confirm failed:', e);
            }
          }
          await supabase.auth.signOut({ scope: 'local' });
          setIsLoading(false);
          setRegisterSuccess(isAutoApproved ? 'approved' : 'pending');
          toast({
            title: 'Đăng ký thành công',
            description: isAutoApproved
              ? 'Tài khoản đã được kích hoạt. Bạn có thể đăng nhập ngay!'
              : 'Tài khoản đang chờ Admin duyệt.',
          });
        }
      }
    } catch (err) {
      isRegisteringRef.current = false;
      setIsLoading(false);
      toast({ title: 'Lỗi hệ thống', description: 'Có lỗi xảy ra. Vui lòng thử lại sau.', variant: 'destructive' });
    }
  };

  // Show verified success screen when redirected from email confirmation link
  if (isEmailVerified) {
    return (
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <TNexusLogo variant="text" width={120} />
          <span className="font-heading font-semibold text-primary flex items-center gap-1">
            <Users className="w-4 h-4" /> T-Nexus
          </span>
        </div>
        <Card className="w-full shadow-card-lg border-emerald-300 dark:border-emerald-700/50">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto ring-4 ring-emerald-200 dark:ring-emerald-800/40">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-heading font-bold text-emerald-700 dark:text-emerald-400">🎉 Xác thực email thành công!</h2>
              <p className="text-sm text-muted-foreground">Tài khoản của bạn đã được xác thực. Bạn có thể đăng nhập ngay bây giờ.</p>
            </div>
            <Button
              className="w-full bg-foreground text-background hover:bg-foreground/90"
              onClick={() => {
                searchParams.delete('verified');
                setSearchParams(searchParams, { replace: true });
              }}
            >
              → Đăng nhập ngay
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (registerSuccess) {
    const isApproved = registerSuccess === 'approved';
    const isVerifyEmail = registerSuccess === 'verify_email';
    return (
      <div className={`w-full ${isVerifyEmail ? 'max-w-4xl' : 'max-w-md'}`}>
        <div className="mb-6 flex flex-col items-center gap-2">
          <TNexusLogo variant="text" width={120} />
          <span className="font-heading font-semibold text-primary flex items-center gap-1">
            <Users className="w-4 h-4" /> T-Nexus
          </span>
        </div>
        <Card className={`w-full shadow-card-lg ${isVerifyEmail ? 'border-blue-300 dark:border-blue-700/50' : isApproved ? 'border-emerald-300 dark:border-emerald-700/50' : 'border-amber-300 dark:border-amber-700/50'}`}>
          <CardContent className={`${isVerifyEmail ? 'p-0' : 'pt-6 text-center space-y-4'}`}>
            {isVerifyEmail ? (
              <OtpVerifyScreen
                email={regEmail}
                userId={regUserId}
                fullName={regFullName}
                studentId={regStudentId}
                onVerified={() => {
                  setRegisterSuccess(false);
                  setActiveTab('login');
                }}
                onBack={() => {
                  setRegisterSuccess(false);
                  setActiveTab('register');
                }}
              />
            ) : isApproved ? (
              <>
                {/* ===== DUYỆT TỰ ĐỘNG — Đăng nhập ngay ===== */}
                <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto ring-4 ring-emerald-200 dark:ring-emerald-800/40">
                  <Shield className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl font-heading font-bold text-emerald-700 dark:text-emerald-400">🎉 Đăng ký thành công!</h2>
                  <div className="inline-flex items-center gap-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full">
                    <Shield className="w-3 h-3" />
                    Tài khoản đã được duyệt tự động
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  Hệ thống đã <strong className="text-foreground">tự động kích hoạt</strong> tài khoản của bạn. Bạn có thể đăng nhập ngay bây giờ bằng MSSV và mật khẩu vừa tạo.
                </p>

                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-lg p-4 text-left text-sm space-y-2">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2">Thông tin tài khoản</p>
                  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                    <span className="text-muted-foreground">MSSV:</span>
                    <span className="font-semibold">{regStudentId}</span>
                    <span className="text-muted-foreground">Họ tên:</span>
                    <span className="font-semibold">{regFullName}</span>
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-semibold break-all">{regEmail}</span>
                    <span className="text-muted-foreground">Trạng thái:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Đã xác minh
                    </span>
                  </div>
                </div>

                <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground flex items-start gap-2">
                  <KeyRound className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                  <span>Đăng nhập bằng <strong className="text-foreground">Mã số sinh viên (MSSV)</strong> và mật khẩu bạn vừa tạo ở bước đăng ký.</span>
                </div>
              </>
            ) : (
              <>
                {/* ===== CHỜ DUYỆT — Admin phải duyệt ===== */}
                <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto ring-4 ring-amber-200 dark:ring-amber-800/40">
                  <UserPlus className="w-10 h-10 text-amber-600 dark:text-amber-400" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-xl font-heading font-bold">Đăng ký thành công!</h2>
                  <div className="inline-flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-semibold px-3 py-1 rounded-full">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Đang chờ Admin xét duyệt
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed">
                  Tài khoản của bạn đã được tạo thành công nhưng cần <strong className="text-foreground">Admin xét duyệt</strong> trước khi sử dụng. Bạn sẽ có thể đăng nhập sau khi được duyệt.
                </p>

                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-lg p-4 text-left text-sm space-y-2">
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2">Thông tin tài khoản</p>
                  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                    <span className="text-muted-foreground">MSSV:</span>
                    <span className="font-semibold">{regStudentId}</span>
                    <span className="text-muted-foreground">Họ tên:</span>
                    <span className="font-semibold">{regFullName}</span>
                    <span className="text-muted-foreground">Email:</span>
                    <span className="font-semibold break-all">{regEmail}</span>
                    <span className="text-muted-foreground">Trạng thái:</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Chờ duyệt
                    </span>
                  </div>
                </div>

                <div className="bg-muted/40 rounded-lg p-3 text-xs text-muted-foreground flex items-start gap-2">
                  <Mail className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                  <span>Khi tài khoản được duyệt, hãy đăng nhập bằng <strong className="text-foreground">MSSV</strong> và mật khẩu bạn đã tạo.</span>
                </div>
              </>
            )}

            <Button
              variant={isApproved ? 'default' : 'outline'}
              className={`w-full ${isApproved ? 'bg-foreground text-background hover:bg-foreground/90' : ''}`}
              onClick={() => {
                setRegisterSuccess(false);
                setActiveTab('login');
                setRegStudentId('');
                setRegFullName('');
                setRegInstitution('');
                setRegEmail('');
                setRegPassword('');
                setRegConfirmPassword('');
              }}
            >
              {isVerifyEmail ? '← Quay lại đăng nhập' : isApproved ? '→ Đăng nhập ngay' : '← Quay lại đăng nhập'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="mb-6 flex flex-col items-center gap-2">
        <TNexusLogo variant="text" width={120} />
        <span className="font-heading font-semibold text-primary flex items-center gap-1">
          <Users className="w-4 h-4" /> T-Nexus - Thành viên
        </span>
      </div>
      <Card className="w-full shadow-card-lg border-border/50">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-lg font-heading">
            {activeTab === 'login' ? 'Đăng nhập' : activeTab === 'register' ? 'Tạo tài khoản' : 'Quên mật khẩu'}
          </CardTitle>
            <CardDescription>
              {activeTab === 'login'
                ? 'Nhập MSSV hoặc Email và mật khẩu để đăng nhập'
                : activeTab === 'register'
                ? 'Điền thông tin để đăng ký tài khoản mới'
                : forgotStep === 'done'
                ? 'Mật khẩu đã được đặt lại thành công'
                : forgotStep === 'newpass'
                ? 'Nhập mật khẩu mới cho tài khoản'
                : forgotStep === 'otp'
                ? 'Nhập mã OTP 6 số đã gửi đến email'
                : 'Nhập MSSV và email để nhận mã xác minh'}
            </CardDescription>
        </CardHeader>
        <CardContent>
          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-identifier">MSSV hoặc Email</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="login-identifier"
                    type="text"
                    placeholder="MSSV hoặc Email"
                    className="pl-10"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                {errors.identifier && <p className="text-sm text-destructive">{errors.identifier}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Mật khẩu</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="Mật khẩu"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-xs font-medium text-foreground hover:underline"
                    onClick={() => { setActiveTab('forgot'); setForgotStep('input'); setErrors({}); }}
                  >
                    Quên mật khẩu?
                  </button>
                </div>
              </div>

              {/* Remember login checkbox */}
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember-login"
                  checked={rememberLogin}
                  onCheckedChange={(v) => setRememberLogin(v === true)}
                  className="shrink-0 h-3.5 w-3.5 rounded-full border border-muted-foreground/40 data-[state=checked]:border-primary data-[state=checked]:bg-transparent transition-all duration-200 [&_svg]:h-3 [&_svg]:w-3 [&_svg]:text-primary"
                />
                <label htmlFor="remember-login" className="text-xs text-muted-foreground cursor-pointer select-none">
                  Nhớ đăng nhập
                </label>
              </div>

              {/* Policy checkbox - checked by default for login */}
              <PolicyCheckbox
                checked={loginPolicyAgreed}
                onCheckedChange={setLoginPolicyAgreed}
                policyContent={policyContent}
                policyUpdatedAt={policyUpdatedAt}
                error={errors.policy}
              />

              <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Đăng nhập
              </Button>
              <p className="text-sm text-center text-muted-foreground">
                Chưa có tài khoản?{' '}
                <button
                  type="button"
                  className="text-primary hover:underline font-medium"
                  onClick={() => { setActiveTab('register'); setErrors({}); }}
                >
                  Đăng ký ngay
                </button>
              </p>
            </form>
          ) : activeTab === 'forgot' ? (
            <div className="space-y-4">
              {forgotStep === 'done' ? (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-heading font-semibold text-emerald-700 dark:text-emerald-400">Đặt lại mật khẩu thành công!</h3>
                  <p className="text-sm text-muted-foreground">
                    Mật khẩu của bạn đã được cập nhật. Bạn có thể đăng nhập ngay bây giờ.
                  </p>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setActiveTab('login');
                      setForgotStep('input');
                      setForgotIdentifier('');
                      setForgotEmailInput('');
                      setForgotEmail('');
                      setOtpCode('');
                      setNewPassword('');
                      setNewPasswordConfirm('');
                      setErrors({});
                    }}
                  >
                    → Đăng nhập ngay
                  </Button>
                </div>
              ) : forgotStep === 'newpass' ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setErrors({});
                  if (!newPassword || newPassword.length < 6) {
                    setErrors({ newPass: 'Mật khẩu tối thiểu 6 ký tự' });
                    return;
                  }
                  if (newPassword !== newPasswordConfirm) {
                    setErrors({ newPassConfirm: 'Mật khẩu xác nhận không khớp' });
                    return;
                  }
                  setForgotLoading(true);
                  try {
                    const { data, error } = await supabase.functions.invoke('password-reset-otp', {
                      body: { action: 'reset_password', email: forgotEmail, code: otpCode, new_password: newPassword },
                    });
                    setForgotLoading(false);
                    if (error || !data?.success) {
                      toast({ title: 'Lỗi', description: data?.error || 'Không thể đặt lại mật khẩu', variant: 'destructive' });
                    } else {
                      setForgotStep('done');
                    }
                  } catch {
                    setForgotLoading(false);
                    toast({ title: 'Lỗi hệ thống', description: 'Có lỗi xảy ra.', variant: 'destructive' });
                  }
                }} className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Nhập mật khẩu mới cho tài khoản <span className="font-medium text-foreground">{forgotEmail}</span>
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="new-pass">Mật khẩu mới</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="new-pass" type="password" placeholder="Tối thiểu 6 ký tự" className="pl-10" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={forgotLoading} autoFocus />
                    </div>
                    {errors.newPass && <p className="text-sm text-destructive">{errors.newPass}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-pass-confirm">Xác nhận mật khẩu mới</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="new-pass-confirm" type="password" placeholder="Nhập lại mật khẩu" className="pl-10" value={newPasswordConfirm} onChange={(e) => setNewPasswordConfirm(e.target.value)} disabled={forgotLoading} />
                    </div>
                    {errors.newPassConfirm && <p className="text-sm text-destructive">{errors.newPassConfirm}</p>}
                  </div>
                  <Button type="submit" className="w-full font-semibold" disabled={forgotLoading}>
                    {forgotLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                    Đặt lại mật khẩu
                  </Button>
                  <p className="text-sm text-center">
                    <button type="button" className="text-primary hover:underline font-medium" onClick={() => { setForgotStep('otp'); setNewPassword(''); setNewPasswordConfirm(''); }}>
                      ← Quay lại
                    </button>
                  </p>
                </form>
              ) : forgotStep === 'otp' ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Nhập mã 6 số đã gửi đến <span className="font-medium text-foreground">{forgotEmail}</span>
                  </p>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={otpCode}
                      onChange={(val) => {
                        setOtpCode(val);
                        setErrors({});
                      }}
                      disabled={forgotLoading}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  {errors.otp && <p className="text-sm text-destructive text-center">{errors.otp}</p>}
                  <Button
                    className="w-full font-semibold"
                    disabled={forgotLoading || otpCode.length !== 6}
                    onClick={async () => {
                      setForgotLoading(true);
                      setErrors({});
                      try {
                        const { data, error } = await supabase.functions.invoke('password-reset-otp', {
                          body: { action: 'verify_code', email: forgotEmail, code: otpCode },
                        });
                        setForgotLoading(false);
                        if (error || !data?.success) {
                          setErrors({ otp: data?.error || 'Mã không đúng hoặc đã hết hạn' });
                          setOtpCode('');
                        } else {
                          setForgotStep('newpass');
                        }
                      } catch {
                        setForgotLoading(false);
                        setErrors({ otp: 'Có lỗi xảy ra' });
                      }
                    }}
                  >
                    {forgotLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Xác minh
                  </Button>
                  <p className="text-sm text-center">
                    <button type="button" className="text-primary hover:underline font-medium" onClick={() => { setForgotStep('input'); setOtpCode(''); setErrors({}); }}>
                      ← Quay lại
                    </button>
                  </p>
                </div>
              ) : (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setErrors({});
                  const sid = forgotIdentifier.trim();
                  const emailInput = forgotEmailInput.trim();
                  if (!sid) {
                    setErrors(prev => ({ ...prev, forgotId: 'Vui lòng nhập MSSV' }));
                    return;
                  }
                  if (!emailInput) {
                    setErrors(prev => ({ ...prev, forgotEmail: 'Vui lòng nhập email' }));
                    return;
                  }
                  setForgotLoading(true);
                  try {
                    const { data: registeredEmail } = await supabase.rpc('get_email_by_student_id', { _student_id: sid });
                    if (!registeredEmail) {
                      setForgotLoading(false);
                      toast({ title: 'Không tìm thấy', description: 'MSSV này chưa được đăng ký trong hệ thống.', variant: 'destructive' });
                      return;
                    }
                    if (registeredEmail.toLowerCase() !== emailInput.toLowerCase()) {
                      setForgotLoading(false);
                      toast({ title: 'Không khớp', description: 'Email không khớp với MSSV đã đăng ký.', variant: 'destructive' });
                      return;
                    }

                    // Send OTP via edge function
                    const { data, error } = await supabase.functions.invoke('password-reset-otp', {
                      body: { action: 'send_code', email: registeredEmail },
                    });

                    setForgotLoading(false);
                    if (error || !data?.success) {
                      toast({ title: 'Lỗi', description: data?.error || 'Không thể gửi mã xác minh', variant: 'destructive' });
                    } else {
                      setForgotEmail(registeredEmail);
                      setForgotStep('otp');
                      toast({ title: 'Đã gửi mã', description: 'Mã OTP 6 số đã được gửi đến email của bạn.' });
                    }
                  } catch {
                    setForgotLoading(false);
                    toast({ title: 'Lỗi hệ thống', description: 'Có lỗi xảy ra.', variant: 'destructive' });
                  }
                }} className="space-y-4">
                   <p className="text-sm text-muted-foreground text-center">
                     Nhập MSSV và email đã đăng ký. Hệ thống sẽ gửi mã OTP 6 số đến email của bạn.
                   </p>
                  <div className="space-y-2">
                    <Label htmlFor="forgot-id">Mã số sinh viên (MSSV)</Label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="forgot-id" type="text" placeholder="31241234567" className="pl-10" value={forgotIdentifier} onChange={(e) => setForgotIdentifier(e.target.value)} disabled={forgotLoading} autoFocus />
                    </div>
                    {errors.forgotId && <p className="text-sm text-destructive">{errors.forgotId}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email đã đăng ký</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="forgot-email" type="email" placeholder="email@example.com" className="pl-10" value={forgotEmailInput} onChange={(e) => setForgotEmailInput(e.target.value)} disabled={forgotLoading} />
                    </div>
                    {errors.forgotEmail && <p className="text-sm text-destructive">{errors.forgotEmail}</p>}
                  </div>
                  <Button type="submit" className="w-full font-semibold bg-foreground text-background hover:bg-foreground/90" disabled={forgotLoading}>
                    {forgotLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                    Gửi mã xác minh
                  </Button>
                  <p className="text-sm text-center">
                    <button type="button" className="text-primary hover:underline font-medium" onClick={() => { setActiveTab('login'); setErrors({}); setForgotIdentifier(''); setForgotEmailInput(''); }}>
                      ← Quay lại đăng nhập
                    </button>
                  </p>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="reg-full-name">Họ và tên <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reg-full-name"
                    type="text"
                    placeholder="Nguyễn Văn A"
                    className="pl-10"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
              </div>
              <div className="space-y-2">
                <Label>Đơn vị đào tạo <span className="text-destructive">*</span></Label>
                <Popover open={regInstitutionOpen} onOpenChange={setRegInstitutionOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={regInstitutionOpen}
                      className={cn(
                        "w-full justify-between h-10 font-normal",
                        !regInstitution && "text-muted-foreground"
                      )}
                      disabled={isLoading}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <GraduationCap className="w-4 h-4 shrink-0 text-muted-foreground" />
                        <span className="truncate">
                          {regInstitution
                            ? INSTITUTIONS.find(i => i.name === regInstitution)?.name || regInstitution
                            : "Chọn trường / đơn vị đào tạo"}
                        </span>
                      </div>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Tìm trường..."
                        value={regInstitutionSearch}
                        onValueChange={setRegInstitutionSearch}
                      />
                      <CommandList>
                        <ScrollArea className="h-[240px]">
                          <CommandEmpty>Không tìm thấy trường nào.</CommandEmpty>
                          {(() => {
                            const filtered = searchInstitutions(regInstitutionSearch);
                            const groupedByRegion = new Map<string, typeof filtered>();
                            filtered.forEach(inst => {
                              const arr = groupedByRegion.get(inst.region) || [];
                              arr.push(inst);
                              groupedByRegion.set(inst.region, arr);
                            });
                            return REGIONS.map(region => {
                              const items = groupedByRegion.get(region);
                              if (!items || items.length === 0) return null;
                              return (
                                <CommandGroup key={region} heading={region}>
                                  {items.map(inst => (
                                    <CommandItem
                                      key={inst.code}
                                      value={inst.name}
                                      onSelect={() => {
                                        setRegInstitution(inst.name);
                                        setRegInstitutionOpen(false);
                                        setRegInstitutionSearch('');
                                      }}
                                    >
                                      <Check className={cn("mr-2 h-4 w-4", regInstitution === inst.name ? "opacity-100" : "opacity-0")} />
                                      <span className="text-xs font-mono text-muted-foreground mr-1.5">{inst.code}</span>
                                      <span className="truncate">{inst.name}</span>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              );
                            });
                          })()}
                        </ScrollArea>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.institution && <p className="text-sm text-destructive">{errors.institution}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-student-id">Mã số sinh viên (MSSV) <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reg-student-id"
                    type="text"
                    placeholder="31241234567"
                    className="pl-10"
                    value={regStudentId}
                    onChange={(e) => setRegStudentId(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                {errors.studentId && <p className="text-sm text-destructive">{errors.studentId}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-email">Email <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="email@example.com"
                    className="pl-10"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-password">Mật khẩu <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="Tối thiểu 6 ký tự"
                    className="pl-10"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="reg-confirm-password">Xác nhận mật khẩu <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reg-confirm-password"
                    type="password"
                    placeholder="Nhập lại mật khẩu"
                    className="pl-10"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
              </div>

              {/* Policy checkbox - unchecked by default for register */}
              <PolicyCheckbox
                checked={regPolicyAgreed}
                onCheckedChange={setRegPolicyAgreed}
                policyContent={policyContent}
                policyUpdatedAt={policyUpdatedAt}
                error={errors.policy}
              />

              <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Tạo tài khoản
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Sau khi tạo, tài khoản cần được Admin duyệt trước khi sử dụng.
              </p>
              <p className="text-sm text-center text-muted-foreground">
                Đã có tài khoản?{' '}
                <button
                  type="button"
                  className="text-primary hover:underline font-medium"
                  onClick={() => { setActiveTab('login'); setErrors({}); }}
                >
                  Đăng nhập
                </button>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
