import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for the renderer e2e suite.
 *
 * The desktop app is Electron, but the renderer is a plain React + Vite SPA.
 * We point Playwright at the Vite dev server (`pnpm --filter desktop dev:renderer`)
 * and inject a mock `window.nightcoder` IPC bridge from each test (see
 * `fixtures/mock-ipc.ts`) so the suite never touches the real `claude` / `gh`
 * binaries or the user's filesystem.
 *
 * Run locally:
 *   pnpm test:e2e:install   # one-time, downloads chromium
 *   pnpm test:e2e
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    // The renderer expects a chromium-class layout / event model. We don't
    // need cross-browser coverage for an Electron app.
    viewport: { width: 1280, height: 800 },
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm --filter desktop dev:renderer',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
    timeout: 120_000,
  },
});
