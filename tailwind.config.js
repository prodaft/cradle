// eslint-disable-next-line no-undef
module.exports = {
    darkMode: ['selector', '[data-theme="dark"]'],
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
    purge: {
      enabled: process.env.NODE_ENV === 'production',
      content: ['./src/**/*.{html,js,jsx,ts,tsx}', './src/index.html'],
      safelist: ['h5', 'h6'],
    },
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
