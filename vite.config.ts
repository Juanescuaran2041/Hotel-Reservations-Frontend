import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In development the backend runs on :8080; the proxy keeps requests same-origin like in production.
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
