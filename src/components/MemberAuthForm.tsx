import { useEffect, useState, useRef, useMemo } from 'react';
import { TNexusLogo } from '@/components/TNexusLogo';
import { OtpVerifyScreen } from '@/components/OtpVerifyScreen';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
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
import { Loader2, Hash, Lock, Users, Mail, User, UserPlus, LogIn, FileText, Shield, KeyRound, AlertTriangle, GraduationCap, Check, ChevronsUpDown, CheckCircle2, Wrench, ShieldAlert } from 'lucide-react';
import tNexusLogoWhite from '@/assets/t-nexus-text-white.png';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { INSTITUTIONS, REGIONS, searchInstitutions } from '@/lib/institutions';
import { cn } from '@/lib/utils';
import { TurnstileWidget, type TurnstileWidgetRef } from '@/components/TurnstileWidget';

import { format, type Locale } from 'date-fns';
import { vi as viLocale, enUS } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

const loginSchema = (ta: Record<string, string>) => z.object({
  identifier: z.string().min(1, ta.valIdentifierRequired),
  password: z.string().min(6, ta.valPasswordMin),
});

const registerSchema = (ta: Record<string, string>) => z.object({
  studentId: z.string().min(1, ta.valStudentIdRequired).max(20, ta.valStudentIdMax),
  fullName: z.string().min(1, ta.valFullNameRequired).max(100, ta.valFullNameMax),
  institution: z.string().min(1, ta.valInstitutionRequired),
  email: z.string().email(ta.valEmailInvalid).max(255, ta.valEmailMax),
  password: z.string().min(6, ta.valPasswordMin),
  confirmPassword: z.string().min(6, ta.valConfirmPasswordMin),
}).refine(data => data.password === data.confirmPassword, {
  message: ta.valPasswordMismatch,
  path: ['confirmPassword'],
});

