# Add Task Dialog — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the global Brief + Refine flow with a per-task "+ Přidat task" dialog that lets users add stories individually, with optional single-story AI refinement.

**Architecture:** Frontend-only task addition (append to React state, no new IPC for the add itself). A new `refineStory` IPC channel handles optional AI expansion of a single task into a full user story with acceptance criteria. The global `BriefSection` is removed from the main screen.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Electron IPC, Zod, `@zibby/ai-refiner` (claude CLI wrapper)

---

## File Map

| File | Action | What changes |
|---|---|---|
| `libs/ai-refiner/src/claude-cli.ts` | **Create** | Shared `runClaudeCli` helper + `ClaudeResultEnvelopeSchema` (extracted from `refine.ts`) |
| `libs/ai-refiner/src/refine.ts` | **Modify** | Import from `./claude-cli` instead of defining locally |
| `libs/ai-refiner/src/refine-story.ts` | **Create** | `refineStory()` — single-story refinement function |
| `libs/ai-refiner/src/index.ts` | **Modify** | Export `refineStory` |
| `libs/shared-types/src/ipc.ts` | **Modify** | Add `RefineStory` channel + `RefineStoryRequest` / `RefineStoryResult` types + `refineStory` to `IpcApi` |
| `apps/desktop/src/main/index.ts` | **Modify** | Add `RefineStory` IPC handler |
| `apps/desktop/src/preload/index.ts` | **Modify** | Add `refineStory` bridge |
| `apps/desktop/src/renderer/App.tsx` | **Modify** | Remove `BriefSection` + `RefineProgress`, add `AddTaskDialog`, `handleAddTask`, `showAddTask` state, update `PlanView` header |

---

## Task 1: Extract shared Claude CLI helper

The `runClaudeCli` function and `ClaudeResultEnvelopeSchema` are currently private in `refine.ts`. The new `refine-story.ts` needs both. Extract them to a shared file to avoid duplication.

**Files:**
- Create: `libs/ai-refiner/src/claude-cli.ts`
- Modify: `libs/ai-refiner/src/refine.ts`

- [ ] **Step 1.1: Create `libs/ai-refiner/src/claude-cli.ts`**

```ts
import { spawn } from 'node:child_process';
import { z } from 'zod';

export const ClaudeResultEnvelopeSchema = z.object({
  type: z.literal('result'),
  subtype: z.string(),
  is_error: z.boolean(),
  result: z.string().optional(),
  structured_output: z.unknown().optional(),
  stop_reason: z.string().optional(),
});

export function runClaudeCli(args: {
  bin: string;
  prompt: string;
  systemPrompt: string;
  jsonSchema: unknown;
  model: string;
  cwd: string;
  timeoutMs: number;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      args.bin,
      [
        '-p', args.prompt,
        '--output-format', 'json',
        '--json-schema', JSON.stringify(args.jsonSchema),
        '--system-prompt', args.systemPrompt,
        '--model', args.model,
        '--tools', '',
        '--permission-mode', 'bypassPermissions',
      ],
      {
        cwd: args.cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: process.env,
      }
    );

    let stdout = '';
    let stderr = '';
    let settled = false;
    const start = Date.now();
    const elapsed = () => `${Math.round((Date.now() - start) / 1000)}s`;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      proc.kill('SIGTERM');
      reject(
        new Error(
          `claude CLI timed out after ${args.timeoutMs}ms (stderr so far: ${stderr.trim().slice(-400) || '<empty>'})`
        )
      );
    }, args.timeoutMs);

    proc.stdout.on('data', (chunk) => (stdout += chunk.toString()));
    proc.stderr.on('data', (chunk) => (stderr += chunk.toString()));

    proc.on('error', (e) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(e);
    });

    proc.on('close', (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) {
        reject(
          new Error(
            `claude CLI exited with code ${code}${signal ? ` (signal ${signal})` : ''} after ${elapsed()}: ${stderr.trim() || '<empty stderr>'}`
          )
        );
        return;
      }
      resolve(stdout);
    });
  });
}
```

