import { useState, useEffect } from 'react';
import uehLogo from '@/assets/t-nexus-logo-dark.png';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Tiny delay so the fade-in feels intentional, not like a flash
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.4s ease-out',
      }}
    >
      {/* Logo with subtle pulse */}
      <div className="ls-logo-wrap">
        <div className="ls-ring" />
        <img
          src={uehLogo}
          alt="T-Nexus"
          className="ls-logo"
        />
      </div>

      {/* Message */}
      <p
        className="mt-6 text-sm font-medium text-muted-foreground"
        style={{ letterSpacing: '0.01em' }}
      >
        {message}
      </p>

      {/* Minimal 3 dots */}
      <div className="flex items-center gap-1 mt-3">
        <span className="ls-dot" style={{ animationDelay: '0s' }} />
        <span className="ls-dot" style={{ animationDelay: '0.16s' }} />
        <span className="ls-dot" style={{ animationDelay: '0.32s' }} />
      </div>

      <style>{`
        .ls-logo-wrap {
          position: relative;
          width: 72px;
          height: 72px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ls-ring {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          border: 1.5px solid hsl(var(--primary) / 0.15);
          animation: ls-ring-spin 3s linear infinite;
          will-change: transform;
        }

        /* Single arc highlight on the ring */
        .ls-ring::before {
          content: '';
          position: absolute;
          inset: -1.5px;
          border-radius: 9999px;
          border: 1.5px solid transparent;
          border-top-color: hsl(var(--primary) / 0.6);
          animation: inherit;
          animation-direction: reverse;
          animation-duration: 1.6s;
        }

        @keyframes ls-ring-spin {
          to { transform: rotate(360deg); }
        }

        .ls-logo {
          width: 36px;
          height: 36px;
          object-fit: contain;
          opacity: 0.9;
        }

        /* ── Minimal dots ── */
        .ls-dot {
          display: block;
          width: 4px;
          height: 4px;
          border-radius: 9999px;
          background: hsl(var(--primary) / 0.5);
          animation: ls-dot-pulse 1s ease-in-out infinite;
          will-change: opacity;
        }

        @keyframes ls-dot-pulse {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 1; }
        }

        /* ── Reduced motion ── */
        @media (prefers-reduced-motion: reduce) {
          .ls-ring,
          .ls-ring::before,
          .ls-dot {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
