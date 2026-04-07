import React, { useState, useEffect, useCallback, useMemo } from 'react';
import SplashScreen from '@/components/SplashScreen';
import MandatoryNotification from '@/components/MandatoryNotification';
import { useFullLockdown } from '@/hooks/useFullLockdown';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  Award,
  BarChart3,
  Bell,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Construction,
  Download,
  FolderOpen,
  Globe,
  Layers3,
  ListChecks,
  Loader2,
  Lock,
  Play,
  Search,
  Shield,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users,
  X,
  XCircle,
  Table2,
  MessageSquareOff,
  FolderArchive,
  FileQuestion,
  LayoutDashboard,
  BellRing,
  FolderCheck,
  Trophy,
  CheckCircle2,
  Check,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import LoadingScreen from '@/components/LoadingScreen';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageToggle from '@/components/LanguageToggle';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import tNexusLogo from '@/assets/t-nexus-logo.png';
import tNexusTextWhite from '@/assets/t-nexus-text-white.png';
import introPage1 from '@/assets/intro-page1-overview.png';
import introPage2 from '@/assets/intro-page2-tasks.png';
import introPage3 from '@/assets/intro-page3-scoring.png';
import introPage4 from '@/assets/intro-page4-project.png';
import introPage5 from '@/assets/intro-page5-advanced.png';
import introP1Workflow from '@/assets/intro-p1-workflow.png';
import introP1Roles from '@/assets/intro-p1-roles.png';
import introP1Features from '@/assets/intro-p1-features.png';
import introP1Multiplatform from '@/assets/intro-p1-multiplatform.png';
import introP2Kanban from '@/assets/intro-p2-kanban.png';
import introP2Deadline from '@/assets/intro-p2-deadline.png';
import introP2Submission from '@/assets/intro-p2-submission.png';
import introP2Notes from '@/assets/intro-p2-notes.png';
import introP3Formula from '@/assets/intro-p3-formula.png';
import introP3Weights from '@/assets/intro-p3-weights.png';
import introP3Appeal from '@/assets/intro-p3-appeal.png';
import introP3Leaderboard from '@/assets/intro-p3-leaderboard.png';
import introP4Team from '@/assets/intro-p4-team.png';
import introP4Stages from '@/assets/intro-p4-stages.png';
import introP4Resources from '@/assets/intro-p4-resources.png';
import introP4Sharing from '@/assets/intro-p4-sharing.png';
import introP5Ai from '@/assets/intro-p5-ai.png';
import introP5Notifications from '@/assets/intro-p5-notifications.png';
import efficiencyBefore from '@/assets/efficiency-before.png';
import landingPreview from '@/assets/landing-preview.png';
import introP5Backup from '@/assets/intro-p5-backup.png';
import introP5Meeting from '@/assets/intro-p5-meeting.png';
import saasAiAssistant from '@/assets/card-ai-assistant.png';
import saasMeetingNotes from '@/assets/card-meeting-notes.png';
import saasScoringSignals from '@/assets/card-scoring-signals.png';
import saasNotifications from '@/assets/card-notifications.png';
import saasTaskManagement from '@/assets/card-task-management.png';
import saasKnowledgeBase from '@/assets/card-knowledge-base.png';
import saasScoringFormula from '@/assets/card-scoring-formula.png';
import saasProjects from '@/assets/card-projects.png';
import saasSharing from '@/assets/card-sharing.png';
import saasInsights from '@/assets/card-insights.png';

const colorVar = (token: string, alpha?: number) =>
  alpha === undefined ? `hsl(var(${token}))` : `hsl(var(${token}) / ${alpha})`;

type LandingNavItem = {
  label: string;
  href: string;
  hasChevron?: boolean;
};

type LandingSignal = {
  label: string;
  icon: LucideIcon;
  note: string;
  accent: string;
  positionClass: string;
  motionDelayMs?: number;
  motionDurationMs?: number;
};

type LandingBentoCard = {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  overlay?: string;
  icon: LucideIcon;
  accent: string;
  wide?: boolean;
};

type SocialQuote = {
  brand: string;
  quote: string;
  role: string;
};

const SIGNAL_ICONS = [Sparkles, FolderOpen, Award, Clock];
const SIGNAL_ACCENTS = ['--landing-blue', '--landing-purple', '--landing-orange', '--landing-yellow'];
const SIGNAL_POSITIONS = ['left-[6%] top-[16%]', 'left-[4%] top-[52%]', 'right-[6%] top-[16%]', 'right-[4%] top-[52%]'];
const SIGNAL_DELAYS = [100, 700, 1200, 900];
const SIGNAL_DURATIONS = [7200, 7600, 7800, 7400];

const ASSISTANT_IMAGES = [saasAiAssistant, saasMeetingNotes, saasScoringSignals, saasNotifications];
const ASSISTANT_ICONS = [Sparkles, Calendar, TrendingUp, Bell];
const ASSISTANT_ACCENTS = ['--landing-blue', '--landing-purple', '--landing-orange', '--landing-teal'];

const WORKSPACE_IMAGES = [saasTaskManagement, saasKnowledgeBase, saasScoringFormula, saasProjects, saasSharing, saasInsights];
const WORKSPACE_ICONS = [ListChecks, Search, Target, Layers3, Globe, BarChart3];
const WORKSPACE_ACCENTS = ['--landing-teal', '--landing-blue', '--landing-orange', '--landing-purple', '--landing-pink', '--landing-yellow'];
const WORKSPACE_WIDE = [true, false, false, true, false, false];

const STATS_ICONS = [Users, Award, FolderOpen, ListChecks, Globe, Star];

const ALL_INTRO_IMAGES = [
  introPage1, introPage2, introPage3, introPage4, introPage5,
  introP1Workflow, introP1Roles, introP1Features, introP1Multiplatform,
  introP2Kanban, introP2Deadline, introP2Submission, introP2Notes,
  introP3Formula, introP3Weights, introP3Appeal, introP3Leaderboard,
  introP4Team, introP4Stages, introP4Resources, introP4Sharing,
  introP5Ai, introP5Notifications, introP5Backup, introP5Meeting,
];

let preloadedIntroImages = false;
function preloadIntroImages() {
  if (preloadedIntroImages) return;
  preloadedIntroImages = true;
  ALL_INTRO_IMAGES.forEach((src) => {
    const img = new Image();
    img.src = src;
  });
}

