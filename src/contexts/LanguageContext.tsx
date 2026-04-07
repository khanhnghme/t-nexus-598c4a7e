import { createContext, useContext, useEffect, useMemo, useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  type Locale,
  type Translations,
  getLocaleFromPath,
  getTranslations,
  localizedPath as buildLocalizedPath,
  stripLocalePrefix,
  ALL_LOCALES,
  DEFAULT_LOCALE,
} from '@/lib/i18n';

interface LanguageContextValue {
  /** Current active locale */
  locale: Locale;
  /** Full translations object for the current locale */
  translations: Translations;
  /** Build a localized path for the current locale (only adds prefix for public routes) */
  localizedPath: (path: string) => string;
  /** Build a path for a specific locale (for language toggle on public pages) */
  pathForLocale: (locale: Locale) => string;
  /** Change locale and persist to profile */
  setLocale: (locale: Locale) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const SITE_URL = 'https://t-nexus.io.vn';

/**
 * Public routes use URL-based locale prefix (/vi/auth, /en/pricing).
 * Internal routes (dashboard, workspace, etc.) use profile.preferred_locale.
 */
const PUBLIC_CANONICAL_PATHS = ['/', '/auth', '/pricing', '/download', '/terms'];

function isPublicRoute(pathname: string): boolean {
  const canonical = stripLocalePrefix(pathname);
  return PUBLIC_CANONICAL_PATHS.includes(canonical);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user } = useAuth();

  const urlLocale = getLocaleFromPath(location.pathname);
  const [profileLocale, setProfileLocale] = useState<Locale>(DEFAULT_LOCALE);

  // Sync profileLocale from profile
  useEffect(() => {
    if (profile?.preferred_locale) {
      const pl = profile.preferred_locale as Locale;
      if (ALL_LOCALES.includes(pl)) {
        setProfileLocale(pl);
      }
    }
  }, [profile?.preferred_locale]);

  // Determine effective locale:
  // - Public routes: use URL prefix
  // - Internal routes: use profile setting
  const isPublic = isPublicRoute(location.pathname);
  const locale: Locale = isPublic ? urlLocale : profileLocale;

  const t = useMemo(() => getTranslations(locale), [locale]);

  // localizedPath: only add prefix for public routes
  const lp = useMemo(
    () => (path: string) => {
      // If the target path is a public route, use locale prefix
      if (PUBLIC_CANONICAL_PATHS.includes(path)) {
        return buildLocalizedPath(path, locale);
      }
      // Internal routes: no prefix
      return path;
    },
    [locale],
  );

  const pathForLocale = useMemo(
    () => (targetLocale: Locale) => {
      if (isPublic) {
        const canonical = stripLocalePrefix(location.pathname);
        return buildLocalizedPath(canonical, targetLocale);
      }
      // Internal routes don't change URL for locale
      return location.pathname;
    },
    [location.pathname, isPublic],
  );

  const setLocale = useCallback(async (newLocale: Locale) => {
    // Save to DB
    if (user) {
      await supabase.from('profiles').update({ preferred_locale: newLocale }).eq('id', user.id);
    }
    setProfileLocale(newLocale);
    // Only navigate for public routes
    if (isPublicRoute(location.pathname)) {
      const canonical = stripLocalePrefix(location.pathname);
      navigate(buildLocalizedPath(canonical, newLocale), { replace: true });
    }
  }, [user, location.pathname, navigate]);

  // Side effect: update <html lang> attribute
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // Side effect: inject hreflang <link> tags for SEO (only on public routes)
  useEffect(() => {
    const HEAD_ID = 'i18n-hreflang';
    document.querySelectorAll(`link[data-i18n="${HEAD_ID}"]`).forEach((el) => el.remove());

    if (!isPublic) return;

    const canonical = stripLocalePrefix(location.pathname);

    ALL_LOCALES.forEach((loc) => {
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = loc;
      link.href = `${SITE_URL}${buildLocalizedPath(canonical, loc)}`;
      link.dataset.i18n = HEAD_ID;
      document.head.appendChild(link);
    });

    const xDefault = document.createElement('link');
    xDefault.rel = 'alternate';
    xDefault.hreflang = 'x-default';
    xDefault.href = `${SITE_URL}${buildLocalizedPath(canonical, DEFAULT_LOCALE)}`;
    xDefault.dataset.i18n = HEAD_ID;
    document.head.appendChild(xDefault);

    return () => {
      document.querySelectorAll(`link[data-i18n="${HEAD_ID}"]`).forEach((el) => el.remove());
    };
  }, [location.pathname, locale, isPublic]);

  const value = useMemo<LanguageContextValue>(
    () => ({ locale, translations: t, localizedPath: lp, pathForLocale, setLocale }),
    [locale, t, lp, pathForLocale, setLocale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

/**
 * Hook to access the current locale and translations.
 */
export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    // Fallback for non-localized routes (dashboard, etc.)
    return {
      locale: DEFAULT_LOCALE,
      translations: getTranslations(DEFAULT_LOCALE),
      localizedPath: (p: string) => p,
      pathForLocale: (loc: Locale) => buildLocalizedPath('/', loc),
      setLocale: async () => {},
    };
  }
  return ctx;
}
