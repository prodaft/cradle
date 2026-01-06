import type { Config } from 'tailwindcss';

/**
 * Tailwind CSS v4 Configuration
 *
 * Note: In Tailwind v4, most configuration is done in CSS using @theme directive.
 * Theme colors and design tokens are defined in main.css.
 * This file is kept for compatibility with tools that expect a config file.
 */
const config: Config = {
    // Content scanning is automatic in v4
    content: ['./src/**/*.{html,js,jsx,ts,tsx}', './src/index.html'],
    // Dark mode using data-theme attribute
    darkMode: ['selector', '[data-theme="dark"]'],
};

export default config;