function PolicyCheckbox({
  checked,
  onCheckedChange,
  policyUpdatedAt,
  error,
  ta,
  dateLocale,
  localizedPolicyPath,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  policyUpdatedAt: string | null;
  error?: string;
  ta: Record<string, string>;
  dateLocale: Locale;
  localizedPolicyPath: string;
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
            {ta.policyAgree}
          </label>
          <a
            href={localizedPolicyPath}
            target="_blank"
            rel="noopener noreferrer"
            className="text-warning hover:underline font-semibold"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              window.open(localizedPolicyPath, '_blank', 'noopener,noreferrer');
            }}
          >
            {ta.policyTitle}
          </a>
          {policyUpdatedAt && (
            <span className="text-[10px] text-muted-foreground leading-none">· {format(new Date(policyUpdatedAt), "dd/MM/yyyy", { locale: dateLocale })}</span>
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
  const { signIn, signOut, user, profile, isLoading: authLoading, maintenanceMode, isAdmin } = useAuth();
  const { translations, locale, localizedPath } = useLanguage();
  const ta = translations.auth;
  const dateLocale = locale === 'vi' ? viLocale : enUS;
  const localizedPolicyPath = localizedPath('/terms');
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
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileWidgetRef>(null);
  const pendingActionRef = useRef<'login' | 'register' | null>(null);
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

  // Block popup (maintenance / suspended)
  const [blockPopup, setBlockPopup] = useState<{
    type: 'maintenance' | 'suspended';
    message?: string;
    endAt?: string | null;
    until?: string | null;
    reason?: string | null;
  } | null>(null);

  const pendingLoginRef = useRef(false);

  useEffect(() => {
    if (user && profile) {
      if (profile.is_approved) {
        // Don't navigate if pending login transition setup or during registration
        if (pendingLoginRef.current || isRegisteringRef.current) return;
        // Don't navigate if maintenance mode is on and user is not admin
        if (maintenanceMode && !isAdmin) return;
        navigate('/dashboard');
      }
    }
  }, [user, profile, navigate, maintenanceMode, isAdmin]);

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
            <h2 className="text-xl font-heading font-semibold">{ta.pendingTitle}</h2>
            <p className="text-sm text-muted-foreground">
              {ta.pendingDesc}
            </p>
            <div className="bg-muted/50 rounded-lg p-3 text-left text-sm space-y-1">
              <p><span className="text-muted-foreground">{ta.pendingFullName}</span> <span className="font-medium">{profile.full_name}</span></p>
              <p><span className="text-muted-foreground">{ta.pendingStudentId}</span> <span className="font-medium">{profile.student_id}</span></p>
              <p><span className="text-muted-foreground">{ta.pendingEmail}</span> <span className="font-medium">{profile.email}</span></p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                await supabase.auth.signOut({ scope: 'local' });
                window.location.reload();
              }}
            >
              {ta.pendingLogout}
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
      setErrors({ policy: ta.policyRequired });
      return;
    }

    if (!turnstileToken) {
      // Trigger invisible captcha, will call back onVerify then we re-submit
      pendingActionRef.current = 'login';
      turnstileRef.current?.execute();
      return;
    }

    const result = loginSchema(ta).safeParse({ identifier, password });
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
      pendingActionRef.current = null;
      // Verify CAPTCHA first
      const { data: captchaResult, error: captchaError } = await supabase.functions.invoke('verify-turnstile', {
        body: { token: turnstileToken },
      });
      if (captchaError || !captchaResult?.success) {
        setIsLoading(false);
        setTurnstileToken(null);
        toast({ title: ta.captchaFailed, variant: 'destructive' });
        return;
      }

      let loginEmail = input;
      let profileQuery: 'email' | 'student_id' = isEmail ? 'email' : 'student_id';

      if (!isEmail) {
        // MSSV path: lookup email
        const { data: foundEmail, error: lookupError } = await supabase
          .rpc('get_email_by_student_id', { _student_id: input });

        if (lookupError) {
          setIsLoading(false);
          toast({ title: ta.toastSystemError, description: ta.toastCannotCheckId, variant: 'destructive' });
          return;
        }

        if (!foundEmail) {
          setIsLoading(false);
          toast({
            title: ta.toastIdNotExist,
            description: ta.toastIdNotExistDesc,
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
          title: ta.toastPendingApproval,
          description: ta.toastPendingApprovalDesc,
        });
        return;
      }

      if (isEmail && !profileData) {
        setIsLoading(false);
        toast({
          title: ta.toastEmailNotExist,
          description: ta.toastEmailNotExistDesc,
          variant: 'destructive',
        });
        return;
      }

      // Set ref BEFORE signIn to prevent race condition with useEffect navigation
      pendingLoginRef.current = true;
      // Set session flag to prevent Auth.tsx from showing RememberLoginScreen mid-flow
      sessionStorage.setItem('t-nexus_login_in_progress', 'true');

      const { error } = await signIn(loginEmail, password);

      if (error) {
        pendingLoginRef.current = false;
        sessionStorage.removeItem('t-nexus_login_in_progress');
        setIsLoading(false);
        toast({
          title: ta.toastLoginFailed,
          description: error.message === 'Invalid login credentials' ? ta.toastInvalidCredentials : error.message,
          variant: 'destructive',
        });
      } else {
        // --- Post-signIn checks: maintenance & suspension ---
        try {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (!currentUser) throw new Error('no user');

          // Fetch roles
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', currentUser.id);
          const isUserAdmin = userRoles?.some(r => r.role === 'system_owner') ?? false;

          // Fetch fresh suspension status
          const { data: freshProfile } = await supabase
            .from('profiles')
            .select('suspended_until, suspension_reason')
            .eq('id', currentUser.id)
            .maybeSingle();

          const isSuspended = freshProfile?.suspended_until
            ? new Date(freshProfile.suspended_until).getTime() > Date.now()
            : false;

          // Fetch maintenance status
          const { data: maintenanceData } = await supabase
            .from('system_settings')
            .select('value')
            .eq('key', 'maintenance_mode')
            .maybeSingle();
          const maintenanceVal = maintenanceData?.value as { enabled?: boolean; message?: string; end_at?: string } | null;
          const isMaintenanceOn = maintenanceVal?.enabled ?? false;

          // Block: Suspended account
          if (isSuspended) {
            pendingLoginRef.current = false;
            sessionStorage.removeItem('t-nexus_login_in_progress');
            setIsLoading(false);
            setBlockPopup({
              type: 'suspended',
              until: freshProfile?.suspended_until,
              reason: freshProfile?.suspension_reason,
            });
            // Use context signOut to immediately clear user/profile state
            await signOut();
            return;
          }

          // Block: Maintenance mode (admin bypasses)
          if (isMaintenanceOn && !isUserAdmin) {
            pendingLoginRef.current = false;
            sessionStorage.removeItem('t-nexus_login_in_progress');
            setIsLoading(false);
            setBlockPopup({
              type: 'maintenance',
              message: maintenanceVal?.message,
              endAt: maintenanceVal?.end_at,
            });
            // Use context signOut to immediately clear user/profile state
            await signOut();
            return;
          }
        } catch (checkErr) {
          console.warn('Post-login check error:', checkErr);
        }

        setIsLoading(false);
        // Save remember login preference
        if (rememberLogin) {
          localStorage.setItem('t-nexus_remember_login', 'true');
        } else {
          localStorage.removeItem('t-nexus_remember_login');
        }
        pendingLoginRef.current = false;
        sessionStorage.removeItem('t-nexus_login_in_progress');
        toast({ title: ta.toastLoginSuccess, description: ta.toastWelcomeBack });
        navigate('/dashboard');
      }
    } catch (err) {
      pendingLoginRef.current = false;
      sessionStorage.removeItem('t-nexus_login_in_progress');
      setIsLoading(false);
      toast({ title: 'Lỗi hệ thống', description: 'Có lỗi xảy ra. Vui lòng thử lại sau.', variant: 'destructive' });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!regPolicyAgreed) {
      setErrors({ policy: ta.policyRequiredRegister });
      return;
    }

    if (!turnstileToken) {
      pendingActionRef.current = 'register';
      turnstileRef.current?.execute();
      return;
    }

    const result = registerSchema(ta).safeParse({
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
      // Verify CAPTCHA first
      const { data: captchaResult, error: captchaError } = await supabase.functions.invoke('verify-turnstile', {
        body: { token: turnstileToken },
      });
      if (captchaError || !captchaResult?.success) {
        setIsLoading(false);
        setTurnstileToken(null);
        toast({ title: ta.captchaFailed, variant: 'destructive' });
        return;
      }

      const { data: existingEmail } = await supabase
        .rpc('get_email_by_student_id', { _student_id: regStudentId.trim() });

      if (existingEmail) {
        setIsLoading(false);
        toast({ title: ta.toastIdAlreadyExists, description: ta.toastIdAlreadyExistsDesc, variant: 'destructive' });
        return;
      }

      // Register via backend — no client session created
      isRegisteringRef.current = true;
      const { data: registerData, error: registerError } = await supabase.functions.invoke('signup-email-otp', {
        body: {
          action: 'register',
          email: regEmail.trim().toLowerCase(),
          password: regPassword,
          student_id: regStudentId.trim(),
          full_name: regFullName.trim(),
          institution: regInstitution,
        },
      });

      if (registerError || !registerData?.success) {
        isRegisteringRef.current = false;
        setIsLoading(false);
        const errMsg = registerData?.error || registerError?.message || ta.toastRegisterFailed;
        if (errMsg.includes('MSSV') || errMsg.includes('Student ID')) {
          toast({ title: ta.toastIdAlreadyExists, description: errMsg, variant: 'destructive' });
        } else if (errMsg.includes('Email')) {
          toast({ title: ta.toastEmailAlreadyExists, description: errMsg, variant: 'destructive' });
        } else {
          toast({ title: ta.toastRegisterFailed, description: errMsg, variant: 'destructive' });
        }
      } else {
        // Backend created user + sent OTP, no session exists on client
        setRegUserId(registerData.user_id);
        setIsLoading(false);
        setRegisterSuccess('verify_email');
        toast({
          title: ta.toastCheckEmail,
          description: ta.toastOtpSent,
        });
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
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-4 flex flex-col items-center gap-1">
          <TNexusLogo variant="text" width={100} />
          <span className="font-heading text-sm font-semibold text-primary flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> T-Nexus
          </span>
        </div>
        <Card className="w-full shadow-card-lg border-emerald-300 dark:border-emerald-700/50">
          <CardContent className="py-5 px-4 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <div>
              <h2 className="text-base font-heading font-bold text-emerald-600 dark:text-emerald-400">{ta.emailVerifiedTitle}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{ta.emailVerifiedDesc}</p>
            </div>
            <Button
              size="sm"
              className="w-full"
              onClick={() => {
                searchParams.delete('verified');
                setSearchParams(searchParams, { replace: true });
              }}
            >
              {ta.emailVerifiedBtn}
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
      <div className={`w-full ${isVerifyEmail ? 'max-w-sm' : 'max-w-sm'} mx-auto`}>
        <div className="mb-4 flex flex-col items-center gap-1">
          <TNexusLogo variant="text" width={100} />
          <span className="font-heading text-sm font-semibold text-primary flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> T-Nexus
          </span>
        </div>
        <Card className={`w-full shadow-card-lg ${isVerifyEmail ? 'border-blue-300 dark:border-blue-700/50' : isApproved ? 'border-emerald-300 dark:border-emerald-700/50' : 'border-amber-300 dark:border-amber-700/50'}`}>
          <CardContent className={`${isVerifyEmail ? 'p-0' : 'py-5 px-4 text-center space-y-3'}`}>
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
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <div>
                  <h2 className="text-base font-heading font-bold text-emerald-600 dark:text-emerald-400">{ta.registerSuccessTitle}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{ta.registerAutoApproved}</p>
                </div>
                <div className="bg-muted/50 rounded-md p-2 text-left text-xs space-y-0.5">
                  <p><span className="text-muted-foreground">{ta.pendingStudentId}</span> <span className="font-medium">{regStudentId}</span></p>
                  <p><span className="text-muted-foreground">{ta.pendingFullName}</span> <span className="font-medium">{regFullName}</span></p>
                  <p><span className="text-muted-foreground">{ta.pendingEmail}</span> <span className="font-medium">{regEmail}</span></p>
                </div>
              </>
            ) : (
              <>
                <UserPlus className="w-10 h-10 text-amber-500 mx-auto" />
                <div>
                  <h2 className="text-base font-heading font-bold">{ta.registerSuccessTitle}</h2>
                  <div className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 text-xs font-medium mt-0.5">
                    <Loader2 className="w-3 h-3 animate-spin" /> {ta.registerPendingAdmin}
                  </div>
                </div>
                <div className="bg-muted/50 rounded-md p-2 text-left text-xs space-y-0.5">
                  <p><span className="text-muted-foreground">{ta.pendingStudentId}</span> <span className="font-medium">{regStudentId}</span></p>
                  <p><span className="text-muted-foreground">{ta.pendingFullName}</span> <span className="font-medium">{regFullName}</span></p>
                  <p><span className="text-muted-foreground">{ta.pendingEmail}</span> <span className="font-medium">{regEmail}</span></p>
                </div>
                <p className="text-xs text-muted-foreground">{ta.registerLoginAfterApproval}</p>
              </>
            )}

            <Button
              size="sm"
              variant={isApproved ? 'default' : 'outline'}
              className="w-full"
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
              {isApproved ? ta.registerLoginNow : ta.registerBackToLogin}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <TNexusLogo variant="text" width={120} />
          <span className="font-heading font-semibold text-primary flex items-center gap-1">
            <Users className="w-4 h-4" /> {ta.memberBrand}
          </span>
        </div>
        <Card className="w-full shadow-card-lg border-border/50">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg font-heading">
              {activeTab === 'login' ? ta.tabLogin : activeTab === 'register' ? ta.tabRegister : ta.tabForgot}
            </CardTitle>
            <CardDescription>
              {activeTab === 'login'
                ? ta.loginDesc
                : activeTab === 'register'
                  ? ta.registerDesc
                  : forgotStep === 'done'
                    ? ta.forgotDoneDesc
                    : forgotStep === 'newpass'
                      ? ta.forgotNewPassDesc
                      : forgotStep === 'otp'
                        ? ta.forgotOtpDesc
                        : ta.forgotDesc}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeTab === 'login' ? (
              <form onSubmit={handleLogin} data-auth-form="login" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-identifier">{ta.identifierLabel}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-identifier"
                      type="text"
                      placeholder={ta.identifierPlaceholder}
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
                  <Label htmlFor="login-password">{ta.passwordLabel}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder={ta.passwordPlaceholder}
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
                      {ta.forgotPasswordLink}
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
                    {ta.rememberLogin}
                  </label>
                </div>

                {/* Policy checkbox - checked by default for login */}
                <PolicyCheckbox
                  checked={loginPolicyAgreed}
                  onCheckedChange={setLoginPolicyAgreed}
                  policyUpdatedAt={policyUpdatedAt}
                  error={errors.policy}
                  ta={ta}
                  dateLocale={dateLocale}
                  localizedPolicyPath={localizedPolicyPath}
                />

                <TurnstileWidget
                  ref={turnstileRef}
                  onVerify={(token) => {
                    setTurnstileToken(token);
                    if (pendingActionRef.current) {
                      // Re-trigger submit after token received
                      setTimeout(() => {
                        const form = document.querySelector('form[data-auth-form="login"]') as HTMLFormElement;
                        form?.requestSubmit();
                      }, 0);
                    }
                  }}
                  onExpire={() => setTurnstileToken(null)}
                  onError={() => {
                    setTurnstileToken(null);
                    pendingActionRef.current = null;
                    toast({ title: ta.captchaFailed, variant: 'destructive' });
                  }}
                />

                <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {ta.loginBtn}
                </Button>
                <p className="text-sm text-center text-muted-foreground">
                  {ta.noAccount}{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => { setActiveTab('register'); setErrors({}); }}
                  >
                    {ta.registerNow}
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
                    <h3 className="text-lg font-heading font-semibold text-emerald-700 dark:text-emerald-400">{ta.forgotResetSuccess}</h3>
                    <p className="text-sm text-muted-foreground">
                      {ta.forgotResetSuccessDesc}
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
                      {ta.forgotLoginNow}
                    </Button>
                  </div>
                ) : forgotStep === 'newpass' ? (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setErrors({});
                    if (!newPassword || newPassword.length < 6) {
                      setErrors({ newPass: ta.valPasswordMinForgot });
                      return;
                    }
                    if (newPassword !== newPasswordConfirm) {
                      setErrors({ newPassConfirm: ta.valPasswordMismatchForgot });
                      return;
                    }
                    setForgotLoading(true);
                    try {
                      const { data, error } = await supabase.functions.invoke('password-reset-otp', {
                        body: { action: 'reset_password', email: forgotEmail, code: otpCode, new_password: newPassword },
                      });
                      setForgotLoading(false);
                      if (error || !data?.success) {
                        toast({ title: ta.forgotOtpError, description: data?.error || ta.forgotResetError, variant: 'destructive' });
                      } else {
                        setForgotStep('done');
                      }
                    } catch {
                      setForgotLoading(false);
                      toast({ title: 'Lỗi hệ thống', description: 'Có lỗi xảy ra.', variant: 'destructive' });
                    }
                  }} className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center">
                      {ta.forgotNewPassForAccount} <span className="font-medium text-foreground">{forgotEmail}</span>
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="new-pass">{ta.forgotNewPassword}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="new-pass" type="password" placeholder={ta.forgotNewPassPlaceholder} className="pl-10" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={forgotLoading} autoFocus />
                      </div>
                      {errors.newPass && <p className="text-sm text-destructive">{errors.newPass}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-pass-confirm">{ta.forgotConfirmLabel}</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="new-pass-confirm" type="password" placeholder={ta.forgotConfirmNewPlaceholder} className="pl-10" value={newPasswordConfirm} onChange={(e) => setNewPasswordConfirm(e.target.value)} disabled={forgotLoading} />
                      </div>
                      {errors.newPassConfirm && <p className="text-sm text-destructive">{errors.newPassConfirm}</p>}
                    </div>
                    <Button type="submit" className="w-full font-semibold" disabled={forgotLoading}>
                      {forgotLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <KeyRound className="w-4 h-4 mr-2" />}
                      {ta.forgotResetButton}
                    </Button>
                    <p className="text-sm text-center">
                      <button type="button" className="text-primary hover:underline font-medium" onClick={() => { setForgotStep('otp'); setNewPassword(''); setNewPasswordConfirm(''); }}>
                        ← {ta.forgotBackToLogin}
                      </button>
                    </p>
                  </form>
                ) : forgotStep === 'otp' ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center">
                      {ta.forgotOtpDesc} <span className="font-medium text-foreground">{forgotEmail}</span>
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
                            setErrors({ otp: data?.error || ta.forgotOtpIncorrect });
                            setOtpCode('');
                          } else {
                            setForgotStep('newpass');
                          }
                        } catch {
                          setForgotLoading(false);
                          setErrors({ otp: ta.toastGenericError });
                        }
                      }}
                    >
                      {forgotLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      {ta.forgotVerify}
                    </Button>
                    <p className="text-sm text-center">
                      <button type="button" className="text-primary hover:underline font-medium" onClick={() => { setForgotStep('input'); setOtpCode(''); setErrors({}); }}>
                        ← {ta.forgotBackToLogin}
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
                      setErrors(prev => ({ ...prev, forgotId: ta.valStudentIdRequired }));
                      return;
                    }
                    if (!emailInput) {
                      setErrors(prev => ({ ...prev, forgotEmail: ta.forgotEmailRequiredError }));
                      return;
                    }
                    setForgotLoading(true);
                    try {
                      const { data: registeredEmail } = await supabase.rpc('get_email_by_student_id', { _student_id: sid });
                      if (!registeredEmail) {
                        setForgotLoading(false);
                        toast({ title: ta.toastIdNotExist, description: ta.forgotNoUserFound, variant: 'destructive' });
                        return;
                      }
                      if (registeredEmail.toLowerCase() !== emailInput.toLowerCase()) {
                        setForgotLoading(false);
                        toast({ title: ta.forgotOtpError, description: ta.forgotEmailMismatch, variant: 'destructive' });
                        return;
                      }

                      // Send OTP via edge function
                      const { data, error } = await supabase.functions.invoke('password-reset-otp', {
                        body: { action: 'send_code', email: registeredEmail },
                      });

                      setForgotLoading(false);
                      if (error || !data?.success) {
                        toast({ title: ta.forgotOtpError, description: data?.error || ta.forgotCannotSendOtp, variant: 'destructive' });
                      } else {
                        setForgotEmail(registeredEmail);
                        setForgotStep('otp');
                        toast({ title: ta.forgotOtpSentToast, description: ta.forgotOtpSentToastDesc });
                      }
                    } catch {
                      setForgotLoading(false);
                      toast({ title: 'Lỗi hệ thống', description: 'Có lỗi xảy ra.', variant: 'destructive' });
                    }
                  }} className="space-y-4">
                    <p className="text-sm text-muted-foreground text-center">
                      {ta.forgotEnterDesc}
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="forgot-id">{ta.forgotStudentIdLabel}</Label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="forgot-id" type="text" placeholder="31241234567" className="pl-10" value={forgotIdentifier} onChange={(e) => setForgotIdentifier(e.target.value)} disabled={forgotLoading} autoFocus />
                      </div>
                      {errors.forgotId && <p className="text-sm text-destructive">{errors.forgotId}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">{ta.forgotEmailLabel}</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input id="forgot-email" type="email" placeholder="email@example.com" className="pl-10" value={forgotEmailInput} onChange={(e) => setForgotEmailInput(e.target.value)} disabled={forgotLoading} />
                      </div>
                      {errors.forgotEmail && <p className="text-sm text-destructive">{errors.forgotEmail}</p>}
                    </div>
                    <Button type="submit" className="w-full font-semibold bg-foreground text-background hover:bg-foreground/90" disabled={forgotLoading}>
                      {forgotLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
                      {ta.forgotSendButton}
                    </Button>
                    <p className="text-sm text-center">
                      <button type="button" className="text-primary hover:underline font-medium" onClick={() => { setActiveTab('login'); setErrors({}); setForgotIdentifier(''); setForgotEmailInput(''); }}>
                        {ta.forgotBackToLogin}
                      </button>
                    </p>
                  </form>
                )}
              </div>
            ) : (
              <form onSubmit={handleRegister} data-auth-form="register" className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="reg-full-name">{ta.fullNameLabel} <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reg-full-name"
                      type="text"
                      placeholder={ta.fullNamePlaceholder}
                      className="pl-10"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{ta.institutionLabel} <span className="text-destructive">*</span></Label>
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
                              : ta.institutionPlaceholder}
                          </span>
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder={ta.institutionSearch}
                          value={regInstitutionSearch}
                          onValueChange={setRegInstitutionSearch}
                        />
                        <CommandList>
                          <ScrollArea className="h-[240px]">
                            <CommandEmpty>{ta.institutionEmpty}</CommandEmpty>
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
                  <Label htmlFor="reg-student-id">{ta.studentIdLabel} <span className="text-destructive">*</span></Label>
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
                  <Label htmlFor="reg-password">{ta.passwordLabel} <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder={ta.passwordMinPlaceholder}
                      className="pl-10"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-confirm-password">{ta.confirmPasswordLabel} <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reg-confirm-password"
                      type="password"
                      placeholder={ta.confirmPasswordPlaceholder}
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
                  policyUpdatedAt={policyUpdatedAt}
                  error={errors.policy}
                  ta={ta}
                  dateLocale={dateLocale}
                  localizedPolicyPath={localizedPolicyPath}
                />


                <TurnstileWidget
                  ref={turnstileRef}
                  onVerify={(token) => {
                    setTurnstileToken(token);
                    if (pendingActionRef.current) {
                      setTimeout(() => {
                        const form = document.querySelector('form[data-auth-form="register"]') as HTMLFormElement;
                        form?.requestSubmit();
                      }, 0);
                    }
                  }}
                  onExpire={() => setTurnstileToken(null)}
                  onError={() => {
                    setTurnstileToken(null);
                    pendingActionRef.current = null;
                    toast({ title: ta.captchaFailed, variant: 'destructive' });
                  }}
                />

                <Button type="submit" className="w-full font-semibold" disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {ta.registerBtn}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {ta.adminApprovalNote}
                </p>
                <p className="text-sm text-center text-muted-foreground">
                  {ta.haveAccount}{' '}
                  <button
                    type="button"
                    className="text-primary hover:underline font-medium"
                    onClick={() => { setActiveTab('login'); setErrors({}); }}
                  >
                    {ta.loginNow}
                  </button>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Block Popup: Maintenance / Suspended */}
      {blockPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div className="fixed inset-0 bg-black/80" onClick={() => setBlockPopup(null)} />
          {/* Content */}
          <div className="relative z-50 w-full max-w-sm mx-4 bg-background border rounded-lg shadow-lg p-6 animate-in fade-in-0 zoom-in-95 duration-200">
            <div className="flex flex-col items-center gap-3 mb-4">
              {blockPopup.type === 'maintenance' && (
                <div className="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Wrench className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                </div>
              )}
              {blockPopup.type === 'suspended' && (
                <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <ShieldAlert className="w-7 h-7 text-red-600 dark:text-red-400" />
                </div>
              )}
            </div>
            <h2 className="text-lg font-semibold text-center mb-2">
              {blockPopup.type === 'maintenance' ? ta.blockMaintenanceTitle : ta.blockSuspendedTitle}
            </h2>
            <div className="text-sm text-muted-foreground text-center space-y-1 mb-6">
              {blockPopup.type === 'maintenance' && (
                <>
                  <p>{blockPopup.message || ta.blockMaintenanceDesc}</p>
                  {blockPopup.endAt && (
                    <p className="text-xs">
                      {ta.blockMaintenanceEstimate} {format(new Date(blockPopup.endAt), 'HH:mm dd/MM/yyyy', { locale: dateLocale })}
                    </p>
                  )}
                </>
              )}
              {blockPopup.type === 'suspended' && (
                <>
                  <p>{ta.blockSuspendedDesc}</p>
                  {blockPopup.until && (
                    <p className="text-xs">
                      {ta.blockSuspendedUntil} {format(new Date(blockPopup.until), 'HH:mm dd/MM/yyyy', { locale: dateLocale })}
                    </p>
                  )}
                  {blockPopup.reason && (
                    <p className="text-xs">{ta.blockSuspendedReason} {blockPopup.reason}</p>
                  )}
                </>
              )}
            </div>
            {/* Support email */}
            <p className="text-xs text-muted-foreground text-center mb-4 flex items-center justify-center gap-1.5">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              Liên hệ hỗ trợ:{' '}
              <a href="mailto:support@t-nexus.io.vn" className="text-primary hover:underline font-medium">
                support@t-nexus.io.vn
              </a>
            </p>
            <div className="flex justify-center">
              <Button onClick={() => setBlockPopup(null)} className="min-w-[120px]">
                {ta.blockUnderstood}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
