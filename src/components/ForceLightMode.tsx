import { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

/**
 * Forces light mode while this component is mounted.
 * When unmounted (e.g. navigating to a protected route), restores the user's saved theme.
 * Use this to wrap all public/pre-login pages.
 */
export function ForceLightMode({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const savedTheme = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Save the user's current theme preference on first mount
    if (savedTheme.current === undefined) {
      savedTheme.current = theme;
    }

    // Force light mode
    if (theme !== 'light') {
      setTheme('light');
    }

    return () => {
      // Restore the user's saved theme when leaving a public page
      if (savedTheme.current && savedTheme.current !== 'light') {
        setTheme(savedTheme.current);
      }
    };
  }, [theme, setTheme]);

  return <>{children}</>;
}
