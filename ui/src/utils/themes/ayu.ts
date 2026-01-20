/**
 * Ayu Theme Ports
 * Ported from the popular Ayu color schemes
 * Modern, clean aesthetics with golden accent
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
 * Ayu Dark Theme
 * Deepest variant with rich contrast
 */
export const ayuDark = {
    name: "ayu-dark",
    // Core colors - Deep blue-black backgrounds
    "--background": "#10141c",
    "--foreground": "#bfbdb6",
    "--card": "#0d1017",
    "--card-foreground": "#bfbdb6",
    "--popover": "#141821",
    "--popover-foreground": "#bfbdb6",
    
    // Primary - Ayu signature golden yellow
    "--primary": "#e6b450",
    "--primary-foreground": "#10141c",
    
    // Secondary - subtle dark blue
    "--secondary": "#1b1f29",
    "--secondary-foreground": "#bfbdb6",
    
    // Muted - muted gray-blue
    "--muted": "#161a24",
    "--muted-foreground": "#5a6378",
    
    // Accent - selection blue
    "--accent": "#47526640",
    "--accent-foreground": "#bfbdb6",
    
    // Destructive - Ayu red
    "--destructive": "#d95757",
    "--destructive-foreground": "#ffffff",
    
    // Borders and inputs
    "--border": "#1b1f29",
    "--input": "#1b1f29",
    "--ring": "#e6b450",
    
    // Charts - Ayu dark token colors
    "--chart-1": "#ffb454", // Orange (functions)
    "--chart-2": "#aad94c", // Green (strings)
    "--chart-3": "#59c2ff", // Blue (entities)
    "--chart-4": "#d2a6ff", // Purple (numbers)
    "--chart-5": "#f07178", // Red (errors/markup)
    
    // Sidebar
    "--sidebar": "#0d1017",
    "--sidebar-foreground": "#5a6378",
    "--sidebar-primary": "#e6b450",
    "--sidebar-primary-foreground": "#10141c",
    "--sidebar-accent": "#1b1f29",
    "--sidebar-accent-foreground": "#bfbdb6",
    "--sidebar-border": "#1b1f29",
    "--sidebar-ring": "#e6b450",
    
    // ProseMirror editor variables
    "--pm-header-mark-color": "#e6b450",
    "--pm-link-color": "#39bae6",
    "--pm-muted-color": "#5a6378",
    "--pm-code-background-color": "#141821",
    "--pm-code-btn-background-color": "#1b1f29",
    "--pm-code-btn-hover-background-color": "#252a35",
    "--pm-blockquote-vertical-line-background-color": "#1b1f29",
    "--pm-cursor-color": "#e6b450",
    
    ...commonVars,
};

/**
 * Ayu Light Theme
 * Clean, bright variant for daylight coding
 */
export const ayuLight = {
    name: "ayu-light",
    // Core colors - Warm white backgrounds
    "--background": "#fafafa",
    "--foreground": "#5c6166",
    "--card": "#ffffff",
    "--card-foreground": "#5c6166",
    "--popover": "#ffffff",
    "--popover-foreground": "#5c6166",
    
    // Primary - Ayu signature orange
    "--primary": "#ff9940",
    "--primary-foreground": "#ffffff",
    
    // Secondary - subtle warm gray
    "--secondary": "#f0f0f0",
    "--secondary-foreground": "#5c6166",
    
    // Muted - light gray
    "--muted": "#f3f3f3",
    "--muted-foreground": "#8a9199",
    
    // Accent - soft blue highlight
    "--accent": "#e7f1ff",
    "--accent-foreground": "#5c6166",
    
    // Destructive - Ayu red
    "--destructive": "#e65050",
    "--destructive-foreground": "#ffffff",
    
    // Borders and inputs
    "--border": "#e8e9eb",
    "--input": "#f0f0f0",
    "--ring": "#ff9940",
    
    // Charts - Ayu light token colors
    "--chart-1": "#f29718", // Orange (functions)
    "--chart-2": "#86b300", // Green (strings)
    "--chart-3": "#55b4d4", // Blue (entities)
    "--chart-4": "#a37acc", // Purple (numbers)
    "--chart-5": "#f07171", // Red (errors/markup)
    
    // Sidebar
    "--sidebar": "#f8f8f8",
    "--sidebar-foreground": "#8a9199",
    "--sidebar-primary": "#ff9940",
    "--sidebar-primary-foreground": "#ffffff",
    "--sidebar-accent": "#f0f0f0",
    "--sidebar-accent-foreground": "#5c6166",
    "--sidebar-border": "#e8e9eb",
    "--sidebar-ring": "#ff9940",
    
    // ProseMirror editor variables
    "--pm-header-mark-color": "#ff9940",
    "--pm-link-color": "#399ee6",
    "--pm-muted-color": "#8a9199",
    "--pm-code-background-color": "#f0f0f0",
    "--pm-code-btn-background-color": "#e8e9eb",
    "--pm-code-btn-hover-background-color": "#dcdee0",
    "--pm-blockquote-vertical-line-background-color": "#e8e9eb",
    "--pm-cursor-color": "#5c6166",
    
    ...commonVars,
};

/**
 * Ayu Mirage Theme
 * Middle ground between dark and light - soft purple-blue
 */
export const ayuMirage = {
    name: "ayu-mirage",
    // Core colors - Soft blue-gray backgrounds
    "--background": "#242936",
    "--foreground": "#cccac2",
    "--card": "#1f2430",
    "--card-foreground": "#cccac2",
    "--popover": "#282e3b",
    "--popover-foreground": "#cccac2",
    
    // Primary - Ayu signature golden yellow
    "--primary": "#ffcc66",
    "--primary-foreground": "#1f2430",
    
    // Secondary - subtle blue-gray
    "--secondary": "#282e3b",
    "--secondary-foreground": "#cccac2",
    
    // Muted - darker blue-gray
    "--muted": "#1a1f29",
    "--muted-foreground": "#707a8c",
    
    // Accent - selection highlight
    "--accent": "#63759926",
    "--accent-foreground": "#cccac2",
    
    // Destructive - Ayu red
    "--destructive": "#ff6666",
    "--destructive-foreground": "#ffffff",
    
    // Borders and inputs
    "--border": "#171b24",
    "--input": "#282e3b",
    "--ring": "#ffcc66",
    
    // Charts - Ayu mirage token colors
    "--chart-1": "#ffcd66", // Yellow (functions)
    "--chart-2": "#d5ff80", // Green (strings)
    "--chart-3": "#73d0ff", // Blue (entities)
    "--chart-4": "#dfbfff", // Purple (numbers)
    "--chart-5": "#f28779", // Coral (errors/markup)
    
    // Sidebar
    "--sidebar": "#1f2430",
    "--sidebar-foreground": "#707a8c",
    "--sidebar-primary": "#ffcc66",
    "--sidebar-primary-foreground": "#1f2430",
    "--sidebar-accent": "#282e3b",
    "--sidebar-accent-foreground": "#cccac2",
    "--sidebar-border": "#171b24",
    "--sidebar-ring": "#ffcc66",
    
    // ProseMirror editor variables
    "--pm-header-mark-color": "#ffcc66",
    "--pm-link-color": "#5ccfe6",
    "--pm-muted-color": "#707a8c",
    "--pm-code-background-color": "#282e3b",
    "--pm-code-btn-background-color": "#323a4b",
    "--pm-code-btn-hover-background-color": "#3d465a",
    "--pm-blockquote-vertical-line-background-color": "#282e3b",
    "--pm-cursor-color": "#ffcc66",
    
    ...commonVars,
};
