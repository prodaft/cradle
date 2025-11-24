import type { Config } from 'tailwindcss';

const EXTENDED_COLORS = {
    cradle1: '#151515',
    cradle2: '#FF8C00',
    cradle3: '#151515',
};

// Minimal Design System Colors - separate from rippleui
const CRADLE_GRAY_COLORS = {
    'cradle-gray': {
        50: '#FAFAFA',
        100: '#F5F5F5',
        200: '#EFEFEF',
        300: '#D4D4D4',
        400: '#A0A0A0',
        500: '#808080',
        600: '#6A6A6A',
        700: '#5A5A5A',
        800: '#3A3A3A',
        900: '#1A1A1A',
    },
};

// CRADLE Design System Colors - CSS Custom Properties
// These reference the CSS variables defined in cradle-design-system.css
const CRADLE_DESIGN_SYSTEM_COLORS = {
    // Backgrounds
    'cradle-bg': {
        primary: 'var(--cradle-bg-primary)',
        secondary: 'var(--cradle-bg-secondary)',
        tertiary: 'var(--cradle-bg-tertiary)',
        elevated: 'var(--cradle-bg-elevated)',
        sidebar: 'var(--cradle-bg-sidebar)',
        topbar: 'var(--cradle-bg-topbar)',
    },
    // Sidebar
    'cradle-sidebar': {
        text: 'var(--cradle-sidebar-text)',
        icon: 'var(--cradle-sidebar-icon)',
        hoverBg: 'var(--cradle-sidebar-hover-bg)',
    },
    // Borders
    'cradle-border': {
        primary: 'var(--cradle-border-primary)',
        accent: 'var(--cradle-border-accent)',
        interactive: 'var(--cradle-border-interactive)',
    },
    // Text
    'cradle-text': {
        primary: 'var(--cradle-text-primary)',
        secondary: 'var(--cradle-text-secondary)',
        tertiary: 'var(--cradle-text-tertiary)',
        muted: 'var(--cradle-text-muted)',
    },
    // Accents
    'cradle-accent': {
        primary: 'var(--cradle-accent-primary)',
        secondary: 'var(--cradle-accent-secondary)',
        info: 'var(--cradle-accent-info)',
        success: 'var(--cradle-accent-success)',
        warning: 'var(--cradle-accent-warning)',
        error: 'var(--cradle-accent-error)',
    },
    // Glows
    'cradle-glow': {
        primary: 'var(--cradle-glow-primary)',
        accent: 'var(--cradle-glow-accent)',
    },
};

const config: Config = {
    darkMode: ['selector', '[data-theme="dark"]'],
    content: [
        './src/**/*.{html,js,jsx,ts,tsx}',
        './src/index.html',
        './src/renderer/src/styles/cradle-design-system.css',
        './node_modules/react-tailwindcss-datepicker/dist/index.esm.js',
    ],
    plugins: [
        require('@tailwindcss/typography'),
        require('tailwind-scrollbar'),
        require('@tailwindcss/forms')({
            strategy: 'class',
        }),
        require('rippleui'),
        function ({ addUtilities, addBase }) {
            addUtilities({
                '.no-scrollbar': {
                    '-ms-overflow-style': 'none' /* IE and Edge */,
                    'scrollbar-width': 'none' /* Firefox */,
                },
                '.no-scrollbar::-webkit-scrollbar': {
                    display: 'none' /* Hide scrollbar for WebKit-based browsers */,
                },
            });
        },
    ],
    theme: {
        extend: {
            colors: {
                ...EXTENDED_COLORS,
                ...CRADLE_GRAY_COLORS,
                ...CRADLE_DESIGN_SYSTEM_COLORS,
            },
            typography: (theme) => ({
                DEFAULT: {
                    css: {
                        lineHeight: '24px',
                        li: {
                            marginTop: '4px',
                        },
                        h1: {
                            marginTop: '16px',
                            marginBottom: '16px',
                            borderBottomWidth: '1px',
                            borderBottomColor: 'rgba(61, 68, 77, 0.7)',
                            borderBottomStyle: 'solid',
                            paddingBottom: '8px',
                        },
                        h2: {
                            marginTop: '16px',
                            marginBottom: '16px',
                            borderBottomWidth: '1px',
                            borderBottomColor: 'rgba(61, 68, 77, 0.7)',
                            borderBottomStyle: 'solid',
                            paddingBottom: '8px',
                        },
                        h3: {
                            marginTop: '16px',
                            marginBottom: '16px',
                            borderBottomWidth: '1px',
                            borderBottomColor: 'rgba(61, 68, 77, 0.7)',
                            borderBottomStyle: 'solid',
                            paddingBottom: '8px',
                        },
                        br: {
                            marginTop: '8px',
                            marginBottom: '8px',
                        },
                        hr: {
                            borderTopWidth: '3px',
                        },
                        pre: {
                            padding: theme('padding.4'),
                            overflow: 'auto !important',
                            maxWidth: '100% !important',
                        },
                        code: {
                            whiteSpace: 'pre-wrap !important',
                            wordBreak: 'break-word !important',
                        },
                    },
                },
            }),
        },
    },
    rippleui: {
        themes: [
            {
                themeName: 'light',
                colorScheme: 'light',
                colors: {
                    primary: '#253746',
                    backgroundPrimary: '#e8e8e8',
                    secondary: '#9984D4',
                    backgroundSecondary: '#555161',
                    white: '#ffffff',
                    ...EXTENDED_COLORS,
                },
            },
            {
                themeName: 'dark',
                colorScheme: 'dark',
                colors: {
                    primary: '#f68d2e',
                    backgroundPrimary: '#151515',
                    secondary: '#7659C5',
                    backgroundSecondary: '#555161',
                    white: '#ffffff',
                    ...EXTENDED_COLORS,
                },
            },
        ],
    },
} as const;

export default config;