- [ ] **Step 1.2: Update `libs/ai-refiner/src/refine.ts` to import from `./claude-cli`**

Replace the top of the file (lines 1–33 in the original, up to `function runClaudeCli`) with:

```ts
import { spawn } from 'node:child_process';
import { z } from 'zod';
import { RefinedPlanSchema } from '@zibby/shared-types/schemas';
import type { RefinedPlan } from '@zibby/shared-types/ipc';
import { collectRepoContext, renderContextForPrompt } from './repo-context';
import { runClaudeCli, ClaudeResultEnvelopeSchema } from './claude-cli';
```

Then delete the local `ClaudeResultEnvelopeSchema` definition and the local `runClaudeCli` function — everything from `const ClaudeResultEnvelopeSchema = ...` through the closing `}` of `runClaudeCli`. The rest of the file (`jsonSchemaForPlan`, `refine`) stays unchanged.

Also remove the now-unused `import { spawn } from 'node:child_process'` line (it's in claude-cli.ts now).

The final `refine.ts` should look like:

```ts
import { z } from 'zod';
import { RefinedPlanSchema } from '@zibby/shared-types/schemas';
import type { RefinedPlan } from '@zibby/shared-types/ipc';
import { collectRepoContext, renderContextForPrompt } from './repo-context';
import { runClaudeCli, ClaudeResultEnvelopeSchema } from './claude-cli';

const DEFAULT_MODEL = process.env.CLAUDE_REFINE_MODEL ?? 'sonnet';
const DEFAULT_TIMEOUT_MS = Number(process.env.CLAUDE_REFINE_TIMEOUT_MS ?? 300_000);
const DEFAULT_CLAUDE_BIN = process.env.CLAUDE_CLI_PATH ?? 'claude';

const SYSTEM_PROMPT = `You are a senior technical project manager. Given a rough brief from a developer and
the context of their repository, produce a small, well-scoped set of user stories with concrete
acceptance criteria, suitable for autonomous execution by a coding agent.

Rules:
- Break the brief into the smallest number of stories that each deliver independent value.
- Each story must have 2-8 acceptance criteria, each testable and observable.
- List the specific files or directories you expect to touch (best effort — relative paths).
- Propose dependencies ONLY when story B genuinely cannot start before story A completes.
  Dependencies are a zero-indexed DAG over the stories array. Shallow graphs are better.
- Respect every rule found in the repository's AI convention files (CLAUDE.md, AGENTS.md, etc.).
- Never invent stories the user did not ask for. Prefer fewer, sharper stories.

Return the plan via structured output — no prose commentary.`;

function jsonSchemaForPlan() {
  const schema = z.toJSONSchema(RefinedPlanSchema, { target: 'draft-7' }) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

export async function refine(params: {
  folderPath: string;
  brief: string;
  model?: string;
  timeoutMs?: number;
  claudeBin?: string;
}): Promise<RefinedPlan> {
  const ctx = await collectRepoContext(params.folderPath);
  const contextBlock = renderContextForPrompt(ctx);
  const userPrompt = `${contextBlock}\n\n---\n\n## Developer brief\n\n${params.brief}`;

  const stdout = await runClaudeCli({
    bin: params.claudeBin ?? DEFAULT_CLAUDE_BIN,
    prompt: userPrompt,
    systemPrompt: SYSTEM_PROMPT,
    jsonSchema: jsonSchemaForPlan(),
    model: params.model ?? DEFAULT_MODEL,
    cwd: params.folderPath,
    timeoutMs: params.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });

  let envelope: unknown;
  try {
    envelope = JSON.parse(stdout);
  } catch {
    throw new Error(`claude CLI returned non-JSON output: ${stdout.slice(0, 300)}`);
  }

  const env = ClaudeResultEnvelopeSchema.safeParse(envelope);
  if (!env.success) {
    throw new Error(`Unexpected claude CLI envelope shape: ${env.error.message}`);
  }
  if (env.data.is_error) {
    throw new Error(`claude reported error (${env.data.subtype}): ${env.data.result ?? '<no detail>'}`);
  }
  if (env.data.structured_output === undefined) {
    throw new Error(
      `claude did not produce structured_output. stop_reason=${env.data.stop_reason ?? '?'}, ` +
        `result="${(env.data.result ?? '').slice(0, 200)}"`
    );
  }

  const parsed = RefinedPlanSchema.safeParse(env.data.structured_output);
  if (!parsed.success) {
    throw new Error(`Plan failed schema validation: ${parsed.error.message}`);
  }
  return parsed.data;
}
```

- [ ] **Step 1.3: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors. If there are errors related to missing imports, double-check that `spawn` is removed from `refine.ts` and that `claude-cli.ts` is correctly importing `spawn`.

- [ ] **Step 1.4: Commit**

```bash
git add libs/ai-refiner/src/claude-cli.ts libs/ai-refiner/src/refine.ts
git commit -m "refactor: extract runClaudeCli to shared claude-cli helper"
```

---

## Task 2: Add shared types + create `refineStory` lib function

**Files:**
- Modify: `libs/shared-types/src/ipc.ts`
- Create: `libs/ai-refiner/src/refine-story.ts`
- Modify: `libs/ai-refiner/src/index.ts`

- [ ] **Step 2.1: Add `RefineStory` channel and types to `libs/shared-types/src/ipc.ts`**

Add to `IpcChannels`:
```ts
export const IpcChannels = {
  PickFolder: 'zibby:pickFolder',
  Refine: 'zibby:refine',
  Advise: 'zibby:advise',
  StartRun: 'zibby:startRun',
  RunStory: 'zibby:runStory',
  CancelRun: 'zibby:cancelRun',
  LoadState: 'zibby:loadState',
  SaveState: 'zibby:saveState',
  RemoveStory: 'zibby:removeStory',
  RefineStory: 'zibby:refineStory',
} as const;
```

Add after the existing `RefineResult` type:
```ts
export type RefineStoryRequest = {
  folderPath: string;
  title: string;
  description: string;
};

