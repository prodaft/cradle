// eslint-disable-next-line no-undef
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

module.exports = {
    darkMode: ['selector', '[data-theme="dark"]'],
    content: [
        './src/**/*.{html,js,jsx,ts,tsx}',
        './src/index.html',
        './node_modules/react-tailwindcss-datepicker/dist/index.esm.js',
    ],
    safelist: [
        // Preserve all cradle-* classes from being purged
        {
            pattern: /^cradle-.*/,
        },
    ],
    plugins: [],
    theme: {
        extend: {
            colors: {
                ...EXTENDED_COLORS,
                ...CRADLE_GRAY_COLORS,
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
};
