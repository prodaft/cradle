import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useTheme as useThemeHook } from '../../hooks/useTheme/useTheme';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const { isDarkMode: isDarkModeHook, toggleTheme } = useThemeHook();
    const { profile } = useProfile();

    const isDarkMode = useMemo(() => {
        if (profile) {
            return profile.theme === 'dark';
        }
        return isDarkModeHook;
    }, [profile, isDarkModeHook]);

    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
        }
    }, [isDarkMode]);

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

// Optional helper hook:
export function useTheme() {
    return useContext(ThemeContext);
}
