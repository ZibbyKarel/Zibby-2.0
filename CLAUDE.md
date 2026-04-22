# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (enforced via `packageManager` in `package.json`); never use `npm` or `yarn`.

| Task | Command |
| --- | --- |
| Dev (Vite renderer + Electron main, live-reload) | `pnpm dev` |
| Production build of desktop app | `pnpm build` |
| Build + package macOS DMG (arm64) | `pnpm dist:mac` |
| Lint all TS/TSX | `pnpm lint` |
| Typecheck (runs both `tsconfig.main.json` and `tsconfig.renderer.json`) | `pnpm typecheck` |
| Full test suite | `pnpm test` (wraps `vitest run`) |
| Single test file | `pnpm vitest run libs/orchestrator/src/dag.test.ts` |
| Tests matching a name | `pnpm vitest run -t "cycle detection"` |

`vitest.config.ts` only picks up `libs/**/*.{test,spec}.ts` — tests under `apps/desktop` are not wired up. `pnpm dev` relies on `wait-on` to hold Electron until Vite's dev server is listening on `http://localhost:5173`; if Vite binds to a different port, `dev:main` will hang.

Nx was removed (commit `e1def662`) — there is no `nx` CLI and no `project.json` files. Do not reintroduce them.

## Architecture

Zibby is an Electron desktop app that takes a repo path + a natural-language brief, asks the local `claude` CLI to break it into a `RefinedPlan` (stories + dependency DAG), then runs each story to completion in an isolated git worktree — commit, push, open PR via `gh`. The whole pipeline runs on the user's machine; there is no backend.

### Workspace layout

pnpm workspace with two roots (see `pnpm-workspace.yaml`):

- `apps/desktop` — Electron three-process app. Renderer is React 19 + Vite + Tailwind v4. Main/preload/renderer each have their own `vite.*.config.ts` and `tsconfig.*.json`. Build outputs land in `dist-main/`, `dist-renderer/`, and `dist-preload/`.
- `libs/*` — pure TypeScript libraries, consumed by the main process only. Aliased as `@zibby/<name>` via both `tsconfig.base.json` `paths` and each lib's `package.json` name. Both must stay in sync or imports resolve in the editor but fail at runtime.

`libs/db` and `libs/ui` appear in `tsconfig.base.json` paths but the directories do not exist — leftover stubs, ignore them.

### The pipeline

The flow crosses every layer, so tracing a bug usually means reading all of these files:

1. **Renderer → Main over IPC.** Channel names live in `libs/shared-types/src/ipc.ts` (`IpcChannels`, `IpcEvents`). The renderer calls `window.zibby.*` (typed as `IpcApi`), which is wired up in the preload script. All DTOs (`Story`, `RefinedPlan`, `RunEvent`, etc.) are declared here and re-validated with Zod schemas in `libs/shared-types/src/schemas.ts`. If you add a field, update both or runtime validation drops it.
2. **Main — planning.** `apps/desktop/src/main/index.ts` receives `Refine` / `Advise` IPC calls and delegates to `@zibby/ai-refiner`. `refine()` spawns the local `claude` CLI with `--output-format json --json-schema <RefinedPlanSchema-as-json-schema>` so the model returns a plan as structured output. `collectRepoContext()` reads `README`, `package.json`, and any `CLAUDE.md`/`AGENTS.md` from the target repo and prepends them to the user prompt.
3. **Main — orchestration.** `StartRun` delegates to `@zibby/orchestrator`'s `startPlanRun()`. It:
   - Calls `buildDag()` to validate the DAG (zero-indexed edges; cycles throw `Dependency graph contains a cycle`).
   - Resolves `baseBranch` via `detectBaseBranch()` (tries `origin/HEAD`, then `main`/`master`, then current branch).
   - Runs stories in topological order with `MAX_PARALLEL_RUNNERS` concurrency (default 3). When a story fails, `collectTransitiveSuccessors()` cascades `blocked` status to downstream stories — they never start.
4. **Story execution.** `executeStory()` creates a worktree at `<targetRepo>/.worktrees/<slug>` on branch `zibby/<slug>` (`createWorktree` in `libs/orchestrator/src/worktree.ts`). It then calls `runClaudeInWorktree()` (`libs/claude-runner/src/run.ts`), which spawns `claude` with `--output-format stream-json --permission-mode bypassPermissions` and parses the JSONL stream via `stream-parser.ts` into `HumanReadable` events. After the nested agent stops, any uncommitted changes are flushed (`commitAllIfDirty`), the branch is pushed, and a PR is opened via `gh pr create`. All three calls use `@zibby/github` which sets `GIT_TERMINAL_PROMPT=0` and `GIT_ASKPASS=echo` so `git push` fails fast instead of hanging on a credential prompt.
5. **Events back to the renderer.** Both the runner and the orchestrator emit events via callback; the main process forwards them to the renderer over `IpcEvents.RunEvent` (`RunEvent` union in `ipc.ts`). Every event carries `runId` + `storyIndex` so the renderer can route logs to the right story card.
6. **Cancellation** is cooperative. `CancelRun` sets a shared `signal.cancelled`; two 250 ms watchers in `executeStory` pick it up — one aborts the `claude` child process, the other triggers the `AbortController` passed into the git/gh `execFile` calls so in-flight push/PR requests cancel instead of hanging (see commit `5bad3533`).

### Cross-cutting concerns

- **Local AI settings are mirrored into each worktree** (`libs/orchestrator/src/worktree.ts`): `.claude/settings.local.json`, `.claude/CLAUDE.local.md`, `.agents/settings.local.json`, `.env.local`. Set `ZIBBY_INHERIT_LOCAL_AI=0` to disable. These files are deleted on worktree cleanup.
- **Env vars that change behavior at runtime:** `MAX_PARALLEL_RUNNERS`, `CLAUDE_CLI_PATH`, `CLAUDE_RUN_MODEL` (executor), `CLAUDE_REFINE_MODEL` (planner), `CLAUDE_REFINE_TIMEOUT_MS`, `BASE_BRANCH`. See `.env.example` for the canonical list.
- **External binaries required on PATH:** `claude`, `gh`, `git`. A missing `gh` will only surface at PR-creation time.
- **Persisted state** lives in Electron's `userData` dir (`state-store.ts`) — `folderPath`, `brief`, and the last `plan`. Writes are debounced 500 ms in the renderer.
- **Electron security posture:** `contextIsolation: true`, `nodeIntegration: false`, `sandbox: false`. The preload script is the only bridge — renderer code must not import Node APIs directly.