export type RefineStoryResult =
  | { kind: 'ok'; story: Story }
  | { kind: 'error'; message: string };
```

Add `refineStory` to `IpcApi`:
```ts
export type IpcApi = {
  version: string;
  pickFolder: () => Promise<PickFolderResult>;
  refine: (req: RefineRequest) => Promise<RefineResult>;
  refineStory: (req: RefineStoryRequest) => Promise<RefineStoryResult>;
  advise: (req: AdviseRequest) => Promise<AdviseResult>;
  startRun: (req: RunStartRequest) => Promise<RunStartResult>;
  runStory: (req: RunStoryRequest) => Promise<RunStoryResult>;
  cancelRun: (runId: string) => Promise<void>;
  onRunEvent: (handler: (event: RunEvent) => void) => () => void;
  loadState: () => Promise<LoadedAppState>;
  saveState: (state: PersistedState) => Promise<void>;
  removeStory: (storyIndex: number) => Promise<RemoveStoryResult>;
};
```

- [ ] **Step 2.2: Create `libs/ai-refiner/src/refine-story.ts`**

```ts
import { z } from 'zod';
import { StorySchema } from '@zibby/shared-types/schemas';
import type { Story } from '@zibby/shared-types/ipc';
import { collectRepoContext, renderContextForPrompt } from './repo-context';
import { runClaudeCli, ClaudeResultEnvelopeSchema } from './claude-cli';

