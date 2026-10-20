import { darkTheme } from './dark';
import { lightTheme } from './light';

/**
 * Cradle Themes
 * Restoring the "Old Design System" colors from docs/assets/css/custom.css
 */

export const cradleLight = {
    ...lightTheme,
    name: 'cradle-light',

    // Backgrounds from docs/assets/css/custom.css
    '--background': '#ffffff', // --cradle-bg-primary
    '--foreground': '#000000', // --cradle-text-primary

    '--card': '#ffffff', // --cradle-bg-elevated
    '--card-foreground': '#2b2b2b', // --cradle-text-secondary

    '--popover': '#ffffff',
    '--popover-foreground': '#2b2b2b',

    // Signature Accent from docs: #c7772a
    '--primary': '#c7772a',
    '--primary-foreground': '#ffffff',

    '--secondary': '#f5f5f5', // --cradle-bg-secondary
    '--secondary-foreground': '#2b2b2b',

    '--muted': '#eeeeee', // --cradle-bg-tertiary
    '--muted-foreground': '#666666', // --cradle-text-tertiary

    '--accent': '#f5f5f5',
    '--accent-foreground': '#000000',

    '--destructive': '#b85d30', // --cradle-accent-error
    '--destructive-foreground': '#ffffff',

    '--border': '#e0e0e0', // --cradle-border-primary
    '--input': '#e0e0e0',
    '--ring': '#c7772a',

    // Sidebar
    '--sidebar': '#ffffff',
    '--sidebar-foreground': '#666666', // --cradle-text-tertiary
    '--sidebar-primary': '#c7772a',
    '--sidebar-primary-foreground': '#ffffff',
    '--sidebar-accent': '#f5f5f5', // --cradle-bg-secondary
    '--sidebar-accent-foreground': '#000000',
    '--sidebar-border': '#e0e0e0',

    // ProseMark variables from custom.css for the editor
    '--pm-header-mark-color': '#c7772a',
    '--pm-link-color': '#c7772a',
    '--pm-muted-color': '#666666',
    '--pm-code-background-color': '#eeeeee',
    '--pm-code-btn-background-color': '#f5f5f5',
    '--pm-code-btn-hover-background-color': '#e0e0e0',
    '--pm-blockquote-vertical-line-background-color': '#e0e0e0',
    '--pm-cursor-color': '#000000',
};

export const cradleDark = {
    ...darkTheme,
    name: 'cradle-dark',

    // Backgrounds from docs/assets/css/custom.css (Dark)
    '--background': '#1a1a1a', // --cradle-bg-primary
    '--foreground': '#ffffff', // --cradle-text-primary

    '--card': '#1f1f1f', // --cradle-bg-elevated
    '--card-foreground': '#bfbfbf', // --cradle-text-secondary

    '--popover': '#1f1f1f',
    '--popover-foreground': '#bfbfbf',

    // Signature Accent from docs: #c7772a
    '--primary': '#c7772a',
    '--primary-foreground': '#ffffff',

    '--secondary': '#2a2a2a', // --cradle-bg-secondary
    '--secondary-foreground': '#bfbfbf',

    '--muted': '#2a2a2a', // --cradle-bg-secondary (custom.css uses same for both usually in dark)
    '--muted-foreground': '#999999', // --cradle-text-tertiary

    '--accent': '#2a2a2a',
    '--accent-foreground': '#ffffff',

    '--destructive': '#b85d30', // --cradle-accent-error
    '--destructive-foreground': '#ffffff',

    '--border': '#2a2a2a', // --cradle-border-primary
    '--input': '#2a2a2a',
    '--ring': '#c7772a',

    // Sidebar
    '--sidebar': '#1a1a1a',
    '--sidebar-foreground': '#999999', // --cradle-text-tertiary
    '--sidebar-primary': '#c7772a',
    '--sidebar-primary-foreground': '#ffffff',
    '--sidebar-accent': '#2a2a2a', // --cradle-bg-secondary
    '--sidebar-accent-foreground': '#ffffff',
    '--sidebar-border': '#2a2a2a',

    // ProseMark variables from custom.css for the editor (Dark)
    '--pm-header-mark-color': '#c7772a',
    '--pm-link-color': '#c7772a',
    '--pm-muted-color': '#999999',
    '--pm-code-background-color': '#1a1a1a', // --cradle-bg-tertiary
    '--pm-code-btn-background-color': '#2a2a2a', // --cradle-bg-secondary
    '--pm-code-btn-hover-background-color': '#404040',
    '--pm-blockquote-vertical-line-background-color': '#2a2a2a',
    '--pm-cursor-color': '#ffffff',
};
