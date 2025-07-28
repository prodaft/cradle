import react from '@vitejs/plugin-react';
import dns from 'dns';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

dns.setDefaultResultOrder('verbatim');

export default defineConfig(({ mode }) => ({
    plugins: [react(), visualizer(), nodePolyfills()],
}));
