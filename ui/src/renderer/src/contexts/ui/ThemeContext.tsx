/**
 * Theme Context Provider
 * Manages dark/light theme state and syncs with user profile
 */

import { createContext, useContext, useEffect, useMemo, ReactNode } from 'react';
import { useProfile } from '../user';
import { useTheme as useThemeHook } from '../ui';
import type { ThemeContextValue } from '@/types/index';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Props for ThemeProvider component
 */
export interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * ThemeProvider component
 * Provides theme state and controls to the application
 */
export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
  const { isDarkMode: isDarkModeHook, toggleTheme, setTheme } = useThemeHook();
  const { profile } = useProfile();

  const isDarkMode = useMemo(() => {
    if (profile) {
      setTheme(profile.theme);
      return profile.theme === 'dark';
    }
    return isDarkModeHook;
  }, [profile, isDarkModeHook, setTheme]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [isDarkMode]);

  const value = useMemo(
    () => ({ isDarkMode, toggleTheme, setTheme }),
    [isDarkMode, toggleTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to use theme context
 *
 * @returns Theme context value
 * @throws Error if used outside ThemeProvider
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
