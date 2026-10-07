import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173, // Vite dev server port
    proxy: {
      '/xmleditor': {
        target: 'http://localhost',
        changeOrigin: true,
        secure: false
        //rewrite: (path) => path.replace(/^\/api/, '') // optional
      }
    }
  },
  build: {
    target: ['chrome72', 'firefox66', 'edge80', 'safari14.1'],
    outDir: 'dist',
    sourcemap: true
  }
});
