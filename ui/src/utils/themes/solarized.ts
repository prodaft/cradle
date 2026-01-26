/**
 * Solarized Theme Port
 * Ported from the Solarized color scheme by Ethan Schoonover
 * https://ethanschoonover.com/solarized/
 *
 * A carefully designed color palette with precise Lab color values
 */

const commonVars = {
    '--font-sans':
        "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'",
    '--font-serif': "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif",
    '--font-mono':
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
    '--radius': '0.5rem',
    '--shadow-x': '0',
    '--shadow-y': '1px',
    '--shadow-blur': '3px',
    '--shadow-spread': '0px',
    '--shadow-opacity': '0.08',
    '--shadow-color': 'oklch(0 0 0)',
    '--shadow-2xs': '0 1px 2px 0px hsl(0 0% 0% / 0.04)',
    '--shadow-xs': '0 1px 2px 0px hsl(0 0% 0% / 0.04)',
    '--shadow-sm':
        '0 1px 3px 0px hsl(0 0% 0% / 0.08), 0 1px 2px -1px hsl(0 0% 0% / 0.08)',
    '--shadow': '0 1px 3px 0px hsl(0 0% 0% / 0.08), 0 1px 2px -1px hsl(0 0% 0% / 0.08)',
    '--shadow-md':
        '0 2px 4px 0px hsl(0 0% 0% / 0.08), 0 2px 4px -1px hsl(0 0% 0% / 0.08)',
    '--shadow-lg':
        '0 4px 6px 0px hsl(0 0% 0% / 0.08), 0 4px 6px -1px hsl(0 0% 0% / 0.08)',
    '--shadow-xl':
        '0 8px 10px 0px hsl(0 0% 0% / 0.08), 0 8px 10px -1px hsl(0 0% 0% / 0.08)',
    '--shadow-2xl': '0 12px 16px 0px hsl(0 0% 0% / 0.15)',
};

/**
 * Solarized Light Theme
 * Signature colors from the official Solarized palette:
 * - Base03:  #002B36 (darkest)
 * - Base02:  #073642
 * - Base01:  #586E75 (emphasized content)
 * - Base00:  #657B83 (body text)
 * - Base0:   #839496
 * - Base1:   #93A1A1 (comments)
 * - Base2:   #EEE8D5 (background highlights)
 * - Base3:   #FDF6E3 (background)
 *
 * Accent colors:
 * - Yellow:  #B58900
 * - Orange:  #CB4B16
 * - Red:     #DC322F
 * - Magenta: #D33682
 * - Violet:  #6C71C4
 * - Blue:    #268BD2
 * - Cyan:    #2AA198
 * - Green:   #859900
 */
export const solarizedLight = {
    name: 'solarized-light',
    // Core colors - Solarized light background
    '--background': '#fdf6e3',
    '--foreground': '#657b83',
    '--card': '#eee8d5',
    '--card-foreground': '#657b83',
    '--popover': '#eee8d5',
    '--popover-foreground': '#657b83',

    // Primary - Solarized yellow (signature accent)
    '--primary': '#b58900',
    '--primary-foreground': '#fdf6e3',

    // Secondary - background highlights
    '--secondary': '#eee8d5',
    '--secondary-foreground': '#586e75',

    // Muted - lighter elements
    '--muted': '#ddd6c1',
    '--muted-foreground': '#93a1a1',

    // Accent - Solarized blue
    '--accent': '#268bd2',
    '--accent-foreground': '#fdf6e3',

    // Destructive - Solarized red
    '--destructive': '#dc322f',
    '--destructive-foreground': '#fdf6e3',

    // Borders and inputs
    '--border': '#d3af86',
    '--input': '#ddd6c1',
    '--ring': '#b58900',

    // Charts - Solarized accent palette
    '--chart-1': '#268bd2', // Blue
    '--chart-2': '#2aa198', // Cyan
    '--chart-3': '#859900', // Green
    '--chart-4': '#b58900', // Yellow
    '--chart-5': '#d33682', // Magenta

    // Sidebar
    '--sidebar': '#eee8d5',
    '--sidebar-foreground': '#586e75',
    '--sidebar-primary': '#b58900',
    '--sidebar-primary-foreground': '#fdf6e3',
    '--sidebar-accent': '#ddd6c1',
    '--sidebar-accent-foreground': '#586e75',
    '--sidebar-border': '#ddd6c1',
    '--sidebar-ring': '#b58900',

    // ProseMirror editor variables
    '--pm-header-mark-color': '#268bd2',
    '--pm-link-color': '#2aa198',
    '--pm-muted-color': '#93a1a1',
    '--pm-code-background-color': '#eee8d5',
    '--pm-code-btn-background-color': '#ddd6c1',
    '--pm-code-btn-hover-background-color': '#d3cbb8',
    '--pm-blockquote-vertical-line-background-color': '#d3af86',
    '--pm-cursor-color': '#657b83',

    ...commonVars,
};

/**
 * Solarized Dark Theme
 * Dark variant of the Solarized palette:
 * - Base03: #002B36 (background)
 * - Base02: #073642 (background highlights)
 * - Base01: #586E75 (comments, secondary content)
 * - Base0:  #839496 (body text)
 * - Base1:  #93A1A1 (optional emphasized content)
 *
 * Same accent colors as light variant
 */
export const solarizedDark = {
    name: 'solarized-dark',
    // Core colors - Solarized dark background
    '--background': '#002b36',
    '--foreground': '#839496',
    '--card': '#073642',
    '--card-foreground': '#839496',
    '--popover': '#00212b',
    '--popover-foreground': '#839496',

    // Primary - Solarized cyan (works better on dark)
    '--primary': '#2aa198',
    '--primary-foreground': '#002b36',

    // Secondary - background highlights
    '--secondary': '#073642',
    '--secondary-foreground': '#93a1a1',

    // Muted - darker elements
    '--muted': '#003847',
    '--muted-foreground': '#586e75',

    // Accent - Solarized blue
    '--accent': '#268bd2',
    '--accent-foreground': '#002b36',

    // Destructive - Solarized red
    '--destructive': '#dc322f',
    '--destructive-foreground': '#fdf6e3',

    // Borders and inputs
    '--border': '#073642',
    '--input': '#003847',
    '--ring': '#2aa198',

    // Charts - Solarized accent palette
    '--chart-1': '#268bd2', // Blue
    '--chart-2': '#2aa198', // Cyan
    '--chart-3': '#859900', // Green
    '--chart-4': '#b58900', // Yellow
    '--chart-5': '#d33682', // Magenta

    // Sidebar
    '--sidebar': '#00212b',
    '--sidebar-foreground': '#93a1a1',
    '--sidebar-primary': '#2aa198',
    '--sidebar-primary-foreground': '#002b36',
    '--sidebar-accent': '#073642',
    '--sidebar-accent-foreground': '#93a1a1',
    '--sidebar-border': '#003847',
    '--sidebar-ring': '#2aa198',

    // ProseMirror editor variables
    '--pm-header-mark-color': '#268bd2',
    '--pm-link-color': '#2aa198',
    '--pm-muted-color': '#586e75',
    '--pm-code-background-color': '#073642',
    '--pm-code-btn-background-color': '#003847',
    '--pm-code-btn-hover-background-color': '#004454',
    '--pm-blockquote-vertical-line-background-color': '#073642',
    '--pm-cursor-color': '#d30102',

    ...commonVars,
};