function Page1Overview() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="shrink-0 text-center">
        <h3 className="text-2xl font-bold text-foreground">System Overview</h3>
        <p className="text-xs text-muted-foreground">T-Nexus — Team collaboration platform for students</p>
      </div>
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="w-[35%] flex-shrink-0 overflow-hidden rounded-xl" style={{ animation: 'fade-in 0.4s ease-out both' }}>
          <img src={introPage1} alt="T-Nexus overview" className="h-full w-full rounded-xl object-cover" />
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-3">
          {[
            { img: introP1Workflow, label: 'Workflow' },
            { img: introP1Roles, label: 'System Roles' },
            { img: introP1Features, label: 'Key Features' },
            { img: introP1Multiplatform, label: 'Multi-platform' },
          ].map((feature, index) => (
            <div key={feature.label} className="relative overflow-hidden rounded-xl border border-border/40 bg-muted/20" style={{ animation: `fade-in 0.4s ease-out ${100 + index * 100}ms both` }}>
              <img src={feature.img} alt={feature.label} className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent px-3 py-2">
                <p className="text-xs font-semibold text-foreground">{feature.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Page2Tasks() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="shrink-0 text-center">
        <h3 className="text-2xl font-bold text-foreground">Task Management</h3>
        <p className="text-xs text-muted-foreground">Assign, track and complete work efficiently</p>
      </div>
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="w-[35%] flex-shrink-0 overflow-hidden rounded-xl" style={{ animation: 'fade-in 0.4s ease-out both' }}>
          <img src={introPage2} alt="Task management" className="h-full w-full rounded-xl object-cover" />
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-3">
          {[
            { img: introP2Kanban, label: 'Kanban Board' },
            { img: introP2Deadline, label: 'Deadline & Timeline' },
            { img: introP2Submission, label: 'Multi-format Submission' },
            { img: introP2Notes, label: 'Notes & Comments' },
          ].map((feature, index) => (
            <div key={feature.label} className="relative overflow-hidden rounded-xl border border-border/40 bg-muted/20" style={{ animation: `fade-in 0.4s ease-out ${100 + index * 100}ms both` }}>
              <img src={feature.img} alt={feature.label} className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent px-3 py-2">
                <p className="text-xs font-semibold text-foreground">{feature.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Page3Scoring() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="shrink-0 text-center">
        <h3 className="text-2xl font-bold text-foreground">Scoring System</h3>
        <p className="text-xs text-muted-foreground">Automated, fair and transparent grading</p>
      </div>
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="w-[35%] flex-shrink-0 overflow-hidden rounded-xl" style={{ animation: 'fade-in 0.4s ease-out both' }}>
          <img src={introPage3} alt="Scoring system" className="h-full w-full rounded-xl object-cover" />
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-3">
          {[
            { img: introP3Formula, label: 'Scoring Formula' },
            { img: introP3Weights, label: 'Weights & Comparison' },
            { img: introP3Appeal, label: 'Score Appeal' },
            { img: introP3Leaderboard, label: 'Leaderboard' },
          ].map((feature, index) => (
            <div key={feature.label} className="relative overflow-hidden rounded-xl border border-border/40 bg-muted/20" style={{ animation: `fade-in 0.4s ease-out ${100 + index * 100}ms both` }}>
              <img src={feature.img} alt={feature.label} className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent px-3 py-2">
                <p className="text-xs font-semibold text-foreground">{feature.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Page4Project() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="shrink-0 text-center">
        <h3 className="text-2xl font-bold text-foreground">Project Management</h3>
        <p className="text-xs text-muted-foreground">Organize teams and resources effectively</p>
      </div>
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="w-[35%] flex-shrink-0 overflow-hidden rounded-xl" style={{ animation: 'fade-in 0.5s ease-out both' }}>
          <img src={introPage4} alt="Project management" className="h-full w-full rounded-xl object-cover" />
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-3">
          {[
            { img: introP4Team, label: 'Team Structure' },
            { img: introP4Stages, label: 'Project Stages' },
            { img: introP4Resources, label: 'Project Resources' },
            { img: introP4Sharing, label: 'Sharing & Public' },
          ].map((feature, index) => (
            <div key={feature.label} className="relative overflow-hidden rounded-xl border border-border/40 bg-muted/20" style={{ animation: `fade-in 0.4s ease-out ${100 + index * 100}ms both` }}>
              <img src={feature.img} alt={feature.label} className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent px-3 py-2">
                <p className="text-xs font-semibold text-foreground">{feature.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Page5Advanced() {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="shrink-0 text-center">
        <h3 className="text-2xl font-bold text-foreground">Advanced Features</h3>
        <p className="text-xs text-muted-foreground">Professional support tools</p>
      </div>
      <div className="flex min-h-0 flex-1 gap-3">
        <div className="w-[35%] flex-shrink-0 overflow-hidden rounded-xl" style={{ animation: 'fade-in 0.5s ease-out both' }}>
          <img src={introPage5} alt="Advanced features" className="h-full w-full rounded-xl object-cover" />
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-3">
          {[
            { img: introP5Ai, label: 'AI Assistant' },
            { img: introP5Notifications, label: 'Realtime Notifications' },
            { img: introP5Backup, label: 'Backup & Security' },
            { img: introP5Meeting, label: 'Video Meetings' },
          ].map((feature, index) => (
            <div key={feature.label} className="relative overflow-hidden rounded-xl border border-border/40 bg-muted/20" style={{ animation: `fade-in 0.4s ease-out ${100 + index * 100}ms both` }}>
              <img src={feature.img} alt={feature.label} className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 to-transparent px-3 py-2">
                <p className="text-xs font-semibold text-foreground">{feature.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const introPageComponents = [Page1Overview, Page2Tasks, Page3Scoring, Page4Project, Page5Advanced];

export default function Landing() {
  const { isLocked, isChecking, message: lockdownMessage, endAt: lockdownEndAt } = useFullLockdown();
  const { translations: t, localizedPath: lp, locale } = useLanguage();
  const tl = t.landing;
  const tc = t.common;
  const tn = t.nav;
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('t-nexus-splash-shown'));
  const [isInitializing, setIsInitializing] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [introVisible, setIntroVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageDirection, setPageDirection] = useState<'next' | 'prev'>('next');
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [videoOpacity, setVideoOpacity] = useState(0);
  const [videoUrl, setVideoUrl] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [dashboardVideoElement, setDashboardVideoElement] = useState<HTMLVideoElement | null>(null);
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [hoveredWordIndex, setHoveredWordIndex] = useState<number | null>(null);

  // ── Derive all constant arrays from translations ──
  const NAV_ITEMS: LandingNavItem[] = useMemo(() => [
    { label: tn.product, href: '#workspace-grid', hasChevron: true },
    { label: tn.ai, href: '#assistant-grid', hasChevron: true },
    { label: tn.solutions, href: '#social-proof', hasChevron: true },
    { label: tn.resources, href: '#resources', hasChevron: true },
    { label: tn.enterprise, href: '#efficiency' },
    { label: tn.pricing, href: lp('/pricing') },
  ], [tn, lp]);

  const HERO_SIGNALS: LandingSignal[] = useMemo(() =>
    (tl.heroSignals as { label: string; note: string }[]).map((s, i) => ({
      label: s.label, note: s.note, icon: SIGNAL_ICONS[i], accent: SIGNAL_ACCENTS[i],
      positionClass: SIGNAL_POSITIONS[i], motionDelayMs: SIGNAL_DELAYS[i], motionDurationMs: SIGNAL_DURATIONS[i],
    })), [tl]);

  const LOGO_WALL_ROWS: string[][] = useMemo(() => tl.logoWallRows, [tl]);

  const ASSISTANT_CARDS: LandingBentoCard[] = useMemo(() =>
    (tl.assistantCards as { eyebrow: string; title: string; description: string }[]).map((c, i) => ({
      ...c, image: ASSISTANT_IMAGES[i], icon: ASSISTANT_ICONS[i], accent: ASSISTANT_ACCENTS[i],
    })), [tl]);

  const WORKSPACE_CARDS: LandingBentoCard[] = useMemo(() =>
    (tl.workspaceCards as { eyebrow: string; title: string; description: string }[]).map((c, i) => ({
      ...c, image: WORKSPACE_IMAGES[i], icon: WORKSPACE_ICONS[i], accent: WORKSPACE_ACCENTS[i], wide: WORKSPACE_WIDE[i],
    })), [tl]);

  const SOCIAL_QUOTES: SocialQuote[] = useMemo(() => tl.socialQuotes, [tl]);

  const STATS_MARQUEE = useMemo(() =>
    (tl.stats as string[]).map((text, i) => ({ icon: STATS_ICONS[i], text })), [tl]);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveWordIndex((current) => (current + 1) % 6);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!dashboardVideoElement) return;

    // Optional: wait a tiny bit to make sure nothing is overriding the play state
    let playTimeout: NodeJS.Timeout;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            playTimeout = setTimeout(() => {
              if (dashboardVideoElement) dashboardVideoElement.play().catch(e => console.error("Play failed:", e));
            }, 100);
          } else {
            clearTimeout(playTimeout);
            if (dashboardVideoElement) dashboardVideoElement.pause();
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(dashboardVideoElement);
    return () => {
      observer.disconnect();
      clearTimeout(playTimeout);
    };
  }, [dashboardVideoElement]);

  useEffect(() => {
    if (!showSplash && videoRef.current) {
      videoRef.current.play().catch(() => undefined);
    }
  }, [showSplash]);

  useEffect(() => {
    const fetchSettings = async () => {
      const [videoRes] = await Promise.all([
        supabase.from('system_settings').select('value').eq('key', 'dashboard_video_bg').maybeSingle(),
      ]);

      if (videoRes.data?.value) {
        const videoSetting = videoRes.data.value as { enabled?: boolean; landing_opacity?: number; opacity?: number; url?: string };
        setVideoEnabled(videoSetting.enabled ?? false);
        setVideoOpacity(videoSetting.landing_opacity ?? videoSetting.opacity ?? 0.2);
        setVideoUrl(videoSetting.url ?? '');
      }

      setAdminEmail('support@t-nexus.io.vn');
    };

    fetchSettings();
  }, []);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          setScrolled((prev) => {
            const next = window.scrollY > 16;
            return prev === next ? prev : next;
          });
          ticking = false;
        });
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const openIntro = () => {
    preloadIntroImages();
    setCurrentPage(0);
    setShowIntro(true);
    requestAnimationFrame(() => setIntroVisible(true));
  };

  const closeIntro = () => {
    setIntroVisible(false);
    setTimeout(() => setShowIntro(false), 400);
  };

  const goPage = useCallback((direction: 'next' | 'prev') => {
    setPageDirection(direction);
    setCurrentPage((page) =>
      direction === 'next'
        ? Math.min(page + 1, introPageComponents.length - 1)
        : Math.max(page - 1, 0)
    );
  }, []);

  useEffect(() => {
    if (!showIntro) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeIntro();
      if (event.key === 'ArrowRight') goPage('next');
      if (event.key === 'ArrowLeft') goPage('prev');
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showIntro, goPage]);

  const handleInitAdmin = async () => {
    setIsInitializing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ensure-owner');
      if (error) throw error;
      if (data?.success) toast.success(data.message || 'Admin initialized successfully!');
      else toast.error(data?.error || 'An error occurred');
    } catch (error: any) {
      toast.error(`Connection error: ${error.message || 'Unable to initialize admin'}`);
    } finally {
      setIsInitializing(false);
    }
  };

  // Maintenance countdown hook (must be before any early returns — Rules of Hooks)
  const [maintenanceTimeLeft, setMaintenanceTimeLeft] = useState('');
  useEffect(() => {
    if (!isLocked || !lockdownEndAt) return;
    const tick = () => {
      const diff = new Date(lockdownEndAt).getTime() - Date.now();
      if (diff <= 0) { setMaintenanceTimeLeft('Reopening soon...'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setMaintenanceTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isLocked, lockdownEndAt]);

  const PageComponent = introPageComponents[currentPage];
  const pageTitles = tl.introPageTitles;

  // Maintenance hero content
  const MAINTENANCE_HERO_WORDS = tl.maintenanceLine1;
  const MAINTENANCE_HERO_WORDS_LINE2 = tl.maintenanceLine2;

  if (isChecking && !showSplash) {
    return <LoadingScreen message={tl.loadingHomepage} />;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ backgroundColor: colorVar('--landing-night'), fontFamily: "'NotionInter', 'Inter', sans-serif" }}>
      {showSplash && (
        <SplashScreen
          onComplete={() => {
            sessionStorage.setItem('t-nexus-splash-shown', 'true');
            setShowSplash(false);
          }}
        />
      )}
      <MandatoryNotification mode="pre_login" locale={locale} />

      {videoEnabled && videoUrl && (
        <>
          <video
            ref={videoRef}
            loop
            muted
            playsInline
            preload="auto"
            className="pointer-events-none fixed inset-0 h-full w-full object-cover"
            style={{ opacity: showSplash ? 0 : videoOpacity, zIndex: 0, willChange: 'transform', transform: 'translateZ(0)', transition: 'opacity 1s' }}
            src={videoUrl}
          />
          <div
            className="pointer-events-none fixed inset-0"
            style={{
              zIndex: 1,
              willChange: 'transform',
              transform: 'translateZ(0)',
              background:
                `linear-gradient(180deg, ${colorVar('--landing-night', 0.68)} 0%, ${colorVar('--landing-night', 0.84)} 48%, ${colorVar('--landing-night', 0.96)} 100%)`,
            }}
          />
        </>
      )}

      <div className="relative z-[2]">
        <header
          className="fixed inset-x-0 top-0 z-50"
          style={{
            backgroundColor: scrolled ? colorVar('--landing-night', 0.78) : 'transparent',
            borderBottom: scrolled ? `1px solid ${colorVar('--landing-hero-foreground', 0.08)}` : '1px solid transparent',
            backdropFilter: scrolled ? 'blur(24px)' : 'none',
            willChange: 'backdrop-filter, background-color',
            transform: 'translateZ(0)',
            transition: 'background-color 0.3s, border-bottom 0.3s',
          }}
        >
          <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-6">
            <a href="#top" className="flex items-center gap-3">
              <img src={tNexusLogo} alt="T-Nexus icon" className="h-8 w-8" />
              <img src={tNexusTextWhite} alt="T-Nexus" className="hidden h-5 w-auto sm:block" />
            </a>

            <nav className="hidden items-center gap-1 lg:flex">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition-colors"
                  style={{ color: colorVar('--landing-hero-foreground', 0.85) }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.color = colorVar('--landing-hero-foreground');
                    event.currentTarget.style.backgroundColor = colorVar('--landing-hero-foreground', 0.06);
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.color = colorVar('--landing-hero-foreground', 0.85);
                    event.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <span>{item.label}</span>
                  {item.hasChevron && <ChevronDown className="h-3.5 w-3.5" />}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleInitAdmin}
                disabled={isInitializing}
                className="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
                style={{ color: colorVar('--landing-hero-foreground', 0.85) }}
                title="Initialize admin"
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor = colorVar('--landing-hero-foreground', 0.06);
                  event.currentTarget.style.color = colorVar('--landing-hero-foreground');
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = 'transparent';
                  event.currentTarget.style.color = colorVar('--landing-hero-foreground', 0.85);
                }}
              >
                {isInitializing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
              </button>
              <Link
                to={lp('/download')}
                className="hidden text-sm transition-colors sm:block"
                style={{ color: colorVar('--landing-hero-foreground', 0.85) }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.color = colorVar('--landing-hero-foreground');
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.color = colorVar('--landing-hero-foreground', 0.85);
                }}
              >
                {tc.download}
              </Link>
              <Button
                asChild
                size="sm"
                className="h-10 rounded-full px-4 text-sm font-medium shadow-none"
                style={{ backgroundColor: colorVar('--landing-blue'), color: '#fff' }}
              >
                <Link to={lp('/auth')}>{tc.login}</Link>
              </Button>
            </div>
          </div>
        </header>

        <section
          id="top"
          className="relative overflow-hidden px-6 pt-28 md:pt-36"
          style={{
            background: `linear-gradient(180deg, ${colorVar('--landing-night')} 0%, ${colorVar('--landing-night-soft')} 100%)`,
          }}
        >
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <div
              className="absolute left-1/2 top-[-10rem] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full blur-3xl"
              style={{ background: `radial-gradient(circle, ${colorVar('--landing-blue', 0.24)} 0%, transparent 68%)` }}
            />
            <div
              className="absolute left-[10%] top-[30%] h-56 w-56 rounded-full blur-3xl"
              style={{ background: `radial-gradient(circle, ${colorVar('--landing-purple', 0.18)} 0%, transparent 70%)` }}
            />
            <div
              className="absolute right-[12%] top-[42%] h-64 w-64 rounded-full blur-3xl"
              style={{ background: `radial-gradient(circle, ${colorVar('--landing-teal', 0.18)} 0%, transparent 70%)` }}
            />
            <div className="absolute left-1/2 top-6 hidden h-[468px] w-[min(1380px,100vw)] -translate-x-1/2 xl:block">
              {/* Outer ellipse – animated glow */}
              <div
                className="absolute inset-x-[8%] top-16 h-[260px] rounded-[999px] border landing-orbit-outer"
                style={{
                  borderColor: colorVar('--landing-hero-foreground', 0.2),
                  boxShadow: `0 0 40px 4px ${colorVar('--landing-blue', 0.08)}, inset 0 0 40px 4px ${colorVar('--landing-blue', 0.04)}`,
                }}
              />
              {/* Inner ellipse – animated glow */}
              <div
                className="absolute inset-x-[16%] top-2 h-[340px] rounded-[999px] border landing-orbit-inner"
                style={{
                  borderColor: colorVar('--landing-hero-foreground', 0.15),
                  boxShadow: `0 0 60px 6px ${colorVar('--landing-purple', 0.06)}, inset 0 0 60px 6px ${colorVar('--landing-purple', 0.03)}`,
                }}
              />
              {/* Accent dot on outer ellipse */}
              <div className="absolute left-1/2 top-16 -translate-x-1/2 landing-orbit-dot-outer">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: colorVar('--landing-blue', 0.6), boxShadow: `0 0 12px 4px ${colorVar('--landing-blue', 0.3)}` }} />
              </div>
              {/* Accent dot on inner ellipse */}
              <div className="absolute left-1/2 top-2 -translate-x-1/2 landing-orbit-dot-inner">
                <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colorVar('--landing-purple', 0.5), boxShadow: `0 0 10px 3px ${colorVar('--landing-purple', 0.25)}` }} />
              </div>
              {HERO_SIGNALS.map((signal) => {
                const Icon = signal.icon;

                return (
                  <div
                    key={signal.label}
                    className={`pointer-events-none absolute ${signal.positionClass} landing-float`}
                    style={{
                      animationDelay: `${signal.motionDelayMs ?? 0}ms`,
                      animationDuration: `${signal.motionDurationMs ?? 7200}ms`,
                    }}
                  >
                    <div
                      className="max-w-[172px] rounded-[1.15rem] border px-3.5 py-2.5 backdrop-blur-xl"
                      style={{
                        backgroundColor: colorVar('--landing-night-elevated', 0.82),
                        borderColor: colorVar('--landing-hero-foreground', 0.08),
                        boxShadow: `0 24px 48px ${colorVar('--landing-shadow', 0.28)}`,
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-xl"
                          style={{ backgroundColor: colorVar(signal.accent, 0.14), color: colorVar(signal.accent) }}
                        >
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold leading-none" style={{ color: colorVar('--landing-hero-foreground') }}>{signal.label}</p>
                          <p className="mt-1 text-[11px] leading-none" style={{ color: colorVar('--landing-hero-muted') }}>{signal.note}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative mx-auto max-w-[1240px]">
            <div className="relative z-10 mx-auto max-w-[820px] text-center">
              <div
                className="mx-auto inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm"
                style={{
                  borderColor: colorVar('--landing-hero-foreground', 0.12),
                  backgroundColor: colorVar('--landing-hero-foreground', 0.04),
                  color: colorVar('--landing-hero-muted'),
                  animation: 'landing-fade-up 700ms ease-out both',
                }}
              >
                {isLocked ? (
                  <>
                    <Construction className="h-4 w-4" style={{ color: 'hsl(45 93% 55%)' }} />
                    Scheduled maintenance in progress
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" style={{ color: colorVar('--landing-blue') }} />
                    {tl.heroBadge}
                  </>
                )}
              </div>
              <h1
                className="mt-8 text-[42px] font-semibold leading-[0.91] tracking-[-0.04em] sm:text-[56px] lg:text-[64px] xl:text-[72px] landing-hero-title"
                style={{ color: colorVar('--landing-hero-foreground'), animation: 'landing-fade-up 700ms ease-out 120ms both' }}
              >
                {(isLocked ? MAINTENANCE_HERO_WORDS : tl.heroLine1).map((item: { word: string; color: string }, i: number) => {
                  const globalIndex = i;
                  const isLightUp = hoveredWordIndex !== null ? hoveredWordIndex === globalIndex : activeWordIndex === globalIndex;
                  return (
                    <React.Fragment key={i}>
                      <span
                        className={`landing-hero-word ${isLightUp ? 'landing-hero-word-active' : ''}`}
                        style={{ '--word-color': item.color } as React.CSSProperties}
                        onMouseEnter={() => setHoveredWordIndex(globalIndex)}
                        onMouseLeave={() => setHoveredWordIndex(null)}
                      >
                        {item.word}
                      </span>
                      {' '}
                    </React.Fragment>
                  );
                })}
                <br />
                {(isLocked ? MAINTENANCE_HERO_WORDS_LINE2 : tl.heroLine2).map((item: { word: string; color: string }, i: number) => {
                  const globalIndex = i + 4;
                  const isLightUp = hoveredWordIndex !== null ? hoveredWordIndex === globalIndex : activeWordIndex === globalIndex;
                  return (
                    <React.Fragment key={i}>
                      <span
                        className={`landing-hero-word ${isLightUp ? 'landing-hero-word-active' : ''}`}
                        style={{ '--word-color': item.color } as React.CSSProperties}
                        onMouseEnter={() => setHoveredWordIndex(globalIndex)}
                        onMouseLeave={() => setHoveredWordIndex(null)}
                      >
                        {item.word}
                      </span>
                      {' '}
                    </React.Fragment>
                  );
                })}
              </h1>
              <p
                className="mx-auto mt-6 max-w-[720px] text-[15px] leading-[1.6] md:text-[16px]"
                style={{ color: colorVar('--landing-hero-muted'), animation: 'landing-fade-up 700ms ease-out 220ms both' }}
              >
                {isLocked
                  ? tl.maintenanceDescription
                  : <>{tl.heroDescription}</>}
              </p>

              {/* Maintenance countdown — inline on hero */}
              {isLocked && (
                <div
                  className="mx-auto mt-8 max-w-[480px] rounded-2xl border p-6"
                  style={{
                    borderColor: colorVar('--landing-hero-foreground', 0.1),
                    backgroundColor: colorVar('--landing-hero-foreground', 0.04),
                    backdropFilter: 'blur(12px)',
                    animation: 'landing-fade-up 700ms ease-out 280ms both',
                  }}
                >
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: 'hsl(45 93% 55%)' }} />
                      <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: 'hsl(45 93% 55%)' }} />
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: colorVar('--landing-hero-muted') }}>{tl.maintenanceInProgress}</span>
                  </div>
                  {lockdownEndAt && maintenanceTimeLeft && (
                    maintenanceTimeLeft.includes(':') ? (
                      <div className="flex items-center justify-center gap-2">
                        {maintenanceTimeLeft.split(':').map((unit, i) => (
                          <React.Fragment key={i}>
                            {i > 0 && <span className="text-lg font-bold" style={{ color: colorVar('--landing-hero-foreground', 0.2) }}>:</span>}
                            <div className="flex flex-col items-center">
                              <div
                                className="w-16 h-16 rounded-xl flex items-center justify-center relative overflow-hidden"
                                style={{
                                  background: colorVar('--landing-hero-foreground', 0.06),
                                  border: `1px solid ${colorVar('--landing-hero-foreground', 0.1)}`,
                                }}
                              >
                                <div className="absolute inset-0 opacity-10" style={{ background: `linear-gradient(135deg, hsl(45 93% 55%), transparent 60%)` }} />
                                <span className="text-2xl font-bold font-mono tabular-nums relative" style={{ color: colorVar('--landing-hero-foreground') }}>{unit}</span>
                              </div>
                              <span className="text-[9px] uppercase tracking-wider font-semibold mt-1.5" style={{ color: colorVar('--landing-hero-muted', 0.6) }}>
                                {[tl.maintenanceHours, tl.maintenanceMinutes, tl.maintenanceSeconds][i]}
                              </span>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-center animate-pulse" style={{ color: 'hsl(45 93% 55%)' }}>{tl.maintenanceReopeningSoon}</p>
                    )
                  )}
                  {!lockdownEndAt && (
                    <p className="text-xs text-center" style={{ color: colorVar('--landing-hero-muted', 0.5) }}>{tl.maintenanceBackOnline}</p>
                  )}
                </div>
              )}

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animation: 'landing-fade-up 700ms ease-out 320ms both' }}>
                {isLocked ? (
                  <Button
                    size="lg"
                    disabled
                    className="h-12 rounded-full px-6 text-sm font-medium shadow-none cursor-not-allowed opacity-60"
                    style={{ backgroundColor: colorVar('--landing-hero-foreground', 0.15), color: colorVar('--landing-hero-muted') }}
                  >
                    {tl.maintenancePleaseComeBack}
                  </Button>
                ) : (
                  <>
                    <Button
                      asChild
                      size="lg"
                      className="h-12 rounded-full px-6 text-sm font-medium shadow-none"
                      style={{ backgroundColor: colorVar('--landing-blue'), color: '#fff' }}
                    >
                      <Link to={lp('/auth')} className="flex items-center gap-2">
                        {tl.ctaGetFree} <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={openIntro}
                      className="h-12 rounded-full px-6 text-sm font-medium shadow-none"
                      style={{
                        borderColor: colorVar('--landing-hero-foreground', 0.14),
                        backgroundColor: colorVar('--landing-hero-foreground', 0.04),
                        color: colorVar('--landing-hero-foreground'),
                      }}
                    >
                      {tl.ctaWatchDemo} <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="relative z-10 mt-18 md:mt-24" style={{ animation: 'landing-fade-up 900ms ease-out 420ms both' }}>
              <div
                className="relative overflow-hidden rounded-[1.6rem] border"
                style={{
                  borderColor: colorVar('--landing-hero-foreground', 0.08),
                  backgroundColor: colorVar('--landing-night-elevated', 0.92),
                  boxShadow: `0 44px 84px ${colorVar('--landing-shadow', 0.42)}`,
                }}
              >
                <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: `1px solid ${colorVar('--landing-hero-foreground', 0.06)}` }}>
                  <div className="flex items-center gap-[6px]">
                    <span className="block h-[10px] w-[10px] rounded-full" style={{ backgroundColor: colorVar('--landing-chrome-red') }} />
                    <span className="block h-[10px] w-[10px] rounded-full" style={{ backgroundColor: colorVar('--landing-chrome-yellow') }} />
                    <span className="block h-[10px] w-[10px] rounded-full" style={{ backgroundColor: colorVar('--landing-chrome-green') }} />
                  </div>
                  <div className="ml-3 flex-1">
                    <div
                      className="mx-auto max-w-[320px] rounded-md px-3 py-1 text-center text-[11px]"
                      style={{
                        backgroundColor: colorVar('--landing-hero-foreground', 0.06),
                        color: colorVar('--landing-hero-subtle'),
                      }}
                    >
                      t-nexus.io.vn
                    </div>
                  </div>
                  <div className="w-[52px]" />
                </div>
                {videoUrl ? (
                  <div className="relative">
                    <video
                      ref={setDashboardVideoElement}
                      src={videoUrl}
                      loop
                      muted
                      playsInline
                      className="aspect-[16/10] w-full object-cover object-top md:aspect-[16/9]"
                    />
                    <div className="pointer-events-none absolute inset-0 bg-background/60" />
                  </div>
                ) : (
                  <img src={introPage1} alt="T-Nexus overview" className="aspect-[16/10] w-full object-cover object-top md:aspect-[16/9]" />
                )}
                <div className="absolute bottom-5 left-5 z-10 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={openIntro}
                    className="flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-300 hover:scale-110"
                    style={{
                      backgroundColor: colorVar('--landing-hero-foreground'),
                      borderColor: colorVar('--landing-hero-foreground'),
                      color: colorVar('--landing-night'),
                    }}
                    aria-label="Open T-Nexus demo"
                  >
                    <Play className="ml-0.5 h-4 w-4 fill-current" />
                  </button>
                  <div className="hidden rounded-full border px-4 py-2 text-sm backdrop-blur-md md:block" style={{ borderColor: colorVar('--landing-hero-foreground', 0.12), backgroundColor: colorVar('--landing-night-elevated', 0.86), color: colorVar('--landing-hero-foreground') }}>
                    {tl.ctaWatchWalkthrough}
                  </div>
                </div>
                <div className="absolute right-5 top-16 hidden gap-3 md:flex">
                  {[
                    { label: 'Kanban', image: introP2Kanban },
                    { label: 'Scoring', image: introP3Formula },
                  ].map((item, index) => (
                    <div
                      key={item.label}
                      className="w-40 overflow-hidden rounded-[1.2rem] border backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1"
                      style={{
                        marginTop: `${index * 18}px`,
                        borderColor: colorVar('--landing-hero-foreground', 0.08),
                        backgroundColor: colorVar('--landing-night-elevated', 0.84),
                      }}
                    >
                      <img src={item.image} alt={item.label} className="h-24 w-full object-cover object-top" />
                      <div className="px-3 py-2 text-xs" style={{ color: colorVar('--landing-hero-foreground') }}>{item.label}</div>
                    </div>
                  ))}
                </div>
                <div
                  className="absolute inset-x-0 bottom-0 h-40 pointer-events-none"
                  style={{ background: `linear-gradient(180deg, transparent 0%, ${colorVar('--landing-night', 0.76)} 70%, ${colorVar('--landing-night')} 100%)` }}
                />
              </div>
            </div>

            <div className="relative z-10 pb-16 pt-16 md:pb-24">
              <p className="text-center text-[11px] font-medium uppercase tracking-[0.28em]" style={{ color: colorVar('--landing-hero-subtle') }}>
                {tl.trustedBy}
              </p>
              <div className="mt-8 space-y-3 overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)' }}>
                {LOGO_WALL_ROWS.map((row, rowIndex) => (
                  <div
                    key={rowIndex}
                    className={`flex min-w-max items-center gap-3 whitespace-nowrap ${rowIndex === 0 ? 'landing-marquee-reverse' : 'landing-marquee'}`}
                  >
                    {[...row, ...row, ...row].map((item, itemIndex) => (
                      <div
                        key={`${item}-${itemIndex}`}
                        className="rounded-full border px-5 py-3 text-[13px] font-medium"
                        style={{
                          borderColor: colorVar('--landing-hero-foreground', 0.08),
                          backgroundColor: colorVar('--landing-hero-foreground', 0.03),
                          color: colorVar('--landing-hero-foreground', 0.74),
                        }}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <main
          className="relative -mt-4 rounded-t-[2rem] px-6 pt-16 md:pt-24"
          style={{ backgroundColor: colorVar('--landing-surface') }}
        >
          <section id="assistant-grid" className="mx-auto max-w-[1240px] py-4 md:py-8">
            <div className="max-w-[760px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em]" style={{ color: colorVar('--landing-surface-muted') }}>
                {tl.assistantEyebrow}
              </p>
              <h2 className="mt-4 text-[28px] font-semibold leading-tight tracking-[-0.04em] md:text-[42px]" style={{ color: colorVar('--landing-surface-foreground') }}>
                {tl.assistantTitle}
              </h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {ASSISTANT_CARDS.map((card, index) => {
                const Icon = card.icon;
                return (
                  <article
                    key={card.title}
                    className="group overflow-hidden rounded-[2rem] border transition-all duration-300 hover:-translate-y-1"
                    style={{
                      borderColor: colorVar('--landing-border-soft'),
                      backgroundColor: colorVar('--landing-card'),
                      boxShadow: `0 18px 40px ${colorVar('--landing-shadow', 0.08)}`,
                      animation: `landing-fade-up 700ms ease-out ${index * 90}ms both`,
                    }}
                  >
                    <div className="flex flex-col gap-6 p-6 md:p-7">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: colorVar(card.accent) }}>
                            {card.eyebrow}
                          </p>
                          <h3 className="mt-3 max-w-[20rem] text-[20px] font-semibold leading-tight tracking-[-0.03em]" style={{ color: colorVar('--landing-surface-foreground') }}>
                            {card.title}
                          </h3>
                        </div>
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-2xl"
                          style={{ backgroundColor: colorVar(card.accent, 0.12), color: colorVar(card.accent) }}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>
                      <p className="max-w-[28rem] text-[14px] leading-6" style={{ color: colorVar('--landing-surface-muted') }}>
                        {card.description}
                      </p>
                    </div>
                    <div className="relative px-6 pb-6 md:px-7 md:pb-7">
                      <div className="relative overflow-hidden rounded-[1.5rem] border" style={{ borderColor: colorVar('--landing-border-soft') }}>
                        <img src={card.image} alt={card.title} className="h-[200px] w-full object-cover md:h-[240px] object-center" loading="lazy" />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section id="workspace-grid" className="mx-auto max-w-[1240px] py-20 md:py-28">
            <div className="max-w-[780px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em]" style={{ color: colorVar('--landing-surface-muted') }}>
                {tl.workspaceEyebrow}
              </p>
              <h2 className="mt-4 text-[28px] font-semibold leading-tight tracking-[-0.04em] md:text-[42px]" style={{ color: colorVar('--landing-surface-foreground') }}>
                {tl.workspaceTitle}
              </h2>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {WORKSPACE_CARDS.map((card, index) => {
                const Icon = card.icon;
                return (
                  <article
                    key={card.title}
                    className={`group overflow-hidden rounded-[2rem] border transition-all duration-300 hover:-translate-y-1 ${card.wide ? 'md:col-span-2' : ''}`}
                    style={{
                      borderColor: colorVar('--landing-border-soft'),
                      backgroundColor: colorVar('--landing-card'),
                      boxShadow: `0 18px 40px ${colorVar('--landing-shadow', 0.08)}`,
                      animation: `landing-fade-up 700ms ease-out ${index * 80}ms both`,
                    }}
                  >
                    <div className="flex flex-col gap-6 p-6 md:p-7">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: colorVar(card.accent) }}>
                            {card.eyebrow}
                          </p>
                          <div className="mt-3 flex items-start gap-3">
                            <div
                              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                              style={{ backgroundColor: colorVar(card.accent, 0.12), color: colorVar(card.accent) }}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <h3 className="max-w-[28rem] text-[20px] font-semibold leading-tight tracking-[-0.03em]" style={{ color: colorVar('--landing-surface-foreground') }}>
                                {card.title}
                              </h3>
                              <p className="mt-3 max-w-[32rem] text-[14px] leading-6" style={{ color: colorVar('--landing-surface-muted') }}>
                                {card.description}
                              </p>
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="mt-1 hidden h-5 w-5 md:block" style={{ color: colorVar('--landing-surface-muted') }} />
                      </div>
                    </div>
                    <div className="relative px-6 pb-0 md:px-7">
                      <div className="overflow-hidden rounded-t-[1.5rem] border" style={{ borderColor: colorVar('--landing-border-soft') }}>
                        <img src={card.image} alt={card.title} className={`w-full object-cover object-center ${card.wide ? 'h-[200px] md:h-[280px]' : 'h-[200px] md:h-[240px]'}`} loading="lazy" />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section id="efficiency" className="mx-auto max-w-[1240px] py-8 md:py-12">
            <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div className="max-w-[560px]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em]" style={{ color: colorVar('--landing-surface-muted') }}>
                  {tl.efficiencyEyebrow}
                </p>
                <h2 className="mt-4 text-[28px] font-semibold leading-tight tracking-[-0.04em] md:text-[42px]" style={{ color: colorVar('--landing-surface-foreground') }}>
                  {tl.efficiencyTitle}
                </h2>
                <p className="mt-5 max-w-[32rem] text-[16px] leading-8" style={{ color: colorVar('--landing-surface-muted') }}>
                  {tl.efficiencyDescription}
                </p>
                <Link to={lp('/download')} className="mt-6 inline-flex items-center gap-2 text-sm font-medium" style={{ color: colorVar('--landing-blue') }}>
                  {tl.efficiencySeeInstall} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div
                className="overflow-hidden rounded-[2rem] border p-6 md:p-7 lg:mt-10"
                style={{
                  borderColor: colorVar('--landing-border-soft'),
                  backgroundColor: colorVar('--landing-card'),
                  boxShadow: `0 18px 40px ${colorVar('--landing-shadow', 0.08)}`,
                }}
              >
                <div className="relative grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-stretch">
                  <div className="flex flex-col rounded-[1.5rem] border p-6" style={{ borderColor: colorVar('--landing-border-soft'), backgroundColor: colorVar('--landing-surface') }}>
                    <div className="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 self-start" style={{ borderColor: colorVar('--landing-chrome-red', 0.2), backgroundColor: colorVar('--landing-chrome-red', 0.1) }}>
                      <XCircle className="h-4 w-4" style={{ color: colorVar('--landing-chrome-red') }} />
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: colorVar('--landing-chrome-red') }}>{tl.efficiencyBefore}</span>
                    </div>
                    <div className="mb-6 overflow-hidden rounded-[1rem] border" style={{ borderColor: colorVar('--landing-border-soft'), backgroundColor: colorVar('--landing-card') }}>
                      <img src={efficiencyBefore} alt="Scattered workflow" className="aspect-[2/1] w-full object-cover object-center" />
                    </div>
                    <ul className="space-y-4 text-[14px] leading-6" style={{ color: colorVar('--landing-surface-muted') }}>
                      {(tl.efficiencyBeforeItems as string[]).map((text: string, i: number) => {
                        const icons = [Table2, MessageSquareOff, FolderArchive, FileQuestion];
                        const Icon = icons[i];
                        return (
                          <li key={i} className="flex items-start gap-3">
                            <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: colorVar('--landing-chrome-red', 0.8) }} />
                            <span>{text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="hidden items-center justify-center md:flex">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border" style={{ borderColor: colorVar('--landing-border-soft'), backgroundColor: colorVar('--landing-card'), boxShadow: `0 4px 12px ${colorVar('--landing-shadow', 0.1)}` }}>
                      <ArrowRight className="h-4 w-4" style={{ color: colorVar('--landing-surface-muted') }} />
                    </div>
                  </div>

                  <div className="flex flex-col relative overflow-hidden rounded-[1.5rem] border p-6" style={{ borderColor: colorVar('--landing-teal', 0.3), backgroundColor: colorVar('--landing-teal', 0.05) }}>
                    <div className="relative z-10">
                      <div className="mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1 self-start" style={{ borderColor: colorVar('--landing-teal', 0.3), backgroundColor: colorVar('--landing-teal', 0.15) }}>
                        <img src={tNexusLogo} alt="T-Nexus" className="h-4 w-4 rounded-[3px] opacity-90" />
                        <span className="text-xs font-bold uppercase tracking-wider" style={{ color: colorVar('--landing-teal') }}>{tl.efficiencyWithTNexus}</span>
                      </div>
                      <div className="mb-6 overflow-hidden rounded-[1rem] border" style={{ borderColor: colorVar('--landing-border-soft'), backgroundColor: colorVar('--landing-card') }}>
                        <img src={landingPreview} alt="T-Nexus Homepage" className="aspect-[2/1] w-full object-cover object-top" />
                      </div>
                      <ul className="space-y-4 text-[14px] leading-6" style={{ color: colorVar('--landing-surface-foreground') }}>
                        {(tl.efficiencyAfterItems as string[]).map((text: string, i: number) => {
                          const icons = [LayoutDashboard, BellRing, FolderCheck, Trophy];
                          const Icon = icons[i];
                          return (
                            <li key={i} className="flex items-start gap-3">
                              <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: colorVar('--landing-teal') }} />
                              <span className="font-medium">{text}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {(tl.efficiencyStats as { value: string; label: string }[]).map((item: { value: string; label: string }, i: number) => {
                    const icons = [Clock, Target, Users, Zap];
                    const Icon = icons[i];
                    return (
                      <div key={item.label} className="rounded-[1.25rem] border p-4" style={{ borderColor: colorVar('--landing-border-soft') }}>
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: colorVar('--landing-teal', 0.12), color: colorVar('--landing-teal') }}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-[20px] font-semibold leading-none tracking-[-0.03em]" style={{ color: colorVar('--landing-surface-foreground') }}>{item.value}</p>
                            <p className="mt-1 text-xs leading-5" style={{ color: colorVar('--landing-surface-muted') }}>{item.label}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section id="social-proof" className="mx-auto max-w-[1240px] py-20 md:py-28">
            <div className="max-w-[720px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em]" style={{ color: colorVar('--landing-surface-muted') }}>
                {tl.socialProofEyebrow}
              </p>
              <h2 className="mt-4 text-[28px] font-semibold leading-tight tracking-[-0.04em] md:text-[42px]" style={{ color: colorVar('--landing-surface-foreground') }}>
                {tl.socialProofTitle}
              </h2>
            </div>

            <div className="mt-10 overflow-hidden rounded-[2rem] border" style={{ borderColor: colorVar('--landing-border-soft'), backgroundColor: colorVar('--landing-card'), boxShadow: `0 18px 40px ${colorVar('--landing-shadow', 0.08)}` }}>
              <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="p-7 md:p-10">
                  <div className="inline-flex rounded-full border px-3 py-2 text-xs font-medium uppercase tracking-[0.2em]" style={{ borderColor: colorVar('--landing-border-soft'), color: colorVar('--landing-surface-muted') }}>
                    {tl.socialProofMainBadge}
                  </div>
                  <blockquote className="mt-8 text-[30px] font-semibold leading-[1.18] tracking-[-0.04em] md:text-[40px]" style={{ color: colorVar('--landing-surface-foreground') }}>
                    {tl.socialProofMainQuote}
                  </blockquote>
                  <p className="mt-5 max-w-[30rem] text-[15px] leading-8" style={{ color: colorVar('--landing-surface-muted') }}>
                    {tl.socialProofMainDescription}
                  </p>
                  <button type="button" onClick={openIntro} className="mt-8 inline-flex items-center gap-2 text-sm font-medium" style={{ color: colorVar('--landing-blue') }}>
                    {tl.socialProofReadMore} <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={openIntro}
                  className="group relative min-h-[20rem] overflow-hidden"
                  style={{ backgroundColor: colorVar('--landing-surface') }}
                  aria-label="Open product introduction"
                >
                  <img src={introPage4} alt="Sharing project progress with instructors" className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.02]" loading="lazy" />
                  <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, transparent 25%, ${colorVar('--landing-night', 0.3)} 100%)` }} />
                  <div className="absolute bottom-6 left-6 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: colorVar('--landing-hero-foreground'), color: colorVar('--landing-night') }}>
                    <Play className="ml-0.5 h-5 w-5 fill-current" />
                  </div>
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {SOCIAL_QUOTES.map((quote, index) => (
                <article
                  key={`${quote.brand}-${index}`}
                  className="rounded-[1.75rem] border p-6"
                  style={{
                    borderColor: colorVar('--landing-border-soft'),
                    backgroundColor: colorVar('--landing-card'),
                    boxShadow: `0 18px 34px ${colorVar('--landing-shadow', 0.06)}`,
                  }}
                >
                  <div className="flex items-center gap-1" style={{ color: colorVar('--landing-yellow') }}>
                    {Array.from({ length: 5 }).map((_, starIndex) => (
                      <Star key={starIndex} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="mt-5 text-[15px] leading-7" style={{ color: colorVar('--landing-surface-foreground') }}>{quote.quote}</p>
                  <div className="mt-6 border-t pt-4" style={{ borderColor: colorVar('--landing-border-soft') }}>
                    <p className="text-sm font-medium" style={{ color: colorVar('--landing-surface-foreground') }}>{quote.brand}</p>
                    <p className="mt-1 text-xs" style={{ color: colorVar('--landing-surface-muted') }}>{quote.role}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-12 overflow-hidden rounded-full border py-4" style={{ borderColor: colorVar('--landing-border-soft'), backgroundColor: colorVar('--landing-card') }}>
              <div className="landing-marquee flex min-w-max items-center gap-6 whitespace-nowrap px-6">
                {[...STATS_MARQUEE, ...STATS_MARQUEE, ...STATS_MARQUEE].map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <React.Fragment key={`${item.text}-${index}`}>
                      {index > 0 && (
                        <span className="block h-1 w-1 rounded-full" style={{ backgroundColor: colorVar('--landing-border-soft') }} />
                      )}
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: colorVar('--landing-surface'), color: colorVar('--landing-blue') }}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <p className="text-sm font-medium" style={{ color: colorVar('--landing-surface-foreground') }}>{item.text}</p>
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </section>

          <section id="cta-panel" className="mx-auto max-w-[1240px] pb-16 md:pb-24">
            <div
              className="overflow-hidden rounded-[2.25rem] border px-6 py-10 md:px-10 md:py-14"
              style={{
                borderColor: colorVar('--landing-hero-foreground', 0.1),
                background: `linear-gradient(180deg, ${colorVar('--landing-night-elevated')} 0%, ${colorVar('--landing-night')} 100%)`,
                boxShadow: `0 34px 72px ${colorVar('--landing-shadow', 0.26)}`,
              }}
            >
              <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="max-w-[760px]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.26em]" style={{ color: colorVar('--landing-hero-subtle') }}>
                    {tl.ctaEyebrow}
                  </p>
                  <h2 className="mt-4 text-[28px] font-semibold leading-tight tracking-[-0.04em] md:text-[42px]" style={{ color: colorVar('--landing-hero-foreground') }}>
                    {tl.ctaTitle}
                  </h2>
                  <p className="mt-5 max-w-[36rem] text-[16px] leading-8" style={{ color: colorVar('--landing-hero-muted') }}>
                    {tl.ctaDescription}
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                  <Button
                    asChild
                    size="lg"
                    className="h-12 rounded-full px-6 text-sm font-medium shadow-none"
                    style={{ backgroundColor: colorVar('--landing-hero-foreground'), color: colorVar('--landing-night') }}
                  >
                    <Link to={lp('/auth')} className="flex items-center gap-2">
                      {tl.ctaLogIn} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="h-12 rounded-full px-6 text-sm font-medium shadow-none"
                    style={{
                      borderColor: colorVar('--landing-hero-foreground', 0.14),
                      backgroundColor: colorVar('--landing-hero-foreground', 0.04),
                      color: colorVar('--landing-hero-foreground'),
                    }}
                  >
                    <Link to={lp('/download')} className="flex items-center gap-2">
                      <Download className="h-4 w-4" /> {tc.installApp}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </main>

        <footer id="resources" className="px-6 pb-12 pt-14 md:pt-16" style={{ backgroundColor: colorVar('--landing-night') }}>
          <div className="mx-auto max-w-[1240px]">
            <div className="flex flex-col gap-12 lg:flex-row lg:justify-between lg:items-start">
              <div className="lg:max-w-md xl:max-w-[34rem]">
                <div className="flex items-center gap-4 md:gap-5">
                  <img src={tNexusLogo} alt="T-Nexus icon" className="h-12 w-12 md:h-16 md:w-16" />
                  <div className="flex flex-col justify-center">
                    <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.32em]" style={{ color: colorVar('--landing-hero-subtle') }}>
                      {tc.tNexusPlatform}
                    </p>
                    <img src={tNexusTextWhite} alt="T-Nexus" className="h-[32px] w-auto shrink-0 object-contain object-left md:h-[42px]" />
                  </div>
                </div>
                <p className="mt-6 text-[16px] leading-8" style={{ color: colorVar('--landing-hero-muted') }}>
                  {tc.footerDescription}
                </p>
              </div>

              <div className="grid gap-8 sm:grid-cols-2 lg:flex lg:gap-10 xl:gap-16">
                {[
                  {
                    title: tl.footerProduct,
                    links: [
                      { label: tl.footerProductLinks[0], href: '#workspace-grid' },
                      { label: tl.footerProductLinks[1], href: '#workspace-grid' },
                      { label: tl.footerProductLinks[2], href: '#assistant-grid' },
                      { label: tl.footerProductLinks[3], href: '#social-proof' },
                    ],
                  },
                  {
                    title: tc.download,
                    links: [
                      { label: tl.footerDownloadLinks[0], href: lp('/auth'), external: false },
                      { label: tl.footerDownloadLinks[1], href: lp('/download'), external: false },
                      { label: tl.footerDownloadLinks[2], href: lp('/download'), external: false },
                    ],
                  },
                  {
                    title: tl.footerResourcesTitle,
                    links: [
                      { label: tl.footerResourcesLinks[0], href: '#top' },
                      { label: tl.footerResourcesLinks[1], href: '#efficiency' },
                      { label: tl.footerResourcesLinks[2], href: '#social-proof' },
                    ],
                  },
                  {
                    title: tl.footerContactTitle,
                    links: [
                      { label: adminEmail || tl.footerComingSoon, href: adminEmail ? `mailto:${adminEmail}` : '#resources' },
                      { label: tc.login, href: lp('/auth'), external: false },
                      { label: tc.installApp, href: lp('/download'), external: false },
                    ],
                  },
                ].map((column) => (
                  <div key={column.title}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: colorVar('--landing-hero-subtle') }}>
                      {column.title}
                    </p>
                    <div className="mt-4 flex flex-col gap-3">
                      {column.links.map((linkItem) =>
                        linkItem.external === false ? (
                          <Link key={linkItem.label} to={linkItem.href} className="text-sm transition-colors whitespace-nowrap" style={{ color: colorVar('--landing-hero-muted') }}>
                            {linkItem.label}
                          </Link>
                        ) : (
                          <a key={linkItem.label} href={linkItem.href} className="text-sm transition-colors whitespace-nowrap" style={{ color: colorVar('--landing-hero-muted') }}>
                            {linkItem.label}
                          </a>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-12 flex flex-col gap-3 border-t pt-6 text-sm md:flex-row md:items-center md:justify-between" style={{ borderColor: colorVar('--landing-hero-foreground', 0.08), color: colorVar('--landing-hero-subtle') }}>
              <span className="whitespace-nowrap">{tc.copyright} <span className="italic">{tc.developedBy}</span>. {tc.allRightsReserved}</span>
              <div className="flex items-center gap-4">
                <span>{tl.footerDesignedFor}</span>
                <LanguageToggle variant="light" />
              </div>
            </div>
          </div>
        </footer>
      </div>

      {showIntro && (
        <div
          className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-[400ms] ${introVisible ? 'bg-black/50 backdrop-blur-sm' : 'bg-black/0 backdrop-blur-none'}`}
          onClick={closeIntro}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className={`flex h-[720px] max-h-[90vh] w-[1280px] max-w-[95vw] flex-col overflow-hidden rounded-xl bg-background shadow-2xl transition-all duration-500 ease-out ${introVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-8 scale-95 opacity-0'}`}
          >
            <div className="relative shrink-0 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/90 to-accent opacity-95" />
              <div className="relative flex items-center justify-between px-6 py-3 text-primary-foreground">
                <div className="flex items-center gap-3">
                  <img src={tNexusLogo} alt="T-Nexus" className="h-5 w-auto" />
                  <div className="h-4 w-px bg-primary-foreground/30" />
                  <div>
                    <h2 className="text-sm font-bold">{tl.introTitle}</h2>
                    <p className="text-[10px] text-primary-foreground/70">Page {currentPage + 1} / {introPageComponents.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden gap-1 md:flex">
                    {pageTitles.map((title, index) => (
                      <button
                        key={title}
                        onClick={() => {
                          setPageDirection(index > currentPage ? 'next' : 'prev');
                          setCurrentPage(index);
                        }}
                        className={`rounded px-2.5 py-1 text-[10px] font-medium transition-all ${index === currentPage ? 'bg-primary-foreground/20 text-primary-foreground' : 'text-primary-foreground/50 hover:text-primary-foreground/80'}`}
                      >
                        {title}
                      </button>
                    ))}
                  </div>
                  <button onClick={closeIntro} className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-foreground/10 transition-colors hover:bg-primary-foreground/20">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div
                key={currentPage}
                className="h-full p-6"
                style={{ animation: pageDirection === 'next' ? 'slide-in-from-right 0.35s ease-out both' : 'slide-in-from-left 0.35s ease-out both' }}
              >
                <PageComponent />
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between border-t bg-muted/30 px-6 py-3">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>T-Nexus</span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={currentPage === 0} onClick={() => goPage('prev')} className="h-8 gap-1">
                  <ChevronLeft className="h-4 w-4" /> {tc.previous}
                </Button>
                {currentPage < introPageComponents.length - 1 ? (
                  <Button size="sm" onClick={() => goPage('next')} className="h-8 gap-1">
                    {tc.next} <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button asChild size="sm" className="h-8 gap-1 shadow-md">
                    <Link to={lp('/auth')} onClick={closeIntro}>
                      {tc.getStarted} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes landing-fade-up {
          from {
            opacity: 0;
            transform: translate3d(0, 24px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes landing-float-motion {
          0%, 100% {
            transform: translate3d(0, 0px, 0);
          }
          50% {
            transform: translate3d(0, -10px, 0);
          }
        }

        @keyframes landing-marquee-left {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-33.333%, 0, 0);
          }
        }

        @keyframes landing-marquee-right {
          0% {
            transform: translate3d(-33.333%, 0, 0);
          }
          100% {
            transform: translate3d(0, 0, 0);
          }
        }

        .landing-float {
          animation: landing-float-motion 6s ease-in-out infinite;
          will-change: transform;
          contain: layout style;
        }

        @keyframes landing-orbit-pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
        @keyframes landing-orbit-pulse-inner {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .landing-orbit-outer {
          animation: landing-orbit-pulse 5s ease-in-out infinite;
          will-change: opacity;
        }
        .landing-orbit-inner {
          animation: landing-orbit-pulse-inner 7s ease-in-out infinite;
          will-change: opacity;
        }

        @keyframes landing-orbit-dot-travel-outer {
          0% { transform: translateX(-50%) rotate(0deg) translateX(340px) rotate(0deg); }
          100% { transform: translateX(-50%) rotate(360deg) translateX(340px) rotate(-360deg); }
        }
        @keyframes landing-orbit-dot-travel-inner {
          0% { transform: translateX(-50%) rotate(0deg) translateX(260px) rotate(0deg); }
          100% { transform: translateX(-50%) rotate(-360deg) translateX(260px) rotate(360deg); }
        }
        .landing-orbit-dot-outer {
          animation: landing-orbit-dot-travel-outer 18s linear infinite;
          will-change: transform;
        }
        .landing-orbit-dot-inner {
          animation: landing-orbit-dot-travel-inner 24s linear infinite;
          will-change: transform;
        }

        .landing-marquee {
          animation: landing-marquee-left 24s linear infinite;
          will-change: transform;
        }

        .landing-marquee-reverse {
          animation: landing-marquee-right 24s linear infinite;
          will-change: transform;
        }

        @keyframes slide-in-from-right {
          from {
            opacity: 0;
            transform: translate3d(24px, 0, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes slide-in-from-left {
          from {
            opacity: 0;
            transform: translate3d(-24px, 0, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .landing-float,
          .landing-marquee,
          .landing-marquee-reverse,
          .landing-orbit-outer,
          .landing-orbit-inner,
          .landing-orbit-dot-outer,
          .landing-orbit-dot-inner {
            animation: none !important;
          }
        }

        .landing-hero-word {
          display: inline-block;
          transition: color 0.4s ease, text-shadow 0.4s ease, transform 0.3s ease;
          cursor: default;
        }

        .landing-hero-word.landing-hero-word-active {
          color: var(--word-color) !important;
          text-shadow: 0 0 30px color-mix(in srgb, var(--word-color) 40%, transparent),
                       0 0 60px color-mix(in srgb, var(--word-color) 20%, transparent);
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}
