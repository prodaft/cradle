import react from '@vitejs/plugin-react';
import dns from 'dns';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

dns.setDefaultResultOrder('verbatim');

export default defineConfig(({ mode }) => ({
    build: {
        sourcemap: mode === 'staging',
        // sourcemap: mode === 'staging' ? 'hidden' : false,
    },
    plugins: [react(), visualizer(), nodePolyfills()],
}));
