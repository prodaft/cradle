// eslint-disable-next-line no-undef
module.exports = {
    content: [
        "./src/**/*.{html,js,jsx,ts,tsx}",
        "./src/index.html"
    ],
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
        require('@tailwindcss/forms'),
        require("rippleui"),
        function ({ addUtilities, addBase }) {
            addUtilities({
                '.no-scrollbar': {
                    '-ms-overflow-style': 'none',  /* IE and Edge */
                    'scrollbar-width': 'none',  /* Firefox */
                },
                '.no-scrollbar::-webkit-scrollbar': {
                    display: 'none',  /* Hide scrollbar for WebKit-based browsers */
                },
            });
            },
    ],
    rippleui: {
      themes: [
        {
          themeName: "light",
          colorScheme: "light",
          colors: {
            primary: "#f68d2e",
            backgroundPrimary: "#f1f2f4",
          },
        },
        {
          themeName: "dark",
          colorScheme: "dark",
          colors: {
            primary: "#f68d2e",
            backgroundPrimary: "#1a1a1a",
          },
        },
        {
          themeName: "cradle",
          colorScheme: "dark" | "light",
          colors: {
            primary: "#f68d2e",
            backgroundPrimary: "#02111a",
            backgroundSecondary: "#253746",
          },
        },
      ],
    },
}