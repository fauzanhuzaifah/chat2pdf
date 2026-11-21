import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'

export default export default defineConfig({
  resolve: {
    alias: {
      marked: fileURLToPath(new URL('./node_modules/marked', import.meta.url)),
      katex: fileURLToPath(new URL('./node_modules/katex', import.meta.url)),
    },
  },
});
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