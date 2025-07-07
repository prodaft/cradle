// Theme configuration and utilities
import { loadRSuiteTheme, type RSuiteTheme } from '../utils/rsuite-theme-loader';
import { catppuccinMocha } from "@catppuccin/codemirror"
import { oneDark } from '@codemirror/theme-one-dark';

export type ThemeType = 'light' | 'dark' | 'ocean' | 'catppuccin_mocha';

export const AVAILABLE_THEMES: Record<ThemeType, { 
  name: string; 
  description: string;
  logo: string;
  logoNoText: string;
  codeMirrorTheme: any;
}> = {
  light: {
    name: 'Light',
    description: 'Clean light theme with high contrast',
    logo: '/src/assets/logos/dark.svg',
    logoNoText: '/src/assets/logos/dark_notext.svg',
    codeMirrorTheme: 'default'
  },
  dark: {
    name: 'Dark', 
    description: 'Easy on the eyes dark theme',
    logo: '/src/assets/logos/light.svg',
    logoNoText: '/src/assets/logos/light_notext.svg',
    codeMirrorTheme: oneDark,
  },
  ocean: {
    name: 'Ocean Blue',
    description: 'Calming blue-themed interface',
    logo: '/src/assets/logos/ocean.svg',
    logoNoText: '/src/assets/logos/ocean_notext.svg',
    codeMirrorTheme: 'material'
  },
  catppuccin_mocha: {
    name: 'Ocean Blue',
    description: 'Catppuccin Mocha theme with soft pastel colors',
    logo: '/src/assets/logos/light.svg',
    logoNoText: '/src/assets/logos/light_notext.svg',
    codeMirrorTheme: catppuccinMocha,
  }
};

export const DEFAULT_THEME: ThemeType = 'light';

// Theme detection utilities
export const getSystemTheme = (): ThemeType => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Theme application utilities - now simpler since CSS variables are global
export const applyTheme = (theme: ThemeType): void => {
  // Add transition class to prevent flash
  document.body.classList.add('theme-switching');
  
  // Set theme attribute to activate the correct theme styles
  document.documentElement.setAttribute('data-theme', theme);
  
  // Load corresponding RSuite theme
  loadRSuiteTheme(theme as RSuiteTheme);
  
  // Remove transition class after a brief delay
  setTimeout(() => {
    document.body.classList.remove('theme-switching');
  }, 100);
};

// Theme persistence utilities
export const saveThemePreference = (theme: ThemeType): void => {
  localStorage.setItem('theme', theme);
};

export const loadThemePreference = (): ThemeType | null => {
  const saved = localStorage.getItem('theme') as ThemeType;
  return AVAILABLE_THEMES[saved] ? saved : null;
};

export const getThemeLogo = (theme: ThemeType, withText: boolean = true): string => {
  return withText ? AVAILABLE_THEMES[theme].logo : AVAILABLE_THEMES[theme].logoNoText;
};
