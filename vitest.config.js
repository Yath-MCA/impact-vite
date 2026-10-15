import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@editor': path.resolve(root, 'src/pages/editor'),
      '@common': path.resolve(root, 'src/pages/common'),
      '@config': path.resolve(root, 'src/config'),
      '@assets': path.resolve(root, 'src/assets'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['tests/unit/**/*.{test,spec}.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
