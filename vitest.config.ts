import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['libs/**/*.{test,spec}.ts'],
    environment: 'node',
    passWithNoTests: false,
  },
});
