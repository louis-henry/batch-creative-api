import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['{server,packages,web}/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['server/src/**', 'packages/*/src/**', 'web/src/**'],
      exclude: ['**/*.{test,spec}.{ts,tsx}', '**/main.{ts,tsx}'],
    },
  },
});
