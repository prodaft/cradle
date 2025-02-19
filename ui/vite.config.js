import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dns from 'dns';

dns.setDefaultResultOrder('verbatim');

export default defineConfig(({ mode }) => ({
    plugins: [react()],
}));
