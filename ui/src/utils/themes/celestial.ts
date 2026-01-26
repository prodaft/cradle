/**
 * Celestial Theme Port
 * A cosmic dark theme with vibrant pink/rose accent
 * Features deep space-like backgrounds with neon highlights
 */

const commonVars = {
    '--font-sans':
        "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
    '--font-serif': "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
    '--font-mono':
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    '--radius': '0.5rem',
    '--shadow-x': '0',
    '--shadow-y': '2px',
    '--shadow-blur': '4px',
    '--shadow-spread': '0px',
    '--shadow-opacity': '0.2',
    '--shadow-color': 'oklch(0 0 0)',
    '--shadow-2xs': '0 1px 3px 0px hsl(0 0% 0% / 0.1)',
    '--shadow-xs': '0 1px 3px 0px hsl(0 0% 0% / 0.1)',
    '--shadow-sm':
        '0 1px 3px 0px hsl(0 0% 0% / 0.15), 0 1px 2px -1px hsl(0 0% 0% / 0.15)',
    '--shadow': '0 2px 4px 0px hsl(0 0% 0% / 0.15), 0 1px 2px -1px hsl(0 0% 0% / 0.15)',
    '--shadow-md':
        '0 2px 6px 0px hsl(0 0% 0% / 0.2), 0 2px 4px -1px hsl(0 0% 0% / 0.15)',
    '--shadow-lg':
        '0 4px 8px 0px hsl(0 0% 0% / 0.2), 0 4px 6px -1px hsl(0 0% 0% / 0.15)',
    '--shadow-xl':
        '0 8px 16px 0px hsl(0 0% 0% / 0.2), 0 8px 10px -1px hsl(0 0% 0% / 0.15)',
    '--shadow-2xl': '0 12px 24px 0px hsl(0 0% 0% / 0.3)',
};

/**
 * Celestial Theme
 * Deep space aesthetic with vibrant rose/pink accent
 */
export const celestial = {
    name: 'celestial',
    // Core colors - Deep space background
    '--background': '#0b0c0f',
    '--foreground': '#d5d8da',
    '--card': '#0e0f13',
    '--card-foreground': '#d5d8da',
    '--popover': '#1b1c25',
    '--popover-foreground': '#d5d8da',

    // Primary - Signature rose/pink
    '--primary': '#e95378',
    '--primary-foreground': '#0b0c0f',

    // Secondary - muted space gray
    '--secondary': '#2e303e',
    '--secondary-foreground': '#d5d8da',

    // Muted - subtle dark purple-gray
    '--muted': '#22252e',
    '--muted-foreground': '#6c6f93',

    // Accent - highlight purple
    '--accent': '#51576d',
    '--accent-foreground': '#d5d8da',

    // Destructive - bright red
    '--destructive': '#f43e5c',
    '--destructive-foreground': '#ffffff',

    // Borders and inputs
    '--border': '#22252e',
    '--input': '#2e303e',
    '--ring': '#e95378',

    // Charts - Celestial vibrant palette
    '--chart-1': '#e95378', // Rose (primary)
    '--chart-2': '#25b0bc', // Teal (functions)
    '--chart-3': '#fab795', // Peach (strings)
    '--chart-4': '#b877db', // Purple (keywords)
    '--chart-5': '#29d398', // Green (success)

    // Sidebar
    '--sidebar': '#0e0f13',
    '--sidebar-foreground': '#d5d8da',
    '--sidebar-primary': '#e95378',
    '--sidebar-primary-foreground': '#0b0c0f',
    '--sidebar-accent': '#2e303e',
    '--sidebar-accent-foreground': '#d5d8da',
    '--sidebar-border': '#22252e',
    '--sidebar-ring': '#e95378',

    // ProseMirror editor variables
    '--pm-header-mark-color': '#e95378',
    '--pm-link-color': '#fab795',
    '--pm-muted-color': '#6c6f93',
    '--pm-code-background-color': '#1b1c25',
    '--pm-code-btn-background-color': '#2e303e',
    '--pm-code-btn-hover-background-color': '#3e4050',
    '--pm-blockquote-vertical-line-background-color': '#2e303e',
    '--pm-cursor-color': '#e95378',

    ...commonVars,
};
