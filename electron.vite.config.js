import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import withMT from '@material-tailwind/react/utils/withMT';

export default defineConfig(
    withMT({
        publicDir: false,
        main: {},
        preload: {},
        renderer: {
            plugins: [react()],
        },
    }),
);
