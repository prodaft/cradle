/**
 * Theme Context Provider
 * Manages dark/light theme state and syncs with user profile
 *
 * Single source of truth:
 * - If profile.theme exists → it is the source of truth
 * - Else → fallback to localStorage/system theme
 */

import useApi from '@/hooks/api/useApi';
import { useAuthActions } from '@/hooks/auth/useAuth';
import { queryKeys } from '@/hooks/query';
import { useProfile } from '@/hooks/user/useProfile';
import type { Theme, ThemeContextValue } from '@/types/index';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

/**
 * Hook to access theme context
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
export function ThemeProvider({ children }: ThemeProviderProps): React.JSX.Element {
    const { profile, setProfile } = useProfile();
    const { usersApi } = useApi();
    const { isLoggedIn } = useAuthActions();
    const queryClient = useQueryClient();

    // Local state for fallback (when no profile)
    const [localTheme, setLocalTheme] = useState<Theme | null>(() => {
        const saved = localStorage.getItem('theme');
        return saved === 'dark' || saved === 'light' ? saved : null;
    });

    // Mutation to update theme on server
    const updateThemeMutation = useMutation({
        mutationFn: async (theme: Theme) => {
            return await usersApi.usersUpdate({
                userId: 'me',
                userUpdateRequest: { theme },
            });
        },
        onSuccess: (data) => {
            // Update query cache with new profile data
            const meKey = queryKeys.users.detail('me');
            queryClient.setQueryData(meKey, data);
            // Also update via setProfile for immediate UI update
            setProfile((prev) =>
                prev ? { ...prev, theme: data.theme as Theme } : null,
            );
        },
        meta: {
            suppressNotification: true, // Theme changes are silent
        },
    });

    // Single source of truth: profile.theme if exists, else localTheme/system
    const isDarkMode = useMemo(() => {
        if (profile?.theme) {
            return profile.theme === 'dark';
        }
        if (localTheme) {
            return localTheme === 'dark';
        }
        // Fallback to system preference
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }, [profile?.theme, localTheme]);

    // Listen for system theme changes (only when no profile and no localStorage)
    useEffect(() => {
        if (profile?.theme || localTheme) {
            return; // Don't listen if we have a preference
        }

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
            // Only update if no profile and no localStorage preference
            if (!profile?.theme && !localTheme) {
                // Store system preference so it persists
                const newTheme: Theme = e.matches ? 'dark' : 'light';
                localStorage.setItem('theme', newTheme);
                setLocalTheme(newTheme);
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [profile?.theme, localTheme]);

    // Update DOM when theme changes
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    // Toggle theme - persists to source of truth
    const toggleTheme = () => {
        const newTheme: Theme = isDarkMode ? 'light' : 'dark';

        if (isLoggedIn() && profile) {
            // Logged in: persist to profile via mutation
            updateThemeMutation.mutate(newTheme);
        } else {
            // Not logged in: update localStorage
            localStorage.setItem('theme', newTheme);
            setLocalTheme(newTheme);
        }
    };

    // Set theme explicitly - persists to source of truth
    const setTheme = (theme: Theme) => {
        if (theme !== 'dark' && theme !== 'light') {
            console.warn('Invalid theme value. Use "dark" or "light".');
            return;
        }

        if (isLoggedIn() && profile) {
            // Logged in: persist to profile via mutation
            updateThemeMutation.mutate(theme);
        } else {
            // Not logged in: update localStorage
            localStorage.setItem('theme', theme);
            setLocalTheme(theme);
        }
    };

    const value = useMemo(
        () => ({ isDarkMode, toggleTheme, setTheme }),
        [isDarkMode, toggleTheme, setTheme],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
