import { useState, useEffect, useCallback } from 'react';
import { Clock, RotateCcw, CheckCircle2, ShieldAlert, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface OtpVerifyScreenProps {
  email: string;
  userId: string;
  fullName: string;
  studentId: string;
  onVerified: () => void;
  onBack: () => void;
}

const OTP_EXPIRY_SECONDS = 5 * 60;
const RESEND_COOLDOWN = 60;

export function OtpVerifyScreen({ email, userId, fullName, studentId, onVerified, onBack }: OtpVerifyScreenProps) {
  const { toast } = useToast();
  const { translations: t } = useLanguage();
  const a = t.auth;
  const [otpValue, setOtpValue] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(OTP_EXPIRY_SECONDS);
  const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN);

  useEffect(() => {
    if (isVerified || countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [isVerified, countdown]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleVerify = useCallback(async (code: string) => {
    if (code.length !== 6 || isVerifying) return;
    setIsVerifying(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.functions.invoke('signup-email-otp', {
        body: { action: 'verify_code', email, user_id: userId, code },
      });

      if (error || !data?.success) {
        const msg = data?.error || error?.message || a.otpVerifyFailed;
        setErrorMsg(msg);
        if (data?.max_attempts) setCountdown(0);
        setOtpValue('');
      } else {
        setIsVerified(true);
        toast({ title: a.otpVerifiedTitle, description: a.otpVerifiedDesc });
      }
    } catch {
      setErrorMsg(a.otpErrorOccurred);
    } finally {
      setIsVerifying(false);
    }
  }, [email, userId, isVerifying, toast, a]);

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.functions.invoke('signup-email-otp', {
        body: { action: 'resend_code', email, user_id: userId },
      });

      if (error || !data?.success) {
        toast({ title: a.otpError, description: data?.error || a.otpResendFailed, variant: 'destructive' });
      } else {
        setResendCooldown(RESEND_COOLDOWN);
        setCountdown(OTP_EXPIRY_SECONDS);
        setOtpValue('');
        toast({ title: a.otpResendSuccess });
      }
    } catch {
      toast({ title: a.otpError, description: a.otpResendError, variant: 'destructive' });
    } finally {
      setIsResending(false);
    }
  }, [email, userId, resendCooldown, isResending, toast, a]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (isVerified) {
    return (
      <div className="text-center space-y-3 py-5 px-4">
        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
        <div>
          <h2 className="text-base font-heading font-bold text-emerald-600 dark:text-emerald-400">{a.otpVerifiedTitle}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{a.otpVerifiedDesc}</p>
        </div>
        <div className="bg-muted/50 rounded-md p-2 text-left text-xs space-y-0.5">
          <p><span className="text-muted-foreground">{a.otpVerifiedFullName}</span> <span className="font-medium">{fullName}</span></p>
          <p><span className="text-muted-foreground">{a.otpVerifiedStudentId}</span> <span className="font-medium">{studentId}</span></p>
          <p><span className="text-muted-foreground">{a.otpVerifiedEmail}</span> <span className="font-medium">{email}</span></p>
        </div>
        <Button size="sm" className="w-full" onClick={onVerified}>
          {a.otpLoginNow}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 py-4 px-4">
      <div className="text-center space-y-1">
        <h2 className="text-base font-heading font-semibold">{a.otpTitle}</h2>
        <p className="text-xs text-muted-foreground">
          {a.otpSubtitle} <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      {/* Timer */}
      <div className="flex items-center justify-center gap-1.5 text-xs">
        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
        {countdown > 0 ? (
          <span className="text-muted-foreground">{a.otpExpiresIn} <span className="font-semibold text-foreground">{formatTime(countdown)}</span></span>
        ) : (
          <span className="text-destructive font-medium">{a.otpExpired}</span>
        )}
      </div>

      {/* OTP Input */}
      <div className="flex justify-center">
        <InputOTP
          maxLength={6}
          value={otpValue}
          onChange={(val) => {
            setOtpValue(val);
            setErrorMsg('');
            if (val.length === 6) handleVerify(val);
          }}
          disabled={isVerifying || countdown <= 0}
        >
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map(i => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="flex items-center gap-1.5 justify-center text-xs text-destructive">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Verifying */}
      {isVerifying && (
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>{a.otpVerifying}</span>
        </div>
      )}

      {/* Resend + Back */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
          onClick={onBack}
        >
          <ArrowLeft className="w-3 h-3" /> {a.otpBack}
        </button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResend}
          disabled={resendCooldown > 0 || isResending}
          className="text-xs h-7 px-2"
        >
          {isResending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RotateCcw className="w-3 h-3 mr-1" />}
          {resendCooldown > 0 ? `${a.otpResendIn} (${resendCooldown}s)` : a.otpResend}
        </Button>
      </div>
    </div>
  );
}
