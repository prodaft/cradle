/**
 * Theme Context Provider
 * Manages dark/light theme state and syncs with user profile
 */

import type { ThemeContextValue } from '@/types/index';
import {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { useProfile } from '../user';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Props for ThemeProvider component
 */
export interface ThemeProviderProps {
    children: ReactNode;
}

/**
 * Internal hook to use theme context
 *
 * @returns Theme context value
 * @throws Error if used outside ThemeProvider
 */
function useThemeInternal() {
    const getInitialTheme = () => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            return savedTheme === 'dark';
        }

        return true; // Dark mode by default
    };

    const [isDarkMode, setIsDarkMode] = useState(getInitialTheme);

    useEffect(() => {
        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => {
            if (!localStorage.getItem('theme')) {
                setIsDarkMode(e.matches);
            }
        };

        mediaQuery.addEventListener('change', handleChange);

        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    useEffect(() => {
        // Update localStorage whenever theme changes
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    }, [isDarkMode]);

    const toggleTheme = () => {
        setIsDarkMode((prev) => !prev);
    };

    const setTheme = (theme) => {
        if (theme === 'dark' || theme === 'light') {
            setIsDarkMode(theme === 'dark');
        } else {
            console.warn('Invalid theme value. Use "dark" or "light".');
        }
    };

    return { isDarkMode, toggleTheme, setTheme };
}

/**
 * ThemeProvider component
 * Provides theme state and controls to the application
 */
export function ThemeProvider({ children }: ThemeProviderProps): JSX.Element {
    const { isDarkMode: isDarkModeHook, toggleTheme, setTheme } = useThemeInternal();
    const { profile } = useProfile();

    useEffect(() => {
        if (profile?.theme) {
            setTheme(profile.theme);
        }
    }, [profile?.theme, setTheme]);

    const isDarkMode = useMemo(() => {
        return profile ? profile.theme === 'dark' : isDarkModeHook;
    }, [profile, isDarkModeHook]);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }, [isDarkMode]);

    const value = useMemo(
        () => ({ isDarkMode, toggleTheme, setTheme }),
        [isDarkMode, toggleTheme, setTheme],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
}
