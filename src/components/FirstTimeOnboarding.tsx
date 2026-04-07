import { useState, useRef, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { r2Storage } from '@/lib/r2Storage';
import { useLanguage } from '@/contexts/LanguageContext';
import tNexusTextWhite from '@/assets/t-nexus-text-white.png';
import welcomeImg from '@/assets/onboarding-welcome.png';
import securityImg from '@/assets/onboarding-security.png';
import profileImg from '@/assets/onboarding-profile.png';
import completeImg from '@/assets/onboarding-complete.png';
import {
  Loader2, Key, Camera, User, Check, ChevronRight,
  GraduationCap, BookOpen, Phone, Sparkles, Shield,
  Rocket, Eye, EyeOff, Mail, ListChecks, Users, FolderKanban,
  Award, MessageSquare, ChevronLeft, Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

interface FirstTimeOnboardingProps {
  open: boolean;
  userId: string;
  userFullName: string;
  userEmail: string;
  userStudentId: string;
  userPlan?: string;
  mustChangePassword: boolean;
  onComplete: () => void;
}

type StepId = 'language' | 'welcome' | 'password' | 'info' | 'finish';

const stepIcons: Record<StepId, React.ReactNode> = {
  language: <Globe className="w-4 h-4" />,
  welcome: <Sparkles className="w-4 h-4" />,
  password: <Key className="w-4 h-4" />,
  info: <User className="w-4 h-4" />,
  finish: <Rocket className="w-4 h-4" />,
};

export default function FirstTimeOnboarding({
  open, userId, userFullName, userEmail, userStudentId, userPlan, mustChangePassword, onComplete,
}: FirstTimeOnboardingProps) {
  const { toast } = useToast();
  const { translations: { app: appT }, setLocale, locale } = useLanguage();
  const t = appT.onboarding;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Language selection: null = not selected yet
  const [selectedLang, setSelectedLang] = useState<'en' | 'vi' | null>(null);

  const allSteps: StepId[] = mustChangePassword
    ? ['language', 'welcome', 'password', 'info', 'finish']
    : ['language', 'welcome', 'info', 'finish'];

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const currentStep = allSteps[currentStepIndex];

  const [showCelebration, setShowCelebration] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [yearBatch, setYearBatch] = useState('');
  const [major, setMajor] = useState('');
  const [phone, setPhone] = useState('');
  const [skills, setSkills] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [infoErrors, setInfoErrors] = useState<Record<string, boolean>>({});

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const goNext = () => setCurrentStepIndex(i => Math.min(i + 1, allSteps.length - 1));
  const goBack = () => setCurrentStepIndex(i => Math.max(i - 1, 0));

  const getPlanLabel = () => {
    switch (userPlan) {
      case 'plan_plus': return t.planPlus;
      case 'plan_pro': return t.planPro;
      case 'plan_enterprise': return t.planEnterprise;
      default: return t.planFree;
    }
  };

  const getPlanColor = () => {
    switch (userPlan) {
      case 'plan_plus': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'plan_pro': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      case 'plan_enterprise': return 'bg-amber-500/10 text-amber-600 border-amber-200';
      default: return 'bg-secondary text-secondary-foreground border-secondary';
    }
  };

  // --- Language selection handler ---
  const handleLanguageSelect = async (lang: 'en' | 'vi') => {
    setSelectedLang(lang);
    await setLocale(lang);
  };

  const handleLanguageContinue = () => {
    if (!selectedLang) {
      toast({ title: t.langRequired, variant: 'destructive' });
      return;
    }
    goNext();
  };

  // --- Handlers ---
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: t.pwTooShort, description: t.minChars, variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t.pwNotMatch, variant: 'destructive' });
      return;
    }
    if (newPassword === '123456') {
      toast({ title: t.pwSameDefault, variant: 'destructive' });
      return;
    }
    setIsChangingPassword(true);
    const { data, error } = await supabase.functions.invoke('manage-users', {
      body: { action: 'update_password', user_id: userId, password: newPassword },
    });
    setIsChangingPassword(false);
    if (error || data?.error) {
      toast({ title: t.pwChangeFail, description: data?.error || error?.message, variant: 'destructive' });
      return;
    }
    toast({ title: t.pwChangeSuccess });
    goNext();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: t.invalidFormat, variant: 'destructive' }); return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: t.fileTooLarge, variant: 'destructive' }); return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);
    setSelectedFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validateInfo = () => {
    const errors: Record<string, boolean> = {};
    if (!yearBatch.trim()) errors.yearBatch = true;
    if (!major.trim()) errors.major = true;
    if (!phone.trim()) errors.phone = true;
    if (!skills.trim()) errors.skills = true;
    setInfoErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInfoNext = () => {
    if (!validateInfo()) {
      toast({ title: t.fillRequired, variant: 'destructive' });
      return;
    }
    goNext();
  };

  const fireCelebration = useCallback(() => {
    const duration = 3000;
    const end = Date.now() + duration;
    const colors = ['#0ea5e9', '#6366f1', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6'];
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors, zIndex: 99999 });
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors, zIndex: 99999 });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();
    confetti({ particleCount: 100, spread: 100, origin: { y: 0.6 }, colors, zIndex: 99999 });
  }, []);

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      let avatarUrl: string | undefined;
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${userId}/${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await r2Storage
          .from('avatars')
          .upload(filePath, selectedFile, { upsert: true, contentType: selectedFile.type });
        if (uploadError) throw uploadError;
        avatarUrl = uploadData?.publicUrl;
      }

      const updateData: Record<string, any> = {
        year_batch: yearBatch.trim() || null,
        major: major.trim() || null,
        phone: phone.trim() || null,
        skills: skills.trim() || null,
        bio: bio.trim() || null,
        onboarding_completed: true,
        must_change_password: false,
      };
      if (avatarUrl) updateData.avatar_url = avatarUrl;

      const { error } = await supabase.from('profiles').update(updateData).eq('id', userId);
      if (error) throw error;

      setShowCelebration(true);
      fireCelebration();

      setTimeout(async () => {
        toast({ title: t.completedToast, description: t.completedToastDesc });
        onComplete();
      }, 2500);
    } catch (error: any) {
      toast({ title: appT.common.error, description: error.message, variant: 'destructive' });
      setIsSaving(false);
    }
  };

  const stepLabels: Record<StepId, string> = {
    language: t.stepLang,
    welcome: t.stepWelcome,
    password: t.stepSecurity,
    info: t.stepInfo,
    finish: t.stepFinish,
  };

  const stepDescriptions: Record<StepId, string> = {
    language: t.stepLangDesc,
    welcome: t.stepWelcomeDesc,
    password: t.stepSecurityDesc,
    info: t.stepInfoDesc,
    finish: t.stepFinishDesc,
  };

  const getPasswordStrength = () => {
    if (!newPassword) return { level: 0, label: '', color: '' };
    let score = 0;
    if (newPassword.length >= 6) score++;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    if (score <= 2) return { level: score, label: t.pwWeak, color: 'bg-destructive' };
    if (score <= 3) return { level: score, label: t.pwMedium, color: 'bg-warning' };
    return { level: score, label: t.pwStrong, color: 'bg-success' };
  };

  const pwStrength = getPasswordStrength();

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="w-[95vw] max-w-[1200px] h-[92vh] max-h-[740px] p-0 overflow-hidden border-0 shadow-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex h-full">
          {/* ===== SIDEBAR ===== */}
          <div className="hidden md:flex w-[300px] shrink-0 relative overflow-hidden flex-col">
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/95 to-primary/80" />
            <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/5" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-white/5" />
            <div className="absolute top-1/2 right-0 w-24 h-24 rounded-full bg-white/5" />

            <div className="relative z-10 p-6 flex flex-col h-full">
              {/* Logo */}
              <div className="flex items-center gap-3 mb-10">
                <img src={tNexusTextWhite} alt="T-Nexus" className="h-7 object-contain" />
              </div>

              {/* Steps */}
              <div className="flex-1 space-y-0">
                {allSteps.map((step, idx) => {
                  const isDone = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;
                  return (
                    <div key={step}>
                      <div className={cn(
                        'flex items-center gap-3 py-3 px-3 rounded-xl transition-all duration-300',
                        isCurrent && 'bg-white/15 backdrop-blur-sm',
                      )}>
                        <div className={cn(
                          'w-9 h-9 rounded-xl flex items-center justify-center text-sm font-semibold transition-all duration-300 shrink-0',
                          isDone ? 'bg-white text-primary shadow-lg' :
                          isCurrent ? 'bg-white text-primary shadow-lg scale-110' :
                          'bg-white/10 text-white/40 border border-white/20'
                        )}>
                          {isDone ? <Check className="w-4 h-4" /> : stepIcons[step]}
                        </div>
                        <div className="min-w-0">
                          <p className={cn(
                            'text-sm font-semibold transition-colors',
                            isCurrent ? 'text-white' : isDone ? 'text-white/80' : 'text-white/40'
                          )}>
                            {stepLabels[step]}
                          </p>
                          <p className={cn(
                            'text-[11px] truncate',
                            isCurrent ? 'text-white/70' : 'text-white/30'
                          )}>
                            {stepDescriptions[step]}
                          </p>
                        </div>
                      </div>
                      {idx < allSteps.length - 1 && (
                        <div className="flex justify-center py-0.5">
                          <div className={cn(
                            'w-0.5 h-4 rounded-full transition-colors',
                            idx < currentStepIndex ? 'bg-white/50' : 'bg-white/15'
                          )} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* User card */}
              <div className="mt-auto pt-4 border-t border-white/15">
                <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
                  <Avatar className="h-9 w-9 border border-white/30">
                    {previewUrl ? (
                      <AvatarImage src={previewUrl} />
                    ) : (
                      <AvatarFallback className="bg-white/20 text-white text-xs font-bold">
                        {getInitials(userFullName)}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{userFullName}</p>
                    <p className="text-[10px] text-white/50 truncate">{userEmail}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===== CONTENT ===== */}
          <div className="flex-1 flex flex-col overflow-hidden bg-background">
            {/* Mobile step indicator */}
            <div className="md:hidden flex items-center gap-2 px-5 pt-4 pb-2">
              <img src={tNexusTextWhite} alt="T-Nexus" className="h-5 brightness-0 dark:brightness-100" />
              <div className="ml-auto flex items-center gap-1.5">
                {allSteps.map((_, idx) => (
                  <div key={idx} className={cn(
                    'h-1.5 rounded-full transition-all',
                    idx === currentStepIndex ? 'w-6 bg-primary' :
                    idx < currentStepIndex ? 'w-3 bg-primary/50' : 'w-3 bg-muted'
                  )} />
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* ===== LANGUAGE STEP ===== */}
              {currentStep === 'language' && (
                <div className="h-full flex flex-col items-center justify-center px-6 md:px-10">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                    <Globe className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-extrabold mb-2 text-center">
                    {t.langTitle}
                  </h2>
                  <p className="text-muted-foreground mb-8 text-center max-w-md">
                    {t.langSubtitle}
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mb-8">
                    {/* English */}
                    <button
                      onClick={() => handleLanguageSelect('en')}
                      className={cn(
                        'flex-1 flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-200 text-left',
                        selectedLang === 'en'
                          ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/40 hover:bg-muted/50'
                      )}
                    >
                      <span className="text-3xl">🇺🇸</span>
                      <div>
                        <p className="font-bold text-base">English</p>
                        <p className="text-xs text-muted-foreground">Use English interface</p>
                      </div>
                      {selectedLang === 'en' && (
                        <div className="ml-auto w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                    </button>

                    {/* Vietnamese */}
                    <button
                      onClick={() => handleLanguageSelect('vi')}
                      className={cn(
                        'flex-1 flex items-center gap-4 p-5 rounded-2xl border-2 transition-all duration-200 text-left',
                        selectedLang === 'vi'
                          ? 'border-primary bg-primary/5 shadow-lg ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/40 hover:bg-muted/50'
                      )}
                    >
                      <span className="text-3xl">🇻🇳</span>
                      <div>
                        <p className="font-bold text-base">Tiếng Việt</p>
                        <p className="text-xs text-muted-foreground">Sử dụng giao diện tiếng Việt</p>
                      </div>
                      {selectedLang === 'vi' && (
                        <div className="ml-auto w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-4 h-4 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  </div>

                  <Button
                    onClick={handleLanguageContinue}
                    disabled={!selectedLang}
                    size="lg"
                    className="w-full max-w-xs gap-2 h-12 text-base rounded-xl shadow-lg hover:shadow-xl transition-all"
                  >
                    {t.continueBtn}
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              )}

              {/* ===== WELCOME ===== */}
              {currentStep === 'welcome' && (
                <div className="h-full flex flex-col">
                  <div className="relative bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 px-8 pt-6 pb-2 flex justify-center">
                    <img src={welcomeImg} alt="Welcome" className="h-40 md:h-48 object-contain drop-shadow-lg" />
                    <div className="absolute top-4 left-8 w-8 h-8 rounded-lg bg-primary/10 animate-pulse" />
                    <div className="absolute bottom-8 right-12 w-6 h-6 rounded-full bg-accent/15 animate-pulse delay-500" />
                  </div>

                  <div className="flex-1 px-6 md:px-10 pb-6 flex flex-col items-center text-center">
                    <h2 className="text-2xl md:text-3xl font-extrabold mt-4 mb-1 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                      {t.welcomeTitle}
                    </h2>
                    <p className="text-muted-foreground mb-5 max-w-md">
                      {t.welcomeSubtitle.replace('{name}', userFullName)}
                    </p>

                    <div className="w-full max-w-xl grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
                      {/* Info card */}
                      <div className="bg-card border rounded-2xl p-4 text-left space-y-2.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t.accountInfo}</p>
                        <div className="flex items-center gap-2.5 text-sm">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <GraduationCap className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">{t.studentId}</p>
                            <p className="font-semibold text-sm">{userStudentId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 text-sm">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Mail className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-muted-foreground">{t.email}</p>
                            <p className="font-semibold text-sm truncate">{userEmail}</p>
                          </div>
                        </div>
                      </div>

                      {/* Plan card */}
                      <div className="border rounded-2xl p-4 text-left bg-gradient-to-br from-secondary/40 to-secondary/10 border-secondary/40">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t.currentPlan}</p>
                        <Badge className={cn('gap-1.5 px-3 py-1.5 text-sm border', getPlanColor())}>
                          <Sparkles className="w-4 h-4" />
                          {getPlanLabel()}
                        </Badge>
                      </div>
                    </div>

                    {/* Feature highlights */}
                    <div className="w-full max-w-xl grid grid-cols-4 gap-2 mb-6">
                      {[
                        { icon: <FolderKanban className="w-4 h-4" />, label: t.projectMgmt },
                        { icon: <ListChecks className="w-4 h-4" />, label: t.trackProgress },
                        { icon: <Users className="w-4 h-4" />, label: t.teamwork },
                        { icon: <MessageSquare className="w-4 h-4" />, label: t.messaging },
                      ].map((f, i) => (
                        <div key={i} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            {f.icon}
                          </div>
                          <p className="text-[10px] font-medium text-muted-foreground text-center leading-tight">{f.label}</p>
                        </div>
                      ))}
                    </div>

                    <Button onClick={goNext} size="lg" className="w-full max-w-xs gap-2 h-12 text-base rounded-xl shadow-lg hover:shadow-xl transition-all">
                      {t.startSetup}
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ===== PASSWORD ===== */}
              {currentStep === 'password' && (
                <div className="h-full flex flex-col">
                  <div className="relative bg-gradient-to-br from-warning/10 via-warning/5 to-transparent px-8 pt-6 pb-2 flex justify-center">
                    <img src={securityImg} alt="Security" className="h-32 md:h-40 object-contain drop-shadow-lg" />
                  </div>

                  <div className="flex-1 px-6 md:px-10 pb-6 flex flex-col items-center">
                    <div className="w-full max-w-md">
                      <div className="text-center mb-6">
                        <h2 className="text-2xl font-extrabold mb-1">{t.securityTitle}</h2>
                        <p className="text-muted-foreground text-sm">{t.securityDesc}</p>
                      </div>

                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-5">
                        <p className="text-xs font-semibold text-primary mb-1.5 flex items-center gap-1.5">
                          <Shield className="w-3.5 h-3.5" /> {t.securityTip}
                        </p>
                        <ul className="text-[11px] text-muted-foreground space-y-0.5">
                          <li>{t.securityTip1}</li>
                          <li>{t.securityTip2}</li>
                          <li>{t.securityTip3}</li>
                        </ul>
                        <p className="text-[10px] text-muted-foreground/70 mt-2 italic leading-relaxed">
                          {t.securityDisclaimer}
                        </p>
                      </div>

                      <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="newPassword" className="text-sm font-medium">{t.newPassword}</Label>
                          <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input id="newPassword" type={showPassword ? 'text' : 'password'} placeholder={t.minChars}
                              className="pl-10 pr-10 h-12 rounded-xl" value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)} required autoFocus />
                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          {newPassword && (
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden flex gap-0.5">
                                {[1, 2, 3, 4, 5].map(i => (
                                  <div key={i} className={cn('flex-1 rounded-full transition-colors', i <= pwStrength.level ? pwStrength.color : 'bg-muted')} />
                                ))}
                              </div>
                              <span className={cn('text-[10px] font-medium', pwStrength.level <= 2 ? 'text-destructive' : pwStrength.level <= 3 ? 'text-warning' : 'text-success')}>
                                {pwStrength.label}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="confirmPassword" className="text-sm font-medium">{t.confirmPassword}</Label>
                          <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input id="confirmPassword" type={showConfirm ? 'text' : 'password'} placeholder={t.reenterPassword}
                              className="pl-10 pr-10 h-12 rounded-xl" value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)} required />
                            <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          {confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-[11px] text-destructive mt-0.5">{t.passwordMismatch}</p>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <Button type="button" variant="outline" onClick={goBack} className="h-12 gap-2 rounded-xl text-base flex-1">
                            <ChevronLeft className="w-5 h-5" /> {t.goBack}
                          </Button>
                          <Button type="submit" disabled={isChangingPassword} className="h-12 gap-2 rounded-xl text-base shadow-lg flex-[2]">
                            {isChangingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                            {t.continueNext} <ChevronRight className="w-5 h-5" />
                          </Button>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== INFO ===== */}
              {currentStep === 'info' && (
                <div className="h-full flex flex-col">
                  <div className="relative bg-gradient-to-br from-primary/5 via-accent/5 to-secondary/5 px-8 pt-4 pb-1 flex justify-center">
                    <img src={profileImg} alt="Profile" className="h-24 md:h-28 object-contain drop-shadow-lg" />
                  </div>

                  <div className="flex-1 px-6 md:px-10 pb-6 overflow-y-auto">
                    <div className="w-full max-w-lg mx-auto">
                      <div className="text-center mb-4">
                        <h2 className="text-xl font-extrabold mb-0.5">{t.infoTitle}</h2>
                        <p className="text-muted-foreground text-sm">{t.infoDesc}</p>
                      </div>

                      {/* Avatar */}
                      <div className="flex flex-col items-center mb-5">
                        <div className="relative group cursor-pointer mb-2" onClick={() => fileInputRef.current?.click()}>
                          <Avatar className="h-20 w-20 border-4 border-background shadow-xl ring-2 ring-primary/20">
                            {previewUrl ? (
                              <AvatarImage src={previewUrl} alt="Preview" />
                            ) : (
                              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary text-xl font-bold">
                                {getInitials(userFullName)}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-6 h-6 text-white" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
                            <Camera className="w-3.5 h-3.5" />
                          </div>
                        </div>
                        <button type="button" onClick={() => fileInputRef.current?.click()}
                          className="text-xs text-primary font-medium hover:underline">
                          {previewUrl ? t.changeAvatar : t.uploadAvatar}
                        </button>
                        <p className="text-[10px] text-muted-foreground">{t.avatarOptional}</p>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                      </div>

                      {/* Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          { id: 'yearBatch', label: t.fieldBatch, icon: <GraduationCap className="w-4 h-4" />, placeholder: t.fieldBatchPlaceholder, value: yearBatch, setter: setYearBatch },
                          { id: 'major', label: t.fieldMajor, icon: <BookOpen className="w-4 h-4" />, placeholder: t.fieldMajorPlaceholder, value: major, setter: setMajor },
                          { id: 'phone', label: t.fieldPhone, icon: <Phone className="w-4 h-4" />, placeholder: t.fieldPhonePlaceholder, value: phone, setter: setPhone },
                          { id: 'skills', label: t.fieldSkills, icon: <Award className="w-4 h-4" />, placeholder: t.fieldSkillsPlaceholder, value: skills, setter: setSkills },
                        ].map(field => (
                          <div key={field.id} className={cn(
                            'rounded-xl border p-3 transition-all',
                            infoErrors[field.id] ? 'border-destructive bg-destructive/5' : 'bg-card hover:shadow-sm'
                          )}>
                            <Label htmlFor={field.id} className="text-xs flex items-center gap-1.5 mb-1.5 font-semibold">
                              <span className="text-primary">{field.icon}</span>
                              {field.label} <span className="text-destructive">*</span>
                            </Label>
                            <Input id={field.id} placeholder={field.placeholder}
                              value={field.value}
                              onChange={(e) => { field.setter(e.target.value); setInfoErrors(p => ({ ...p, [field.id]: false })); }}
                              className={cn('h-9 border-0 bg-muted/50 rounded-lg focus-visible:ring-1', infoErrors[field.id] && 'bg-destructive/10')} />
                          </div>
                        ))}
                      </div>

                      {/* Bio */}
                      <div className="mt-3 rounded-xl border bg-card p-3">
                        <Label htmlFor="bio" className="text-xs font-semibold flex items-center gap-1.5 mb-1.5">
                          <Sparkles className="w-4 h-4 text-primary" /> {t.fieldBio}
                          <span className="text-muted-foreground font-normal">{t.fieldBioOptional}</span>
                        </Label>
                        <Textarea id="bio" placeholder={t.fieldBioPlaceholder}
                          value={bio} onChange={(e) => setBio(e.target.value)}
                          rows={2} className="resize-none border-0 bg-muted/50 rounded-lg focus-visible:ring-1" />
                      </div>

                      <div className="flex gap-3 mt-4">
                        <Button variant="outline" onClick={goBack} className="h-12 gap-2 rounded-xl text-base flex-1">
                          <ChevronLeft className="w-5 h-5" /> {t.goBack}
                        </Button>
                        <Button onClick={handleInfoNext} className="h-12 gap-2 rounded-xl text-base shadow-lg flex-[2]">
                          {t.continueNext} <ChevronRight className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== FINISH ===== */}
              {currentStep === 'finish' && (
                <div className="h-full flex flex-col">
                  <div className="relative bg-gradient-to-br from-primary/5 via-accent/10 to-primary/5 px-8 pt-6 pb-2 flex justify-center overflow-hidden">
                    <img src={completeImg} alt="Complete" className="h-36 md:h-44 object-contain drop-shadow-lg" />
                    <div className="absolute top-6 left-[20%] w-2 h-2 rounded-full bg-primary/30 animate-bounce" />
                    <div className="absolute top-10 right-[25%] w-3 h-3 rounded-full bg-accent/30 animate-bounce delay-300" />
                    <div className="absolute bottom-4 left-[30%] w-2 h-2 rounded-sm bg-warning/30 animate-bounce delay-500 rotate-45" />
                  </div>

                  <div className="flex-1 px-6 md:px-10 pb-6 flex flex-col items-center">
                    <h2 className="text-2xl md:text-3xl font-extrabold mt-3 mb-1 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      {t.finishTitle}
                    </h2>
                    <p className="text-muted-foreground mb-5 text-center max-w-md">{t.finishDesc}</p>

                    {/* Summary card */}
                    <div className="w-full max-w-lg bg-card border rounded-2xl overflow-hidden shadow-sm mb-5">
                      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-3 flex items-center gap-3 border-b">
                        <Avatar className="h-12 w-12 border-2 border-background shadow">
                          {previewUrl ? (
                            <AvatarImage src={previewUrl} />
                          ) : (
                            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-bold">
                              {getInitials(userFullName)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-bold text-base">{userFullName}</p>
                          <p className="text-xs text-muted-foreground">{userStudentId} • {userEmail}</p>
                        </div>
                        <Badge className={cn('gap-1 text-xs ml-auto shrink-0 border', getPlanColor())}>
                          <Sparkles className="w-3 h-3" />
                          {getPlanLabel()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-0 divide-x divide-y">
                        {[
                          { icon: <GraduationCap className="w-3.5 h-3.5" />, label: t.batchLabel, value: yearBatch },
                          { icon: <BookOpen className="w-3.5 h-3.5" />, label: t.majorLabel, value: major },
                          { icon: <Phone className="w-3.5 h-3.5" />, label: t.phoneLabel, value: phone },
                          { icon: <Award className="w-3.5 h-3.5" />, label: t.skillsLabel, value: skills },
                        ].map((item, i) => (
                          <div key={i} className="px-4 py-2.5">
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-0.5">
                              <span className="text-primary">{item.icon}</span> {item.label}
                            </p>
                            <p className="text-sm font-medium truncate">{item.value}</p>
                          </div>
                        ))}
                      </div>

                      {bio && (
                        <div className="px-4 py-2.5 border-t">
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-0.5">
                            <Sparkles className="w-3 h-3 text-primary" /> {t.bioLabel}
                          </p>
                          <p className="text-sm text-muted-foreground">{bio}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 w-full max-w-xs">
                      <Button variant="outline" onClick={goBack} className="h-12 gap-2 rounded-xl text-base flex-1">
                        <ChevronLeft className="w-5 h-5" /> {t.goBack}
                      </Button>
                      <Button onClick={handleFinish} disabled={isSaving} size="lg"
                        className="gap-2 h-12 text-base rounded-xl shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-primary/90 flex-[2]">
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
                        {t.enterSystem}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Celebration Overlay */}
              {showCelebration && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm animate-fade-in">
                  <div className="relative mb-6">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center animate-scale-in">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                        <Check className="w-8 h-8 text-primary-foreground" />
                      </div>
                    </div>
                    <div className="absolute -top-2 -right-2 text-2xl animate-bounce">🎉</div>
                    <div className="absolute -bottom-1 -left-2 text-2xl animate-bounce" style={{ animationDelay: '0.2s' }}>✨</div>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-2 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                    {t.celebrationTitle}
                  </h2>
                  <p className="text-muted-foreground text-center max-w-sm animate-fade-in" style={{ animationDelay: '0.5s' }}>
                    {t.celebrationDesc}
                  </p>
                  <div className="mt-6 flex gap-1 animate-fade-in" style={{ animationDelay: '0.7s' }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
