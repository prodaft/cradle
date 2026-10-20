// Common type definitions (theme). Consumed via @/types; generated API model aliases live in @/types/models.

// ============================================================================
// Theme Types
// ============================================================================

export interface ThemeConfig {
    name?: string;
    [key: string]: string | undefined;
}

export interface ThemeContextValue {
    isDarkMode: boolean;
    activeTheme: ThemeConfig;
    setTheme: (theme: ThemeConfig) => void;
    toggleTheme: () => void;
}
