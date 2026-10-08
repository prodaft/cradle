import { sentryTanstackStart } from '@sentry/tanstackstart-react/vite';
import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import dns from 'dns';
import { readFileSync } from 'fs';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv } from 'vite';

dns.setDefaultResultOrder('verbatim');

function git(args: string): string {
    try {
        return execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {
        return '';
    }
}

const appVersion: string = JSON.parse(readFileSync(path.resolve(import.meta.dirname, 'package.json'), 'utf-8')).version;
const gitBranch = (process.env.GIT_BRANCH ?? git('rev-parse --abbrev-ref HEAD')).replace(/^HEAD$/, '');
const gitCommit = (process.env.GIT_COMMIT || git('rev-parse HEAD')).slice(0, 8);
const gitRef = gitCommit && (gitBranch ? `${gitBranch}@${gitCommit}` : gitCommit);
const appVersionLabel = `v${appVersion}${gitRef ? ` · ${gitRef}` : ''}`;

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
        define: {
            __APP_VERSION_LABEL__: JSON.stringify(appVersionLabel),
        },
        server: { port: 5173 },
        resolve: {
            tsconfigPaths: true,
            alias: {
                '@': path.resolve(import.meta.dirname, './src'),
                '@components': path.resolve(import.meta.dirname, './src/components'),
                '@contexts': path.resolve(import.meta.dirname, './src/contexts'),
                '@hooks': path.resolve(import.meta.dirname, './src/hooks'),
                '@services': path.resolve(import.meta.dirname, './src/services'),
                '@utils': path.resolve(import.meta.dirname, './src/utils'),
                '@styles': path.resolve(import.meta.dirname, './styles'),
                src: path.resolve(import.meta.dirname, './src'),
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
