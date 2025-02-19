import React, { createContext, useContext } from 'react';
import { useTheme as useThemeHook } from '../../hooks/useTheme/useTheme';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    const { isDarkMode, toggleTheme } = useThemeHook();

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
