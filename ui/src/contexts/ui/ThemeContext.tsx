/**
 * Theme Context
 * Holds theme context instance and access hook.
 */

import type { ThemeContextValue } from '@/types/index';
import { createContext, useContext } from 'react';

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

export { ThemeContext };
