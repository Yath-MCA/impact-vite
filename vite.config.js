import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@legacy': path.resolve(root, 'temp/legacy/src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/xmleditor': {
        target: 'http://localhost',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    target: ['chrome72', 'firefox66', 'edge80', 'safari14.1'],
    outDir: 'dist',
    sourcemap: true,
  },
});
