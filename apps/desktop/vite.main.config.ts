import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  build: {
    outDir: 'dist-main/main',
    emptyOutDir: true,
    target: 'node20',
    lib: {
      entry: path.resolve(__dirname, 'src/main/index.ts'),
      formats: ['cjs'],
      fileName: () => 'index.cjs',
    },
    rollupOptions: {
      external: ['electron', /^node:.*/],
    },
    sourcemap: true,
    minify: false,
  },
});
