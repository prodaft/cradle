import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dns from 'dns';
import { visualizer } from "rollup-plugin-visualizer";

dns.setDefaultResultOrder('verbatim');

export default defineConfig(({ mode }) => ({
    plugins: [react(), visualizer()],
}));
