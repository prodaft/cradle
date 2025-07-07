import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['@babel/plugin-syntax-decorators', { legacy: true }]
        ]
      }
    }),
  ],
  css: {
    postcss: { plugins: [tailwindcss()] },
    preprocessorOptions: {
      less: {
        javascriptEnabled: true,
      },
    },
  },
})
