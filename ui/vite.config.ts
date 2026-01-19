import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import dns from 'dns';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

dns.setDefaultResultOrder('verbatim');

export default defineConfig(({ mode }) => ({
    base: './',
    plugins: [tailwindcss(), react(), visualizer(), nodePolyfills()],
    server: { port: 5173 },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@components': path.resolve(__dirname, './src/components'),
            '@contexts': path.resolve(__dirname, './src/contexts'),
            '@hooks': path.resolve(__dirname, './src/hooks'),
            '@services': path.resolve(__dirname, './src/services'),
            '@utils': path.resolve(__dirname, './src/utils'),
            '@types': path.resolve(__dirname, './src/types'),
            src: path.resolve(__dirname, './src'),
        },
    },
}));
