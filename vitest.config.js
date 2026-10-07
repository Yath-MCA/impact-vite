import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom', // lightweight DOM simulation
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
});
