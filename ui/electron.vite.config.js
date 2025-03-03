import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    main: {},
    preload: {},
    renderer: {
        plugins: [react()],
    },
});