const DEFAULT_MODEL = process.env.CLAUDE_REFINE_MODEL ?? 'sonnet';
const DEFAULT_TIMEOUT_MS = Number(process.env.CLAUDE_REFINE_TIMEOUT_MS ?? 120_000);
const DEFAULT_CLAUDE_BIN = process.env.CLAUDE_CLI_PATH ?? 'claude';

const SYSTEM_PROMPT = `You are a senior technical project manager. Given a task title and brief description from a developer and the context of their repository, expand it into a single, well-scoped user story ready for autonomous execution by a coding agent.

Rules:
- Keep the title concise and imperative (max 120 characters).
- Write a clear description that explains what needs to be done and why.
- Add 2–8 acceptance criteria, each concrete and testable.
- List the specific files or directories you expect to touch (relative paths, best effort).
- Respect every rule found in the repository's AI convention files (CLAUDE.md, AGENTS.md, etc.).
- Return the story via structured output — no prose commentary.`;

function jsonSchemaForStory() {
  const schema = z.toJSONSchema(StorySchema, { target: 'draft-7' }) as Record<string, unknown>;
  delete schema.$schema;
  return schema;
}

export async function refineStory(params: {
  folderPath: string;
  title: string;
  description: string;
  timeoutMs?: number;
  claudeBin?: string;
}): Promise<Story> {
  const ctx = await collectRepoContext(params.folderPath);
  const contextBlock = renderContextForPrompt(ctx);
  const userPrompt = `${contextBlock}\n\n---\n\n## Task to expand\n\n**Title:** ${params.title}\n\n**Description:** ${params.description}`;

  const stdout = await runClaudeCli({
    bin: params.claudeBin ?? DEFAULT_CLAUDE_BIN,
    prompt: userPrompt,
    systemPrompt: SYSTEM_PROMPT,
    jsonSchema: jsonSchemaForStory(),
    model: DEFAULT_MODEL,
    cwd: params.folderPath,
    timeoutMs: params.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  });

  let envelope: unknown;
  try {
    envelope = JSON.parse(stdout);
  } catch {
    throw new Error(`claude CLI returned non-JSON output: ${stdout.slice(0, 300)}`);
  }

  const env = ClaudeResultEnvelopeSchema.safeParse(envelope);
  if (!env.success) {
    throw new Error(`Unexpected claude CLI envelope shape: ${env.error.message}`);
  }
  if (env.data.is_error) {
    throw new Error(`claude reported error (${env.data.subtype}): ${env.data.result ?? '<no detail>'}`);
  }
  if (env.data.structured_output === undefined) {
    throw new Error(
      `claude did not produce structured_output. stop_reason=${env.data.stop_reason ?? '?'}, ` +
        `result="${(env.data.result ?? '').slice(0, 200)}"`
    );
  }

  const parsed = StorySchema.safeParse(env.data.structured_output);
  if (!parsed.success) {
    throw new Error(`Story failed schema validation: ${parsed.error.message}`);
  }
  return parsed.data;
}
```

- [ ] **Step 2.3: Export `refineStory` from `libs/ai-refiner/src/index.ts`**

Replace entire file content with:

```ts
export { refine } from './refine';
export { refineStory } from './refine-story';
export { advise } from './advise';
export { collectRepoContext, renderContextForPrompt } from './repo-context';
export type { RepoContext, RepoFile } from './repo-context';
```

- [ ] **Step 2.4: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors. If `z.toJSONSchema` is flagged, check that `zod` version supports it (same call pattern as `refine.ts`'s `jsonSchemaForPlan`).

- [ ] **Step 2.5: Commit**

```bash
git add libs/shared-types/src/ipc.ts libs/ai-refiner/src/refine-story.ts libs/ai-refiner/src/index.ts
git commit -m "feat: add RefineStory IPC types and refineStory lib function"
```

---

## Task 3: Wire up IPC handler and preload bridge

**Files:**
- Modify: `apps/desktop/src/main/index.ts`
- Modify: `apps/desktop/src/preload/index.ts`

- [ ] **Step 3.1: Add `refineStory` import and handler in `apps/desktop/src/main/index.ts`**

Update the import from `@zibby/ai-refiner`:
```ts
import { refine, advise, refineStory } from '@zibby/ai-refiner';
```

Update the import from `@zibby/shared-types/ipc` — add new types:
```ts
import {
  IpcChannels,
  IpcEvents,
  type PickFolderResult,
  type RefineRequest,
  type RefineResult,
  type RefineStoryRequest,
  type RefineStoryResult,
  type AdviseRequest,
  type AdviseResult,
  type RunStartRequest,
  type RunStartResult,
  type RunStoryRequest,
  type RunStoryResult,
  type RunEvent,
  type PersistedState,
  type LoadedAppState,
  type RemoveStoryPayload,
  type RemoveStoryResult,
} from '@zibby/shared-types/ipc';
```

Add the handler inside `registerIpc`, right after the existing `IpcChannels.Refine` handler block (around line 80):

```ts
  ipcMain.handle(
    IpcChannels.RefineStory,
    async (_event, req: RefineStoryRequest): Promise<RefineStoryResult> => {
      try {
        const story = await refineStory({
          folderPath: req.folderPath,
          title: req.title,
          description: req.description,
        });
        return { kind: 'ok', story };
      } catch (err) {
        return { kind: 'error', message: err instanceof Error ? err.message : String(err) };
      }
    }
  );
