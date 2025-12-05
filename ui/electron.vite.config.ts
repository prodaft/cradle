import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';
import path from 'path';

export default defineConfig({
    main: {},
    preload: {},
    renderer: {
        plugins: [tailwindcss(), react()],
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
    },
});
