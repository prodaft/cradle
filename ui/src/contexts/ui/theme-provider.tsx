/**
 * Theme Context Provider
 * Manages theme settings state and syncs with user profile
 *
 * Single source of truth:
 * - If profile.theme exists → it is the source of truth
 * - Else → fallback to localStorage
 */

import { useAuthActions, useAuthState } from '@/hooks/auth/use-auth';
import { queryKeys } from '@/hooks/query';
import type { ThemeConfig, ThemeContextValue } from '@/types';
import { darkTheme, lightTheme } from '@/utils/themes';
import { $api, fetchClient } from '@services/openapi/client';
import { useMutation } from '@tanstack/react-query';
import React, {
    ReactNode,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { ThemeContext } from './theme-context';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

// Radius, fonts, shadows and spacing belong to the base-lyra style in globals.css, not to
// themes, so a theme can never override them.
const STRUCTURAL_VAR = /^--(radius|font-|shadow|spacing|tracking|letter-spacing)/;

const sanitizeThemeVars = (vars: Record<string, unknown>): ThemeConfig => {
    const entries = Object.entries(vars).filter(
        (entry): entry is [string, string] =>
            typeof entry[1] === 'string' && !STRUCTURAL_VAR.test(entry[0]),
    );
    return Object.fromEntries(entries) as ThemeConfig;
};

const coerceThemeConfig = (value: unknown): ThemeConfig | null =>
    isPlainObject(value) ? sanitizeThemeVars(value) : null;

/**
 * Lightness (0-1) of a theme colour in the formats the presets use (`#rgb`, `#rrggbb[aa]`,
 * `oklch(L ...)`), or null when it can't be read.
 */
const colorLightness = (value: string | undefined): number | null => {
    const color = value?.trim().toLowerCase();
    if (!color) return null;
    const oklch = /^oklch\(\s*([\d.]+)(%?)/.exec(color);
    if (oklch?.[1]) {
        const l = Number(oklch[1]);
        return oklch[2] ? l / 100 : l;
    }
    const hex = /^#([\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/.exec(color)?.[1];
    if (!hex) return null;
    const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};

const isDarkTheme = (theme: ThemeConfig): boolean => {
    const lightness = colorLightness(theme['--background']);
    return lightness === null ? theme.name !== 'light' : lightness < 0.5;
};

const parseStoredTheme = (value: string | null): ThemeConfig | null => {
    if (!value) {
        return null;
    }
    try {
        return coerceThemeConfig(JSON.parse(value));
    } catch {
        return null;
    }
};

/**
 * Props for ThemeProvider component
 */
interface ThemeProviderProps {
    children: ReactNode;
}

/**
 * ThemeProvider component
 * Provides theme state and controls to the application
 */
export function ThemeProvider({ children }: ThemeProviderProps): React.JSX.Element {
    const { isLoggedIn } = useAuthActions();
    const { isInitializing } = useAuthState();
    const { data: profile } = $api.useQuery(
        'get',
        '/users/{user_id}/',
        {
            params: { path: { user_id: 'me' } },
        },
        {
            enabled: isLoggedIn() && !isInitializing,
            meta: { showErrorToast: false },
        },
    );

    const [localTheme, setLocalTheme] = useState<ThemeConfig | null>(null);

    useEffect(() => {
        const stored = parseStoredTheme(localStorage.getItem('theme'));
        if (stored) setLocalTheme(stored);
    }, []);
    const appliedVarsRef = useRef<string[]>([]);

    const updateThemeMutation = useMutation({
        mutationFn: async (theme: ThemeConfig) => {
            const { data, error, response } = await fetchClient.PATCH(
                '/users/{user_id}/',
                {
                    params: { path: { user_id: 'me' } },
                    body: { theme },
                },
            );
            if (error) throw { response, error };
            return data;
        },
        meta: {
            suppressNotification: true, // Theme changes are silent
            invalidateQueries: [{ queryKey: queryKeys.users.apiDetails() }],
        },
    });

    const profileTheme = useMemo(
        () => coerceThemeConfig(profile?.theme),
        [profile?.theme],
    );
    const activeTheme: ThemeConfig = profileTheme ?? localTheme ?? darkTheme;

    const isDarkMode = isDarkTheme(activeTheme);

    // Sync profile theme to localStorage for instant load on refresh
    useEffect(() => {
        if (profileTheme) {
            localStorage.setItem('theme', JSON.stringify(profileTheme));
        }
    }, [profileTheme]);

    // Apply theme CSS variables from the theme settings. Layout effects (here and
    // for data-theme) so they're set before descendants' effects read computed colors.
    useLayoutEffect(() => {
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

    useLayoutEffect(() => {
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
