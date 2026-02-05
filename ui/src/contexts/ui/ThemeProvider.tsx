/**
 * Theme Context Provider
 * Manages theme settings state and syncs with user profile
 *
 * Single source of truth:
 * - If profile.theme exists → it is the source of truth
 * - Else → fallback to localStorage
 */

import useApi from '@/hooks/api/useApi';
import { useAuthActions } from '@/hooks/auth/useAuth';
import { queryKeys } from '@/hooks/query';
import type { ThemeConfig, ThemeContextValue } from '@/types/index';
import { darkTheme, lightTheme } from '@/utils/themes';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, {
    ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { ThemeContext } from './ThemeContext';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const sanitizeThemeVars = (vars: Record<string, unknown>): ThemeConfig => {
    const entries = Object.entries(vars).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
    );
    return Object.fromEntries(entries) as ThemeConfig;
};

const coerceThemeConfig = (value: unknown): ThemeConfig | null => {
    if (typeof value === 'string') {
        try {
            return coerceThemeConfig(JSON.parse(value));
        } catch {
            return null;
        }
    }
    if (!isPlainObject(value)) {
        return null;
    }

    // If theme has a 'vars' key, extract it (legacy format)
    if ('vars' in value && isPlainObject(value.vars)) {
        return sanitizeThemeVars(value.vars);
    }

    // Otherwise, treat the whole object as theme vars
    return sanitizeThemeVars(value);
};

const parseStoredTheme = (value: string | null): ThemeConfig | null => {
    if (!value) {
        return null;
    }
    return coerceThemeConfig(value);
};

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
    const { usersApi } = useApi();
    const { isLoggedIn } = useAuthActions();
    const queryClient = useQueryClient();
    const { data: profile } = useQuery({
        queryKey: queryKeys.users.detail('me'),
        queryFn: () => usersApi.usersRetrieve({ userId: 'me' }),
        enabled: isLoggedIn(),
        meta: { showErrorToast: false },
    });

    // Local state for fallback (when no profile). SSR-safe: no localStorage on server.
    const [localTheme, setLocalTheme] = useState<ThemeConfig | null>(() =>
        typeof window === 'undefined'
            ? null
            : parseStoredTheme(localStorage.getItem('theme')),
    );
    const appliedVarsRef = useRef<string[]>([]);

    // Mutation to update theme on server
    const updateThemeMutation = useMutation({
        mutationFn: async (theme: ThemeConfig) => {
            return await usersApi.usersUpdate({
                userId: 'me',
                userUpdateRequest: { theme },
            });
        },
        onSuccess: (data) => {
            // Update query cache with new profile data
            const meKey = queryKeys.users.detail('me');
            queryClient.setQueryData(meKey, data);
        },
        meta: {
            suppressNotification: true, // Theme changes are silent
        },
    });

    const profileTheme = useMemo(
        () => coerceThemeConfig(profile?.theme),
        [profile?.theme],
    );
    const activeTheme: ThemeConfig = profileTheme ?? localTheme ?? darkTheme;

    // Determine if current theme is dark mode by checking the name field
    const isDarkMode = useMemo(() => {
        // If theme has a name field, use it
        if (activeTheme.name) {
            return activeTheme.name !== 'light';
        }
        // Fallback to comparing with light theme
        const activeThemeStr = JSON.stringify(activeTheme);
        const lightThemeStr = JSON.stringify(lightTheme);
        return activeThemeStr !== lightThemeStr;
    }, [activeTheme]);

    // Sync profile theme to localStorage for instant load on refresh
    useEffect(() => {
        if (profileTheme) {
            localStorage.setItem('theme', JSON.stringify(profileTheme));
        }
    }, [profileTheme]);

    // Apply theme CSS variables from the theme settings.
    useEffect(() => {
        const root = document.documentElement;
        // Remove previously applied vars
        for (const key of appliedVarsRef.current) {
            root.style.removeProperty(key);
        }
        // Apply new vars (skip the 'name' field)
        const cssVars: string[] = [];
        for (const [key, value] of Object.entries(activeTheme)) {
            if (key !== 'name' && typeof value === 'string') {
                root.style.setProperty(key, value);
                cssVars.push(key);
            }
        }
        appliedVarsRef.current = cssVars;
    }, [activeTheme]);

    useEffect(() => {
        document.documentElement.dataset.theme = isDarkMode ? 'dark' : 'light';
    }, [isDarkMode]);

    // Set theme explicitly - persists to source of truth
    const setTheme = useCallback(
        (theme: ThemeConfig) => {
            if (!isPlainObject(theme)) {
                console.warn('Invalid theme value. Theme must be a JSON object.');
                return;
            }

            const sanitized = sanitizeThemeVars(theme);

            if (isLoggedIn() && profile) {
                // Logged in: persist to profile via mutation
                updateThemeMutation.mutate(sanitized);
            } else {
                // Not logged in: update localStorage
                localStorage.setItem('theme', JSON.stringify(sanitized));
                setLocalTheme(sanitized);
            }
        },
        [isLoggedIn, profile, updateThemeMutation],
    );

    // Toggle between dark and light preset themes
    const toggleTheme = useCallback(() => {
        const newTheme = isDarkMode ? lightTheme : darkTheme;
        setTheme(newTheme);
    }, [isDarkMode, setTheme]);

    const value = useMemo<ThemeContextValue>(
        () => ({ isDarkMode, activeTheme, setTheme, toggleTheme }),
        [isDarkMode, activeTheme, setTheme, toggleTheme],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
