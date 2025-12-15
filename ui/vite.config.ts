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
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src/renderer/src'),
            '@components': path.resolve(__dirname, './src/renderer/src/components'),
            '@contexts': path.resolve(__dirname, './src/renderer/src/contexts'),
            '@hooks': path.resolve(__dirname, './src/renderer/src/hooks'),
            '@services': path.resolve(__dirname, './src/renderer/src/services'),
            '@utils': path.resolve(__dirname, './src/renderer/src/utils'),
            '@types': path.resolve(__dirname, './src/renderer/src/types'),
        },
    },
}));
