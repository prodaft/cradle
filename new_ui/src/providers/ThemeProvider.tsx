import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CustomProvider } from 'rsuite';
import { preloadRSuiteThemes } from '../utils/rsuite-theme-loader';
import { 
  applyTheme, 
  getSystemTheme, 
  getThemeLogo,
  saveThemePreference,
  loadThemePreference,
  AVAILABLE_THEMES,
  type ThemeType 
} from '../styles/theme-config';

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  isDarkMode: boolean;
  // Theme properties
  themeName: string;
  themeDescription: string;
  // Logo utilities
  logo: string;
  logoNoText: string;
  getLogo: (withText?: boolean) => string;
  // Access to theme configuration
  themeConfig: typeof AVAILABLE_THEMES[ThemeType];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Preload RSuite themes for faster switching
  useEffect(() => {
    preloadRSuiteThemes();
  }, []);

  const [theme, setThemeState] = useState<ThemeType>(() => {
    // Try to load saved preference first
    const savedTheme = loadThemePreference();
    if (savedTheme) {
      return savedTheme;
    }
    
    // Check system preference for light/dark only
    const systemTheme = getSystemTheme();
    return systemTheme;
  });

  // Apply theme when it changes
  useEffect(() => {
    applyTheme(theme);
    saveThemePreference(theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const savedTheme = loadThemePreference();
      if (!savedTheme) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
  };

  // Get current theme configuration
  const currentThemeConfig = AVAILABLE_THEMES[theme];

  const value: ThemeContextType = {
    theme,
    setTheme,
    isDarkMode: theme === 'dark',
    // Theme properties
    themeName: currentThemeConfig.name,
    themeDescription: currentThemeConfig.description,
    // Logo utilities
    logo: currentThemeConfig.logo,
    logoNoText: currentThemeConfig.logoNoText,
    getLogo: (withText = true) => getThemeLogo(theme, withText),
    // Access to theme configuration
    themeConfig: currentThemeConfig,
  };

  return (
    <ThemeContext.Provider value={value}>
      <CustomProvider>
        {children}
      </CustomProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
