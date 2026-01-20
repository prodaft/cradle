/**
 * Dracula Theme Port
 * Ported from the popular Dracula theme by Zeno Rocha
 * https://draculatheme.com
 * 
 * A dark theme with vibrant neon colors on a deep purple-gray background
 */

const commonVars = {
    "--font-sans": "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
    "--font-serif": "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
    "--font-mono": "'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    "--radius": "0.5rem",
    "--shadow-x": "0",
    "--shadow-y": "1px",
    "--shadow-blur": "3px",
    "--shadow-spread": "0px",
    "--shadow-opacity": "0.15",
    "--shadow-color": "oklch(0 0 0)",
    "--shadow-2xs": "0 1px 3px 0px hsl(0 0% 0% / 0.08)",
    "--shadow-xs": "0 1px 3px 0px hsl(0 0% 0% / 0.08)",
    "--shadow-sm": "0 1px 3px 0px hsl(0 0% 0% / 0.12), 0 1px 2px -1px hsl(0 0% 0% / 0.12)",
    "--shadow": "0 1px 3px 0px hsl(0 0% 0% / 0.12), 0 1px 2px -1px hsl(0 0% 0% / 0.12)",
    "--shadow-md": "0 1px 3px 0px hsl(0 0% 0% / 0.12), 0 2px 4px -1px hsl(0 0% 0% / 0.12)",
    "--shadow-lg": "0 1px 3px 0px hsl(0 0% 0% / 0.15), 0 4px 6px -1px hsl(0 0% 0% / 0.15)",
    "--shadow-xl": "0 1px 3px 0px hsl(0 0% 0% / 0.15), 0 8px 10px -1px hsl(0 0% 0% / 0.15)",
    "--shadow-2xl": "0 1px 3px 0px hsl(0 0% 0% / 0.3)",
};

/**
 * Dracula Theme
 * Signature colors:
 * - Background: #282A36 (deep purple-gray)
 * - Foreground: #F8F8F2 (off-white)
 * - Pink: #FF79C6 (primary accent)
 * - Purple: #BD93F9 (secondary accent)
 * - Cyan: #8BE9FD
 * - Green: #50FA7B
 * - Orange: #FFB86C
 * - Red: #FF5555
 * - Yellow: #F1FA8C
 */
export const dracula = {
    name: "dracula",
    // Core colors - Dracula's signature purple-gray
    "--background": "#282a36",
    "--foreground": "#f8f8f2",
    "--card": "#21222c",
    "--card-foreground": "#f8f8f2",
    "--popover": "#21222c",
    "--popover-foreground": "#f8f8f2",
    
    // Primary - Dracula's signature pink
    "--primary": "#ff79c6",
    "--primary-foreground": "#282a36",
    
    // Secondary - selection color
    "--secondary": "#44475a",
    "--secondary-foreground": "#f8f8f2",
    
    // Muted - comment color
    "--muted": "#343746",
    "--muted-foreground": "#6272a4",
    
    // Accent - purple
    "--accent": "#bd93f9",
    "--accent-foreground": "#282a36",
    
    // Destructive - Dracula red
    "--destructive": "#ff5555",
    "--destructive-foreground": "#f8f8f2",
    
    // Borders and inputs
    "--border": "#44475a",
    "--input": "#44475a",
    "--ring": "#bd93f9",
    
    // Charts - Dracula's vibrant palette
    "--chart-1": "#bd93f9", // Purple
    "--chart-2": "#50fa7b", // Green
    "--chart-3": "#8be9fd", // Cyan
    "--chart-4": "#ff79c6", // Pink
    "--chart-5": "#ffb86c", // Orange
    
    // Sidebar
    "--sidebar": "#21222c",
    "--sidebar-foreground": "#f8f8f2",
    "--sidebar-primary": "#ff79c6",
    "--sidebar-primary-foreground": "#282a36",
    "--sidebar-accent": "#44475a",
    "--sidebar-accent-foreground": "#f8f8f2",
    "--sidebar-border": "#191a21",
    "--sidebar-ring": "#bd93f9",
    
    // ProseMirror editor variables
    "--pm-header-mark-color": "#bd93f9",
    "--pm-link-color": "#8be9fd",
    "--pm-muted-color": "#6272a4",
    "--pm-code-background-color": "#343746",
    "--pm-code-btn-background-color": "#44475a",
    "--pm-code-btn-hover-background-color": "#525568",
    "--pm-blockquote-vertical-line-background-color": "#44475a",
    "--pm-cursor-color": "#f8f8f2",
    
    ...commonVars,
};
