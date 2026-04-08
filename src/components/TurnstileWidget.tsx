import { useEffect, useRef, useCallback, useState } from 'react';

const TURNSTILE_SITE_KEY = '0x4AAAAAAC03fWi2C7rYFMTV';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

interface TurnstileCallbacks {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

export function TurnstileWidget({ onVerify, onExpire, onError }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const scriptRequestedRef = useRef(false);
  const callbacksRef = useRef<TurnstileCallbacks>({ onVerify, onExpire, onError });
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  useEffect(() => {
    callbacksRef.current = { onVerify, onExpire, onError };
  }, [onVerify, onExpire, onError]);

  const removeWidget = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      try { window.turnstile.remove(widgetIdRef.current); } catch {}
      widgetIdRef.current = null;
    }

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }
  }, []);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile) return;

    removeWidget();

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme,
      callback: (token: string) => callbacksRef.current.onVerify(token),
      'expired-callback': () => callbacksRef.current.onExpire?.(),
      'error-callback': () => callbacksRef.current.onError?.(),
    });
  }, [removeWidget, theme]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const nextTheme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      setTheme((prevTheme) => (prevTheme === nextTheme ? prevTheme : nextTheme));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (window.turnstile) {
      renderWidget();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[src*="turnstile"]');
    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        renderWidget();
        return;
      }

      const handleLoad = () => {
        existingScript.dataset.loaded = 'true';
        renderWidget();
      };

      existingScript.addEventListener('load', handleLoad, { once: true });
      return () => existingScript.removeEventListener('load', handleLoad);
    }

    if (scriptRequestedRef.current) return;
    scriptRequestedRef.current = true;

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;

    const handleLoad = () => {
      script.dataset.loaded = 'true';
      renderWidget();
    };

    script.addEventListener('load', handleLoad, { once: true });
    document.head.appendChild(script);

    return () => script.removeEventListener('load', handleLoad);
  }, [renderWidget]);

  useEffect(() => {
    return () => {
      removeWidget();
    };
  }, [removeWidget]);

  return <div ref={containerRef} className="flex justify-center" />;
}
