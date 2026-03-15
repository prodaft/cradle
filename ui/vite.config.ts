import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import dns from 'dns';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';

dns.setDefaultResultOrder('verbatim');

export default defineConfig(({ mode }) => {
    const isDev = mode === 'development';

    return {
        base: '/',
        cacheDir: '.vite-cache',
        plugins: [
            tanstackStart({
                spa: { enabled: true },
                client: { entry: 'entry-client.tsx' },
                prerender: { failOnError: false },
            }),
            tailwindcss(),
            react(),
            visualizer(),
        ],
        build: {
            sourcemap: isDev,
        },
        server: { port: 5173 },
        optimizeDeps: {
            include: ['@radix-ui/react-slider'],
        },
        resolve: {
            tsconfigPaths: true,
            alias: {
                '@': path.resolve(__dirname, './src'),
                '@components': path.resolve(__dirname, './src/components'),
                '@contexts': path.resolve(__dirname, './src/contexts'),
                '@hooks': path.resolve(__dirname, './src/hooks'),
                '@services': path.resolve(__dirname, './src/services'),
                '@utils': path.resolve(__dirname, './src/utils'),
                '@types': path.resolve(__dirname, './src/types'),
                '@styles': path.resolve(__dirname, './styles'),
                src: path.resolve(__dirname, './src'),
            },
            dedupe: [
                '@codemirror/state',
                '@codemirror/view',
                '@codemirror/language',
                '@codemirror/commands',
                '@codemirror/autocomplete',
                '@codemirror/search',
                '@codemirror/lint',
                '@codemirror/lang-markdown',
                '@codemirror/lang-yaml',
                '@codemirror/language-data',
                '@lezer/common',
                '@lezer/highlight',
                '@lezer/lr',
                '@lezer/markdown',
            ],
        },
    };
});
