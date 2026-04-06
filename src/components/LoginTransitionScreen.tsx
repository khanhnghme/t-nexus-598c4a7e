import { useState, useEffect, useMemo, useRef } from 'react';
import tNexusLogo from '@/assets/t-nexus-logo.png';

interface LoginTransitionScreenProps {
  userName?: string;
  userAvatarUrl?: string | null;
  onComplete: () => void;
  duration?: number;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const STEPS = [
  'Connecting to services...',
  'Loading your data...',
  'Preparing your workspace...',
  'Almost ready...',
];

export default function LoginTransitionScreen({ userName, userAvatarUrl, onComplete, duration = 5000 }: LoginTransitionScreenProps) {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter');
  const [stepIndex, setStepIndex] = useState(0);
  const greeting = useMemo(() => getGreeting(), []);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  // Phase transitions
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 80);
    const t2 = setTimeout(() => setPhase('exit'), duration - 700);
    const t3 = setTimeout(() => onCompleteRef.current(), duration);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [duration]);

  // Step text rotation
  useEffect(() => {
    const stepDuration = (duration - 800) / STEPS.length;
    const timers = STEPS.map((_, i) =>
      setTimeout(() => setStepIndex(i), i * stepDuration)
    );
    return () => timers.forEach(clearTimeout);
  }, [duration]);

  const initials = userName?.charAt(0)?.toUpperCase() || '?';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        opacity: phase === 'exit' ? 0 : phase === 'enter' ? 0 : 1,
        transition: 'opacity 0.6s ease-in-out',
        background: 'linear-gradient(160deg, hsl(228 27% 8%) 0%, hsl(228 22% 12%) 50%, hsl(228 27% 10%) 100%)',
      }}
    >
      {/* Subtle decorative gradient blobs — no blur, just radial gradients */}
      <div
        className="absolute -top-24 -right-24 w-80 h-80 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsl(272 64% 69% / 0.08), transparent 70%)',
        }}
      />
      <div
        className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, hsl(228 63% 43% / 0.06), transparent 70%)',
        }}
      />

      {/* Main content */}
      <div
        className="relative flex flex-col items-center gap-6 px-8 text-center"
        style={{
          transform: phase === 'enter'
            ? 'translateY(20px) scale(0.97)'
            : phase === 'exit'
              ? 'translateY(-10px) scale(1.02)'
              : 'translateY(0) scale(1)',
          opacity: phase === 'visible' ? 1 : 0,
          transition: 'transform 0.6s ease-out, opacity 0.6s ease-out',
        }}
      >
        {/* Avatar */}
        <div className="relative">
          <div
            className="w-24 h-24 rounded-full overflow-hidden"
            style={{
              border: '2px solid hsl(0 0% 100% / 0.15)',
              boxShadow: '0 8px 32px hsl(0 0% 0% / 0.3)',
            }}
          >
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, hsl(228 50% 25%), hsl(228 45% 32%))' }}
              >
                <span className="text-3xl font-bold text-white/90">{initials}</span>
              </div>
            )}
          </div>
          {/* T-Nexus badge */}
          <div
            className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full flex items-center justify-center"
            style={{
              background: 'hsl(228 27% 12%)',
              border: '2px solid hsl(0 0% 100% / 0.2)',
            }}
          >
            <img src={tNexusLogo} alt="T-Nexus" className="w-6 h-6 object-contain" />
          </div>
        </div>

        {/* Greeting */}
        <div className="space-y-1">
          <p className="text-base text-white/60 font-medium tracking-wide">
            {greeting},
          </p>
          {userName && (
            <h1
              className="text-3xl sm:text-4xl font-bold tracking-tight"
              style={{ color: 'hsl(0 0% 96%)' }}
            >
              {userName}
            </h1>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 w-48">
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.15))' }} />
          <div className="w-1 h-1 rounded-full" style={{ background: 'hsl(228 63% 55% / 0.6)' }} />
          <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, hsl(0 0% 100% / 0.15), transparent)' }} />
        </div>

        {/* Loading indicator — simple spinner + step text */}
        <div className="flex flex-col items-center gap-3 mt-2">
          <div className="lt-spinner" />
          <p
            className="text-xs text-white/40 font-medium tracking-wide h-4"
            style={{ transition: 'opacity 0.3s' }}
          >
            {STEPS[stepIndex]}
          </p>
        </div>

        {/* Branding */}
        <p className="text-[10px] text-white/25 tracking-[0.2em] uppercase mt-6 font-medium">
          T-Nexus
        </p>
      </div>

      <style>{`
        .lt-spinner {
          width: 28px;
          height: 28px;
          border-radius: 9999px;
          border: 2px solid hsl(0 0% 100% / 0.08);
          border-top-color: hsl(228 63% 55% / 0.7);
          animation: lt-spin 1s linear infinite;
          will-change: transform;
        }

        @keyframes lt-spin {
          to { transform: rotate(360deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .lt-spinner {
            animation: none !important;
            border-top-color: hsl(228 63% 55% / 0.5);
          }
        }
      `}</style>
    </div>
  );
}
