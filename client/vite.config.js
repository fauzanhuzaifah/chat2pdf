import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('../shared', import.meta.url)),
      marked: fileURLToPath(new URL('./node_modules/marked', import.meta.url)),
      katex: fileURLToPath(new URL('./node_modules/katex', import.meta.url)),
    },
  },
  server: {
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
});