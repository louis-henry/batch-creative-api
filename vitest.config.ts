import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['{server,packages}/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      include: ['server/src/**', 'packages/*/src/**'],
      exclude: ['**/*.test.ts', '**/main.ts'],
    },
  },
});
