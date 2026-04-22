import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  build: {
    outDir: 'dist-main/preload',
    emptyOutDir: true,
    target: 'node20',
    lib: {
      entry: path.resolve(__dirname, 'src/preload/index.ts'),
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
