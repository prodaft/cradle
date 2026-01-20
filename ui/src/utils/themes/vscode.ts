/**
 * VS Code Theme Ports
 * Ported from official VS Code themes
 */

const commonVars = {
    "--font-sans": "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
    "--font-serif": "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
    "--font-mono": "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    "--radius": "0.625rem",
    "--shadow-x": "0",
    "--shadow-y": "1px",
    "--shadow-blur": "3px",
    "--shadow-spread": "0px",
    "--shadow-opacity": "0.1",
    "--shadow-color": "oklch(0 0 0)",
    "--shadow-2xs": "0 1px 3px 0px hsl(0 0% 0% / 0.05)",
    "--shadow-xs": "0 1px 3px 0px hsl(0 0% 0% / 0.05)",
    "--shadow-sm": "0 1px 3px 0px hsl(0 0% 0% / 0.1), 0 1px 2px -1px hsl(0 0% 0% / 0.1)",
    "--shadow": "0 1px 3px 0px hsl(0 0% 0% / 0.1), 0 1px 2px -1px hsl(0 0% 0% / 0.1)",
    "--shadow-md": "0 1px 3px 0px hsl(0 0% 0% / 0.1), 0 2px 4px -1px hsl(0 0% 0% / 0.1)",
    "--shadow-lg": "0 1px 3px 0px hsl(0 0% 0% / 0.1), 0 4px 6px -1px hsl(0 0% 0% / 0.1)",
    "--shadow-xl": "0 1px 3px 0px hsl(0 0% 0% / 0.1), 0 8px 10px -1px hsl(0 0% 0% / 0.1)",
    "--shadow-2xl": "0 1px 3px 0px hsl(0 0% 0% / 0.25)",
};

/**
 * VS Code Dark+ Theme
 * Classic VS Code dark theme with blue accent
 */
export const vscodeDark = {
    name: "vscode-dark",
    // Core colors - VS Code dark background palette
    "--background": "#1e1e1e",
    "--foreground": "#d4d4d4",
    "--card": "#252526",
    "--card-foreground": "#d4d4d4",
    "--popover": "#252526",
    "--popover-foreground": "#d4d4d4",
    
    // Primary - VS Code blue accent
    "--primary": "#007acc",
    "--primary-foreground": "#ffffff",
    
    // Secondary - subtle gray
    "--secondary": "#3c3c3c",
    "--secondary-foreground": "#d4d4d4",
    
    // Muted - darker gray
    "--muted": "#2d2d2d",
    "--muted-foreground": "#858585",
    
    // Accent
    "--accent": "#094771",
    "--accent-foreground": "#d4d4d4",
    
    // Destructive - VS Code error red
    "--destructive": "#f14c4c",
    "--destructive-foreground": "#ffffff",
    
    // Borders and inputs
    "--border": "#3c3c3c",
    "--input": "#3c3c3c",
    "--ring": "#007acc",
    
    // Charts - VS Code token colors
    "--chart-1": "#569cd6", // Blue (keywords)
    "--chart-2": "#4ec9b0", // Teal (types)
    "--chart-3": "#dcdcaa", // Yellow (functions)
    "--chart-4": "#c586c0", // Purple (control)
    "--chart-5": "#ce9178", // Orange (strings)
    
    // Sidebar
    "--sidebar": "#252526",
    "--sidebar-foreground": "#cccccc",
    "--sidebar-primary": "#007acc",
    "--sidebar-primary-foreground": "#ffffff",
    "--sidebar-accent": "#37373d",
    "--sidebar-accent-foreground": "#d4d4d4",
    "--sidebar-border": "#3c3c3c",
    "--sidebar-ring": "#007acc",
    
    // ProseMirror editor variables
    "--pm-header-mark-color": "#569cd6",
    "--pm-link-color": "#3794ff",
    "--pm-muted-color": "#858585",
    "--pm-code-background-color": "#2d2d2d",
    "--pm-code-btn-background-color": "#3c3c3c",
    "--pm-code-btn-hover-background-color": "#505050",
    "--pm-blockquote-vertical-line-background-color": "#3c3c3c",
    "--pm-cursor-color": "#aeafad",
    
    ...commonVars,
};

/**
 * VS Code Light+ Theme
 * Classic VS Code light theme
 */
export const vscodeLight = {
    name: "vscode-light",
    // Core colors - VS Code light background palette
    "--background": "#ffffff",
    "--foreground": "#333333",
    "--card": "#f3f3f3",
    "--card-foreground": "#333333",
    "--popover": "#f3f3f3",
    "--popover-foreground": "#333333",
    
    // Primary - VS Code blue accent
    "--primary": "#0066b8",
    "--primary-foreground": "#ffffff",
    
    // Secondary - subtle gray
    "--secondary": "#e5e5e5",
    "--secondary-foreground": "#333333",
    
    // Muted - lighter gray
    "--muted": "#f0f0f0",
    "--muted-foreground": "#6e6e6e",
    
    // Accent
    "--accent": "#d3e9ff",
    "--accent-foreground": "#0066b8",
    
    // Destructive - VS Code error red
    "--destructive": "#d73a49",
    "--destructive-foreground": "#ffffff",
    
    // Borders and inputs
    "--border": "#e0e0e0",
    "--input": "#e5e5e5",
    "--ring": "#0066b8",
    
    // Charts - VS Code light token colors
    "--chart-1": "#0000ff", // Blue (keywords)
    "--chart-2": "#267f99", // Teal (types)
    "--chart-3": "#795e26", // Brown (functions)
    "--chart-4": "#af00db", // Purple (control)
    "--chart-5": "#a31515", // Red (strings)
    
    // Sidebar
    "--sidebar": "#f3f3f3",
    "--sidebar-foreground": "#333333",
    "--sidebar-primary": "#0066b8",
    "--sidebar-primary-foreground": "#ffffff",
    "--sidebar-accent": "#e5e5e5",
    "--sidebar-accent-foreground": "#333333",
    "--sidebar-border": "#e0e0e0",
    "--sidebar-ring": "#0066b8",
    
    // ProseMirror editor variables
    "--pm-header-mark-color": "#0000ff",
    "--pm-link-color": "#0066b8",
    "--pm-muted-color": "#6e6e6e",
    "--pm-code-background-color": "#f0f0f0",
    "--pm-code-btn-background-color": "#e5e5e5",
    "--pm-code-btn-hover-background-color": "#d5d5d5",
    "--pm-blockquote-vertical-line-background-color": "#e0e0e0",
    "--pm-cursor-color": "#000000",
    
    ...commonVars,
};
