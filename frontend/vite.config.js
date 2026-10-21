import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Relative asset paths so the built app works from any subfolder
  // (e.g. http://localhost/management/), not just the domain root.
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    // In dev, the PHP backend runs separately:  php -S localhost:8000 -t ../backend
    // All /api/* calls are proxied there so the frontend needs no absolute URLs.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
