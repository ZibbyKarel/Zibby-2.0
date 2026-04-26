# NightCoder e2e tests

Playwright tests covering the renderer's critical user flows. The desktop
shell is Electron, but the renderer is a plain React + Vite SPA, so we run
the tests against the Vite dev server with a mocked `window.nightcoder` IPC
bridge — no real `claude` / `gh` / filesystem calls.

## Run

```bash
pnpm test:e2e:install   # one-time, downloads chromium
pnpm test:e2e           # headless
pnpm test:e2e:headed    # debug a flaky test in a real browser window
```

Playwright auto-starts `pnpm --filter desktop dev:renderer` (set in
`playwright.config.ts`) so you don't have to launch it yourself. If you
already have the Vite dev server running, it will be reused.

## Layout

```
e2e/
├── playwright.config.ts     # web server + browsers + reporter
├── fixtures/
│   └── mock-ipc.ts          # injects window.nightcoder + test driver
└── tests/
    ├── first-launch.spec.ts # folder picker, theme toggle, empty board
    ├── add-task.spec.ts     # the New-task dialog flow
    ├── run-task.spec.ts     # Run / Run-all → status events → columns
    ├── task-drawer.spec.ts  # drawer tabs, log streaming, edit details
    ├── filters-search.spec.ts
    ├── command-palette.spec.ts
    ├── delete-task.spec.ts
    └── sync.spec.ts
```

## Adding a test

1. Add the `data-testid` strings to **`libs/test-ids/src/index.ts`** —
   never hardcode them inside the renderer or test files.
2. Render them from the component via `TestIds.<Surface>.<id>`.
3. In the test, import `{ TestIds }` from `@nightcoder/test-ids` and locate
   nodes with `page.getByTestId(TestIds.<Surface>.<id>)`.
4. Use the `installMockIpc(page, options)` helper plus `emitStatus`,
   `emitLog`, etc. to drive run-time state without a real backend.

The same `@nightcoder/test-ids` library is consumed by Vitest component
tests in `libs/design-system/src/*.test.tsx` and the renderer itself, so a
rename is a one-line change everywhere.
