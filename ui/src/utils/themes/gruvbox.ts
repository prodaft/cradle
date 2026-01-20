/**
 * Gruvbox Theme Port
 * Ported from the Gruvbox color scheme
 * https://github.com/morhetz/gruvbox
 * 
 * A retro groove color scheme with warm, earthy tones
 */

const commonVars = {
    "--font-sans": "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
    "--font-serif": "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
    "--font-mono": "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    "--radius": "0.5rem",
    "--shadow-x": "0",
    "--shadow-y": "1px",
    "--shadow-blur": "3px",
    "--shadow-spread": "0px",
    "--shadow-opacity": "0.12",
    "--shadow-color": "oklch(0 0 0)",
    "--shadow-2xs": "0 1px 2px 0px hsl(0 0% 0% / 0.06)",
    "--shadow-xs": "0 1px 2px 0px hsl(0 0% 0% / 0.06)",
    "--shadow-sm": "0 1px 3px 0px hsl(0 0% 0% / 0.1), 0 1px 2px -1px hsl(0 0% 0% / 0.1)",
    "--shadow": "0 1px 3px 0px hsl(0 0% 0% / 0.1), 0 1px 2px -1px hsl(0 0% 0% / 0.1)",
    "--shadow-md": "0 2px 4px 0px hsl(0 0% 0% / 0.1), 0 2px 4px -1px hsl(0 0% 0% / 0.1)",
    "--shadow-lg": "0 4px 6px 0px hsl(0 0% 0% / 0.1), 0 4px 6px -1px hsl(0 0% 0% / 0.1)",
    "--shadow-xl": "0 8px 10px 0px hsl(0 0% 0% / 0.1), 0 8px 10px -1px hsl(0 0% 0% / 0.1)",
    "--shadow-2xl": "0 12px 16px 0px hsl(0 0% 0% / 0.2)",
};

/**
 * Gruvbox Dark Theme
 * Warm, retro dark theme with earthy brown backgrounds
 * 
 * Background palette (dark to light):
 * - bg0_hard:   #1d2021
 * - bg0_medium: #282828 (default)
 * - bg0_soft:   #32302f
 * - bg1-bg4:    #3c3836 → #7c6f64
 * 
 * Foreground palette (light to dark):
 * - fg0: #fbf1c7 (brightest)
 * - fg1: #ebdbb2 (default)
 * - fg2-fg4: progressively darker
 * 
 * Accent colors (bright variants for dark bg):
 * - Red:    #fb4934
 * - Green:  #b8bb26
 * - Yellow: #fabd2f
 * - Blue:   #83a598
 * - Purple: #d3869b
 * - Aqua:   #8ec07c
 * - Orange: #fe8019
 */
export const gruvboxDark = {
    name: "gruvbox-dark",
    // Core colors - Gruvbox dark (medium contrast)
    "--background": "#282828",
    "--foreground": "#ebdbb2",
    "--card": "#3c3836",
    "--card-foreground": "#ebdbb2",
    "--popover": "#1d2021",
    "--popover-foreground": "#ebdbb2",
    
    // Primary - Gruvbox orange (signature accent)
    "--primary": "#fe8019",
    "--primary-foreground": "#282828",
    
    // Secondary - bg1
    "--secondary": "#3c3836",
    "--secondary-foreground": "#ebdbb2",
    
    // Muted - grey tones
    "--muted": "#504945",
    "--muted-foreground": "#928374",
    
    // Accent - Gruvbox aqua
    "--accent": "#8ec07c",
    "--accent-foreground": "#282828",
    
    // Destructive - Gruvbox red (bright)
    "--destructive": "#fb4934",
    "--destructive-foreground": "#ebdbb2",
    
    // Borders and inputs
    "--border": "#504945",
    "--input": "#3c3836",
    "--ring": "#fe8019",
    
    // Charts - Gruvbox bright accent palette
    "--chart-1": "#83a598", // Blue
    "--chart-2": "#b8bb26", // Green
    "--chart-3": "#fabd2f", // Yellow
    "--chart-4": "#d3869b", // Purple
    "--chart-5": "#fe8019", // Orange
    
    // Sidebar
    "--sidebar": "#1d2021",
    "--sidebar-foreground": "#a89984",
    "--sidebar-primary": "#fe8019",
    "--sidebar-primary-foreground": "#282828",
    "--sidebar-accent": "#3c3836",
    "--sidebar-accent-foreground": "#ebdbb2",
    "--sidebar-border": "#3c3836",
    "--sidebar-ring": "#fe8019",
    
    // ProseMirror editor variables
    "--pm-header-mark-color": "#fabd2f",
    "--pm-link-color": "#83a598",
    "--pm-muted-color": "#928374",
    "--pm-code-background-color": "#3c3836",
    "--pm-code-btn-background-color": "#504945",
    "--pm-code-btn-hover-background-color": "#665c54",
    "--pm-blockquote-vertical-line-background-color": "#504945",
    "--pm-cursor-color": "#ebdbb2",
    
    ...commonVars,
};

