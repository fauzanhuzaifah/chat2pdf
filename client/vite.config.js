import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // Modul render bersama client+server (satu pipeline Markdown+KaTeX)
      '@shared': fileURLToPath(new URL('../shared', import.meta.url))
    }
  },
  server: {
    port: 3000,
    fs: {
      // Izinkan dev server membaca modul bersama di luar root client/
      allow: ['..']
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})