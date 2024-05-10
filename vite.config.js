import { defineConfig} from "vite";
    import react from "@vitejs/plugin-react";
    import dns from 'dns'

    dns.setDefaultResultOrder('verbatim')

    // https://vitejs.dev/config/
    export default defineConfig({
        plugins: [react()],
        server: {
            proxy: {
                '*': {
                    target: 'http://127.0.0.1:8000',
                    changeOrigin: true,
                },
            },
        },
    }); 

