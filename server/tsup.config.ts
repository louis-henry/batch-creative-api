import { defineConfig } from 'tsup';

// Bundles @app/contracts (a workspace TS package) into the output so the
// compiled server runs with `node dist/main.js`. Other deps stay external and
// resolve from node_modules at runtime.
export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  noExternal: ['@app/contracts'],
  clean: true,
});