```

- [ ] **Step 3.2: Add `refineStory` bridge in `apps/desktop/src/preload/index.ts`**

Update the imports at the top — add new types:
```ts
import {
  IpcChannels,
  IpcEvents,
  type IpcApi,
  type PickFolderResult,
  type RefineRequest,
  type RefineResult,
  type RefineStoryRequest,
  type RefineStoryResult,
  type AdviseRequest,
  type AdviseResult,
  type RunStartRequest,
  type RunStartResult,
  type RunStoryRequest,
  type RunStoryResult,
  type RunEvent,
  type PersistedState,
  type LoadedAppState,
  type RemoveStoryResult,
} from '@zibby/shared-types/ipc';
```

Add `refineStory` to the `api` object (after `refine`):
```ts
const api: IpcApi = {
  version: '0.0.1',
  pickFolder: (): Promise<PickFolderResult> => ipcRenderer.invoke(IpcChannels.PickFolder),
  refine: (req: RefineRequest): Promise<RefineResult> =>
    ipcRenderer.invoke(IpcChannels.Refine, req),
  refineStory: (req: RefineStoryRequest): Promise<RefineStoryResult> =>
    ipcRenderer.invoke(IpcChannels.RefineStory, req),
  advise: (req: AdviseRequest): Promise<AdviseResult> =>
    ipcRenderer.invoke(IpcChannels.Advise, req),
  startRun: (req: RunStartRequest): Promise<RunStartResult> =>
    ipcRenderer.invoke(IpcChannels.StartRun, req),
  runStory: (req: RunStoryRequest): Promise<RunStoryResult> =>
    ipcRenderer.invoke(IpcChannels.RunStory, req),
  cancelRun: (runId: string): Promise<void> => ipcRenderer.invoke(IpcChannels.CancelRun, runId),
  onRunEvent: (handler: (event: RunEvent) => void) => {
    const listener = (_: unknown, event: RunEvent) => handler(event);
    ipcRenderer.on(IpcEvents.RunEvent, listener);
    return () => {
      ipcRenderer.removeListener(IpcEvents.RunEvent, listener);
    };
  },
  loadState: (): Promise<LoadedAppState> => ipcRenderer.invoke(IpcChannels.LoadState),
  saveState: (state: PersistedState): Promise<void> => ipcRenderer.invoke(IpcChannels.SaveState, state),
  removeStory: (storyIndex: number): Promise<RemoveStoryResult> =>
    ipcRenderer.invoke(IpcChannels.RemoveStory, { storyIndex }),
};
```

- [ ] **Step 3.3: Typecheck**

```bash
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3.4: Commit**

