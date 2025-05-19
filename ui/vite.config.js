import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dns from 'dns';
import { visualizer } from 'rollup-plugin-visualizer';
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'

dns.setDefaultResultOrder('verbatim');

export default defineConfig(({ mode }) => ({
    plugins: [react(), visualizer()],
    // https://github.com/jonschlinkert/gray-matter/issues/143
    optimizeDeps: {
        esbuildOptions: {
            // Node.js global to browser globalThis
            define: {
                global: 'globalThis'
            },
            // Enable esbuild polyfill plugins
            plugins: [
                NodeGlobalsPolyfillPlugin({
                    buffer: true
                })
            ]
        }
    }
}));
