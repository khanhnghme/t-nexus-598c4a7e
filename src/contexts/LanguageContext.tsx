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
  /** Build a localized path for the current locale */
  localizedPath: (path: string) => string;
  /** Build a path for a specific locale (for language toggle) */
  pathForLocale: (locale: Locale) => string;
  /** Change locale and persist to profile */
  setLocale: (locale: Locale) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const SITE_URL = 'https://t-nexus.io.vn';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, user } = useAuth();

  // For internal routes (no locale prefix), prefer profile's saved locale
  const urlLocale = getLocaleFromPath(location.pathname);
  const [profileLocale, setProfileLocale] = useState<Locale | null>(null);

  // Sync profileLocale from profile
  useEffect(() => {
    if (profile?.preferred_locale) {
      const pl = profile.preferred_locale as Locale;
      if (ALL_LOCALES.includes(pl)) {
        setProfileLocale(pl);
      }
    }
  }, [profile?.preferred_locale]);

  // Auto-apply saved locale on login for internal routes
  useEffect(() => {
    if (!user || !profileLocale) return;
    // Only redirect if on an internal route (no explicit locale prefix in URL)
    // and the saved locale differs from current URL locale
    const isInternalRoute = !location.pathname.startsWith('/vi/') && location.pathname !== '/vi';
    if (profileLocale !== 'en' && isInternalRoute && urlLocale === 'en') {
      const canonical = stripLocalePrefix(location.pathname);
      navigate(buildLocalizedPath(canonical, profileLocale), { replace: true });
    }
  }, [user, profileLocale]);

  const locale = urlLocale;
  const t = useMemo(() => getTranslations(locale), [locale]);

  const lp = useMemo(
    () => (path: string) => buildLocalizedPath(path, locale),
    [locale],
  );

  const pathForLocale = useMemo(
    () => (targetLocale: Locale) => {
      const canonical = stripLocalePrefix(location.pathname);
      return buildLocalizedPath(canonical, targetLocale);
    },
    [location.pathname],
  );

  const setLocale = useCallback(async (newLocale: Locale) => {
    // Save to DB
    if (user) {
      await supabase.from('profiles').update({ preferred_locale: newLocale }).eq('id', user.id);
    }
    setProfileLocale(newLocale);
    // Navigate to new locale path
    const canonical = stripLocalePrefix(location.pathname);
    navigate(buildLocalizedPath(canonical, newLocale), { replace: true });
  }, [user, location.pathname, navigate]);

  // Side effect: update <html lang> attribute
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  // Side effect: inject hreflang <link> tags for SEO
  useEffect(() => {
    const HEAD_ID = 'i18n-hreflang';
    document.querySelectorAll(`link[data-i18n="${HEAD_ID}"]`).forEach((el) => el.remove());

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
  }, [location.pathname, locale]);

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
