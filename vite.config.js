import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true,
      interval: 1000,
      ignored: ['**/supabase/**', '**/dist/**', '**/.git/**']
    },
    proxy: {
      '/api/webhook': {
        target: 'https://aframmm.app.n8n.cloud',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
