import { sentryTanstackStart } from '@sentry/tanstackstart-react/vite';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import dns from 'dns';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv } from 'vite';

dns.setDefaultResultOrder('verbatim');

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const sentryAuthToken = env.SENTRY_AUTH_TOKEN || process.env.SENTRY_AUTH_TOKEN;
    const sentryOrg = env.SENTRY_ORG || process.env.SENTRY_ORG;
    const sentryProject = env.SENTRY_PROJECT || process.env.SENTRY_PROJECT;

    return {
        base: '/',
        cacheDir: '.vite-cache',
        plugins: [
            tanstackStart({
                spa: { enabled: true },
                client: { entry: 'entry-client.tsx' },
                server: { entry: 'server.ts' },
                start: { entry: 'start.ts' },
                prerender: { failOnError: false },
            }),
            tailwindcss(),
            react(),
            visualizer(),
            ...(sentryAuthToken && sentryOrg && sentryProject
                ? [
                      sentryTanstackStart({
                          org: sentryOrg,
                          project: sentryProject,
                          authToken: sentryAuthToken,
                      }),
                  ]
                : []),
        ],
        build: {
            sourcemap: true,
        },
        server: { port: 5173 },
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
                '@codemirror/collab',
                '@codemirror/language-data',
                '@lezer/common',
                '@lezer/highlight',
                '@lezer/lr',
                '@lezer/markdown',
            ],
        },
    };
});