/**
 * Gruvbox Light Theme
 * Warm, retro light theme with creamy backgrounds
 * 
 * Background palette (light to dark):
 * - bg0_hard:   #f9f5d7
 * - bg0_medium: #fbf1c7 (default)
 * - bg0_soft:   #f2e5bc
 * - bg1-bg4:    #ebdbb2 → #a89984
 * 
 * Foreground palette (dark to light):
 * - fg0: #282828 (darkest)
 * - fg1: #3c3836 (default)
 * - fg2-fg4: progressively lighter
 * 
 * Accent colors (dark variants for light bg):
 * - Red:    #9d0006
 * - Green:  #79740e
 * - Yellow: #b57614
 * - Blue:   #076678
 * - Purple: #8f3f71
 * - Aqua:   #427b58
 * - Orange: #af3a03
 */
export const gruvboxLight = {
    name: "gruvbox-light",
    // Core colors - Gruvbox light (medium contrast)
    "--background": "#fbf1c7",
    "--foreground": "#3c3836",
    "--card": "#ebdbb2",
    "--card-foreground": "#3c3836",
    "--popover": "#f9f5d7",
    "--popover-foreground": "#3c3836",
    
    // Primary - Gruvbox orange (dark variant)
    "--primary": "#af3a03",
    "--primary-foreground": "#fbf1c7",
    
    // Secondary - bg1
    "--secondary": "#ebdbb2",
    "--secondary-foreground": "#3c3836",
    
    // Muted - grey tones
    "--muted": "#d5c4a1",
    "--muted-foreground": "#928374",
    
    // Accent - Gruvbox aqua (dark variant)
    "--accent": "#427b58",
    "--accent-foreground": "#fbf1c7",
    
    // Destructive - Gruvbox red (dark variant)
    "--destructive": "#9d0006",
    "--destructive-foreground": "#fbf1c7",
    
    // Borders and inputs
    "--border": "#d5c4a1",
    "--input": "#ebdbb2",
    "--ring": "#af3a03",
    
    // Charts - Gruvbox dark accent palette (for light theme)
    "--chart-1": "#076678", // Blue
    "--chart-2": "#79740e", // Green
    "--chart-3": "#b57614", // Yellow
    "--chart-4": "#8f3f71", // Purple
    "--chart-5": "#af3a03", // Orange
    
    // Sidebar
    "--sidebar": "#f9f5d7",
    "--sidebar-foreground": "#7c6f64",
    "--sidebar-primary": "#af3a03",
    "--sidebar-primary-foreground": "#fbf1c7",
    "--sidebar-accent": "#ebdbb2",
    "--sidebar-accent-foreground": "#3c3836",
    "--sidebar-border": "#d5c4a1",
    "--sidebar-ring": "#af3a03",
    
    // ProseMirror editor variables
    "--pm-header-mark-color": "#b57614",
    "--pm-link-color": "#076678",
    "--pm-muted-color": "#928374",
    "--pm-code-background-color": "#ebdbb2",
    "--pm-code-btn-background-color": "#d5c4a1",
    "--pm-code-btn-hover-background-color": "#bdae93",
    "--pm-blockquote-vertical-line-background-color": "#d5c4a1",
    "--pm-cursor-color": "#3c3836",
    
    ...commonVars,
};