```bash
git add apps/desktop/src/main/index.ts apps/desktop/src/preload/index.ts
git commit -m "feat: wire RefineStory IPC handler and preload bridge"
```

---

## Task 4: Update App.tsx — AddTaskDialog + remove BriefSection

**Files:**
- Modify: `apps/desktop/src/renderer/App.tsx`

This is the largest task. Read the full current `App.tsx` before making changes (it's in `apps/desktop/src/renderer/App.tsx`).

- [ ] **Step 4.1: Update App state and handlers**

In the `App` function body, make the following changes:

**Remove** these state variables:
```ts
// DELETE these two lines:
const [brief, setBrief] = useState('');
const [refining, setRefining] = useState(false);
const [refineModel, setRefineModel] = useState<RefineModel>('sonnet');
```

**Add** `showAddTask` state after the existing state declarations:
```ts
const [showAddTask, setShowAddTask] = useState(false);
```

**Remove** the `handleRefine` function entirely:
```ts
// DELETE this function:
const handleRefine = async () => { ... };
```

**Add** `handleAddTask` after the `addDependency` function:
```ts
const handleAddTask = (story: Story) => {
  setPlan((cur) =>
    cur
      ? { ...cur, stories: [...cur.stories, story] }
      : { stories: [story], dependencies: [] }
  );
};
```

**Update** the `saveState` effect — remove `brief` and `refineModel` from the save call and the dependency array:
```ts
useEffect(() => {
  if (!loadedState) return;
  if (saveTimer.current) clearTimeout(saveTimer.current);
  saveTimer.current = setTimeout(() => {
    void window.zibby.saveState({
      folderPath: folder?.path,
      plan: plan ?? undefined,
    });
  }, 500);
  return () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  };
}, [folder, plan, loadedState]);
```

**Update** the `loadState` effect — remove `setBrief` and `setRefineModel` calls:
```ts
useEffect(() => {
  let cancelled = false;
  (async () => {
    const restored = await window.zibby.loadState();
    if (cancelled) return;
    if (restored.folder && restored.folder.kind === 'selected') setFolder(restored.folder);
    setPlan(restored.plan);
    setLoadedState(true);
  })();
  return () => {
    cancelled = true;
  };
}, []);
```

**Update** the imports at the top of the file — remove `RefineModel` (no longer needed in App):
```ts
import type {
  PickFolderResult,
  RefinedPlan,
  Story,
  Dependency,
  RunEvent,
  AdvisorReview,
} from '@zibby/shared-types/ipc';
```

- [ ] **Step 4.2: Update the JSX render in `App`**

In the return block of `App`, make these changes:

**Remove** the `BriefSection` and `RefineProgress` blocks:
```tsx
// DELETE these blocks:
{folder && (
  <BriefSection ... />
)}
{refining && <RefineProgress />}
```

**Add** an empty-state CTA when folder is selected but no plan exists. Place it after the error block and before the `{plan && <PlanView ...>}` block:
```tsx
{folder && !plan && (
  <div className="flex flex-col items-center gap-3 py-8 text-center">
    <p className="text-neutral-500 text-sm">Žádné tasky. Přidej první task a spusť ho.</p>
    <button
      onClick={() => setShowAddTask(true)}
      className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium"
    >
      + Přidat task
    </button>
  </div>
)}
```

**Add** `onAddTask` prop to the `PlanView` component call:
```tsx
{plan && (
  <PlanView
    plan={plan}
    runtime={runtime}
    running={running}
    runActive={runActive}
    canRun={canRun}
    canRunIndividual={canRunIndividual}
    runDone={runDone}
    onRun={handleRun}
    onCancel={handleCancel}
    onRunStory={handleRunStory}
    onUpdateStory={updateStory}
    onRemoveDependency={removeDependency}
    onRemoveStory={handleRemoveStory}
    storyRemoveErrors={storyRemoveErrors}
    branchDeletionNotice={branchDeletionNotice}
    onDismissBranchNotice={() => setBranchDeletionNotice(null)}
    review={review}
    advising={advising}
    onAdvise={handleAdvise}
    onApplySuggestedDependency={applySuggestedDependency}
    onAddDependency={addDependency}
    onAddTask={() => setShowAddTask(true)}
  />
)}
```

**Add** the `AddTaskDialog` just before the closing `</div>` of the App root:
```tsx
{folder && (
  <AddTaskDialog
    folder={folder}
    open={showAddTask}
    onClose={() => setShowAddTask(false)}
    onAdd={(story) => {
      handleAddTask(story);
      setShowAddTask(false);
    }}
  />
)}
```

- [ ] **Step 4.3: Add `AddTaskDialog` component (inline function at bottom of file)**

Add this new function after the existing `Badge` function at the bottom of `App.tsx`:

```tsx
function AddTaskDialog({
  folder,
  open,
  onClose,
  onAdd,
}: {
  folder: SelectedFolder;
  open: boolean;
  onClose: () => void;
  onAdd: (story: Story) => void;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [model, setModel] = useState('');
  const [refining, setRefining] = useState(false);
  const [refinedAC, setRefinedAC] = useState<string[] | null>(null);
  const [refineError, setRefineError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle('');
      setDescription('');
      setModel('');
      setRefining(false);
      setRefinedAC(null);
      setRefineError(null);
    }
  }, [open]);

  const handleRefine = async () => {
    setRefining(true);
    setRefineError(null);
    setRefinedAC(null);
    const res = await window.zibby.refineStory({
      folderPath: folder.path,
      title,
      description,
    });
    setRefining(false);
    if (res.kind === 'ok') {
      setTitle(res.story.title);
      setDescription(res.story.description);
      setRefinedAC(res.story.acceptanceCriteria);
    } else {
      setRefineError(res.message);
    }
  };

  const handleAdd = () => {
    onAdd({
      title: title.trim(),
      description: description.trim(),
      acceptanceCriteria: refinedAC ?? [],
      affectedFiles: [],
      model: model || undefined,
    });
  };

  if (!open) return null;

  const canRefine = !refining && description.trim().length > 0;
  const canAdd = title.trim().length >= 3 && description.trim().length > 0 && !refining;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 w-full max-w-lg space-y-4">
        <h2 className="text-lg font-semibold text-neutral-100">Přidat task</h2>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-neutral-400">Název *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Stručný název tasku"
            className="w-full rounded-lg bg-neutral-950 border border-neutral-800 focus:border-indigo-500 focus:outline-none px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-neutral-400">Popis / Brief *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Popiš co má task udělat — Refine z toho udělá kompletní user story s AC"
            rows={5}
            className="w-full rounded-lg bg-neutral-950 border border-neutral-800 focus:border-indigo-500 focus:outline-none px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-600 resize-none"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-neutral-400">Model (pro implementaci)</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1 text-xs text-neutral-200"
          >
            <option value="">Výchozí (sonnet)</option>
            <option value="sonnet">Sonnet</option>
            <option value="opus">Opus</option>
            <option value="haiku">Haiku</option>
          </select>
        </div>

        {refinedAC && (
          <div className="rounded-lg bg-neutral-950 border border-emerald-500/30 p-3 space-y-1">
            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
              Acceptance criteria (z Refine)
            </p>
            <ul className="list-disc list-inside text-xs text-neutral-300 space-y-0.5">
              {refinedAC.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {refineError && <p className="text-xs text-rose-300">{refineError}</p>}

        <div className="flex justify-between items-center pt-2">
          <button
            onClick={() => { void handleRefine(); }}
            disabled={!canRefine}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-200 text-sm font-medium border border-neutral-700 flex items-center gap-2"
          >
            {refining && (
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
            {refining ? 'Refining…' : 'Refine'}
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-neutral-400 hover:text-neutral-200 text-sm"
            >
              Zrušit
            </button>
            <button
              onClick={handleAdd}
              disabled={!canAdd}
              className="px-4 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium"
            >
              Přidat task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4.4: Update `PlanView` to accept and use `onAddTask` prop**

In the `PlanView` function signature, add `onAddTask: () => void` to the props destructuring and its type definition:

```tsx
function PlanView({
  plan,
  runtime,
  running,
  runActive,
  canRun,
  canRunIndividual,
  runDone,
  onRun,
  onCancel,
  onRunStory,
  onUpdateStory,
  onRemoveDependency,
  onRemoveStory,
  storyRemoveErrors,
  branchDeletionNotice,
  onDismissBranchNotice,
  review,
  advising,
  onAdvise,
  onApplySuggestedDependency,
  onAddDependency,
  onAddTask,
}: {
  // ... all existing prop types ...
  onAddTask: () => void;
}) {
```

In the `PlanView` header div (the one with `"Refined plan"` and the `"Run all"` button), add the "+ Přidat task" button before the existing buttons:

```tsx
<div className="flex items-center justify-between">
  <h2 className="text-lg font-semibold text-neutral-200">Refined plan</h2>
  <div className="flex items-center gap-3">
    {runDone === true && <span className="text-emerald-400 text-sm">All done ✓</span>}
    {runDone === false && <span className="text-rose-400 text-sm">Run failed</span>}
    <button
      onClick={onAddTask}
      className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-sm font-medium border border-neutral-700"
    >
      + Přidat task
    </button>
    <button
      onClick={onAdvise}
      disabled={advising || running}
      className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-200 text-sm font-medium border border-neutral-700"
    >
      {advising ? 'Asking Opus…' : 'Ask Opus'}
    </button>
    {running ? (
      <button
        onClick={onCancel}
        className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-white text-sm font-medium"
      >
        Cancel run
      </button>
    ) : (
      <button
        onClick={onRun}
        disabled={!canRun}
        className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium"
      >
        Run all
      </button>
    )}
  </div>
</div>
```

- [ ] **Step 4.5: Remove now-unused functions and imports**

Delete these functions from App.tsx (they are no longer used):
- `BriefSection` function
- `RefineProgress` function

Remove `RefineModel` from the imports if it's still there (it was only used by `BriefSection` and the old state).

- [ ] **Step 4.6: Typecheck + lint**

```bash
pnpm typecheck && pnpm lint
```

Expected: no errors. Common issues to look for:
- `RefineModel` imported but unused → remove the import
- `brief`, `refining` used somewhere that wasn't updated → search file for those names
- `setRefineModel`, `setBrief` references that weren't removed

- [ ] **Step 4.7: Manual smoke test**

Run the dev server:
```bash
pnpm dev
```

Verify:
1. App starts, no brief textarea visible on main screen
2. Selecting a folder shows the empty-state CTA "+ Přidat task"
3. Clicking "+ Přidat task" opens the modal
4. Filling title + description enables "Přidat task" button
5. Clicking "Přidat task" closes modal and adds task to plan
6. Plan header shows "+ Přidat task" button alongside "Run all"
7. Dialog "Zrušit" closes without adding
8. Dialog resets fields when reopened

- [ ] **Step 4.8: Commit**

```bash
git add apps/desktop/src/renderer/App.tsx
git commit -m "feat: add AddTaskDialog, remove BriefSection, wire handleAddTask"
```

---

## Done

All four tasks complete. The feature is:
- `refineStory` lib function in `@zibby/ai-refiner`
- `RefineStory` IPC channel end-to-end (shared-types → main → preload)
- `AddTaskDialog` component in renderer with optional Refine flow
- `BriefSection` removed; `+ Přidat task` CTA on empty state and in PlanView header
