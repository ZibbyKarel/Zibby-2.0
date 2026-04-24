import { defineConfig } from 'vitest/config';
import path from 'node:path';

const root = new URL('.', import.meta.url).pathname;
const r = (...parts: string[]) => path.join(root, ...parts);

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@nightcoder\/shared-types\/ipc$/, replacement: r('libs/shared-types/src/ipc.ts') },
      { find: /^@nightcoder\/shared-types\/schemas$/, replacement: r('libs/shared-types/src/schemas.ts') },
      { find: /^@nightcoder\/shared-types\/task-id$/, replacement: r('libs/shared-types/src/task-id.ts') },
      { find: /^@nightcoder\/shared-types$/, replacement: r('libs/shared-types/src/index.ts') },
      { find: /^@nightcoder\/ai-refiner$/, replacement: r('libs/ai-refiner/src/index.ts') },
      { find: /^@nightcoder\/orchestrator$/, replacement: r('libs/orchestrator/src/index.ts') },
      { find: /^@nightcoder\/claude-runner$/, replacement: r('libs/claude-runner/src/index.ts') },
      { find: /^@nightcoder\/github$/, replacement: r('libs/github/src/index.ts') },
      { find: /^@nightcoder\/project-state$/, replacement: r('libs/project-state/src/index.ts') },
      { find: /^@nightcoder\/usage$/, replacement: r('libs/usage/src/index.ts') },
      { find: /^@nightcoder\/design-system$/, replacement: r('libs/design-system/src/index.ts') },
      { find: /^@nightcoder\/form$/, replacement: r('libs/form/src/index.ts') },
    ],
  },
  test: {
    include: ['libs/**/*.{test,spec}.{ts,tsx}'],
    environment: 'node',
    passWithNoTests: false,
    setupFiles: ['./vitest.setup.ts'],
  },
});
