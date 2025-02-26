// eslint-disable-next-line no-undef
module.exports = {
    darkMode: ['selector', '[data-theme="dark"]'],
    content: ['./src/**/*.{html,js,jsx,ts,tsx}', './src/index.html'],
    theme: {
        extend: {
            colors: {
                cradle1: '#02111a',
                cradle2: '#f68d2e',
                cradle3: '#253746',
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
                    primary: '#f68d2e',
                    backgroundPrimary: '#e8e8e8',
                    secondary: '#ffffff',
                    backgroundSecondary: '#555161',
                },
            },
            {
                themeName: 'dark',
                colorScheme: 'dark',
                colors: {
                    primary: '#f68d2e',
                    backgroundPrimary: '#151515',
                    secondary: '#ffffff',
                    backgroundSecondary: '#555161',
                },
            },
        ],
    },
};
