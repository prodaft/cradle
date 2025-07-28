import { createContext, useContext, useEffect, useMemo } from 'react';
import { useProfile } from '../../contexts/ProfileContext/ProfileContext';
import { useTheme as useThemeHook } from '../../hooks/useTheme/useTheme';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const { isDarkMode: isDarkModeHook, toggleTheme, setTheme } = useThemeHook();
    const { profile } = useProfile();

    const isDarkMode = useMemo(() => {
        if (profile) {
            setTheme(profile.theme);
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
