// Common type definitions (theme + graph). Consumed via @/types/index.

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

// ============================================================================
// Graph Types
// ============================================================================
// NOTE: For graph visualization with D3 force simulation properties,
// use GraphNode and GraphLink from @/types instead.

/**
 * Internal graph edge type for visualization.
 * Note: Entry IDs are numbers (BigAutoField), not strings.
 * Relation IDs are UUIDs (strings).
 */
export interface GraphEdge {
    id?: string; // Relation UUID (optional)
    source: number; // Entry ID (BigAutoField)
    target: number; // Entry ID (BigAutoField)
    type?: string;
    label?: string;
    properties?: Record<string, any>;
}
