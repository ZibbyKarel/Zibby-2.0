# Remove Story UI — Per-Card Remove Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a remove button to each story card that lets users delete individual stories from the plan when no run is active, with optimistic updates, rollback on failure, dependency gating, and a branch-deletion warning notice.

**Architecture:** The IPC layer (`window.zibby.removeStory`) is already wired. Changes are pure UI: StoryCard gets four new props (runActive, hasDownstreamDependents, onRemove, removeError), App.tsx gains a handler and two state variables, and PlanView threads them through while rendering a dismissible amber notice for branch warnings. Optimistic removal computes a re-indexed plan client-side; on failure the previous plan snapshot is restored.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Electron renderer (no test infrastructure for the renderer — vitest only picks up `libs/**/*.test.ts`).

---

## File Map

| File | Change |
|---|---|
| `apps/desktop/src/renderer/components/StoryCard.tsx` | Add 4 new props, remove button in header, inline error below header |
| `apps/desktop/src/renderer/App.tsx` | Add 2 state vars, `handleRemoveStory`, `runActive` derivation, thread new props into PlanView and StoryCard |

---

### Task 1: Add remove button props and UI to StoryCard

**Files:**
- Modify: `apps/desktop/src/renderer/components/StoryCard.tsx`

- [ ] **Step 1: Add four new props to the StoryCard function signature**

Open `apps/desktop/src/renderer/components/StoryCard.tsx`. The current prop destructure starts at line 23. Add the four new props to both the destructured params and the inline type annotation:

```tsx
export function StoryCard({
  index,
  story,
  runtime,
  waitsOn,
  editable,
  onChange,
  onRunStory,
  canRunIndividual,
  unmetDependencies,
  runActive,
  hasDownstreamDependents,
  onRemove,
  removeError,
}: {
  index: number;
  story: Story;
  runtime: StoryRuntime;
  waitsOn: number[];
  editable: boolean;
  onChange: (patch: Partial<Story>) => void;
  onRunStory: () => void;
  canRunIndividual: boolean;
  unmetDependencies: { index: number; title: string }[];
  runActive: boolean;
  hasDownstreamDependents: boolean;
  onRemove: () => void;
  removeError?: string | null;
}) {
```

- [ ] **Step 2: Add the remove button to the card header**

Still in `StoryCard.tsx`, locate the header section. The Edit button block currently looks like:

```tsx
        {editable && (
          <button
            onClick={() => setEditing((v) => !v)}
            className="shrink-0 text-xs text-neutral-400 hover:text-neutral-200 px-2 py-0.5 rounded border border-neutral-700"
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        )}
```

Replace that block with the Edit button followed by the Remove button:

```tsx
        {editable && (
          <button
            onClick={() => setEditing((v) => !v)}
            className="shrink-0 text-xs text-neutral-400 hover:text-neutral-200 px-2 py-0.5 rounded border border-neutral-700"
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        )}
        {!runActive && (
          <button
            onClick={onRemove}
            disabled={hasDownstreamDependents}
            title={hasDownstreamDependents ? 'Remove dependents first' : 'Remove story'}
            className="shrink-0 text-xs text-neutral-500 hover:text-rose-300 px-2 py-0.5 rounded border border-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ✕
          </button>
        )}
```

- [ ] **Step 3: Add the inline remove error below the card header**

In `StoryCard.tsx`, after the closing `</header>` tag and before the description paragraph/textarea block, add:

```tsx
      {removeError && (
        <p className="text-xs text-rose-300">{removeError}</p>
      )}
```

- [ ] **Step 4: Typecheck to verify no type errors**

```bash
cd /Users/zibby/Workspace/Zibby-2.0/.worktrees/2-remove-story-ui-per-card-remove-button-with-gati && pnpm typecheck
```

Expected: TypeScript errors about missing props on `<StoryCard>` call sites in `App.tsx` (the new required props haven't been threaded yet). That is expected at this step. There should be NO errors inside `StoryCard.tsx` itself.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/renderer/components/StoryCard.tsx
git commit -m "feat: add remove button and error display to StoryCard"
```

---

### Task 2: Add state and handler to App.tsx

**Files:**
- Modify: `apps/desktop/src/renderer/App.tsx`

- [ ] **Step 1: Add two new state variables after the existing state declarations**

In `App.tsx`, the existing state declarations end around line 32 (`const saveTimer = ...`). After the `review` and `loadedState` state declarations, add:

```tsx
  const [storyRemoveErrors, setStoryRemoveErrors] = useState<Record<number, string>>({});
  const [branchDeletionNotice, setBranchDeletionNotice] = useState<string | null>(null);
```

- [ ] **Step 2: Add the handleRemoveStory async function**

In `App.tsx`, after the `handleCancel` function (around line 200), add:

```tsx
  const handleRemoveStory = async (storyIndex: number) => {
    if (!plan) return;
    const prevPlan = plan;
    const optimisticPlan: RefinedPlan = {
      stories: plan.stories.filter((_, i) => i !== storyIndex),
      dependencies: plan.dependencies
        .filter((d) => d.from !== storyIndex && d.to !== storyIndex)
        .map((d) => ({
          ...d,
          from: d.from > storyIndex ? d.from - 1 : d.from,
          to: d.to > storyIndex ? d.to - 1 : d.to,
        })),
    };
    setPlan(optimisticPlan);
    setStoryRemoveErrors((prev) => {
      const next = { ...prev };
      delete next[storyIndex];
      return next;
    });
    try {
      const result = await window.zibby.removeStory(storyIndex);
      setPlan(result.plan);
      if (result.branchDeletionWarning) {
        setBranchDeletionNotice(result.branchDeletionWarning);
      }
    } catch (err) {
      setPlan(prevPlan);
      setStoryRemoveErrors((prev) => ({
        ...prev,
        [storyIndex]: err instanceof Error ? err.message : 'Failed to remove story',
      }));
    }
  };
```

- [ ] **Step 3: Derive the runActive boolean**

In `App.tsx`, after the existing `const running = runId !== null;` line (around line 202), add:

```tsx
  const runActive =
    running || Object.values(runtime).some((r) => r.status === 'running' || r.status === 'pushing');
```

- [ ] **Step 4: Typecheck**

```bash
pnpm typecheck
```

Expected: TypeScript errors about missing props on `<PlanView>` — the new props haven't been passed yet. No errors in the new state/handler code itself.

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/src/renderer/App.tsx
git commit -m "feat: add removeStory handler and runActive derivation to App"
```

---

### Task 3: Thread remove props through PlanView and wire StoryCard call sites

**Files:**
- Modify: `apps/desktop/src/renderer/App.tsx` (PlanView prop interface + JSX + StoryCard call)

- [ ] **Step 1: Add the new props to the PlanView JSX call**

In `App.tsx`, find the `<PlanView ... />` JSX block (around line 244). Add these props to it:

```tsx
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
        />
```

- [ ] **Step 2: Add the new props to the PlanView function signature and type annotation**

Find the `function PlanView({` declaration (around line 342). Add the five new props to both the destructure and inline type:

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
}: {
  plan: RefinedPlan;
  runtime: Record<number, StoryRuntime>;
  running: boolean;
  runActive: boolean;
  canRun: boolean;
  canRunIndividual: boolean;
  runDone: boolean | null;
  onRun: () => void;
  onCancel: () => void;
  onRunStory: (storyIndex: number) => void;
  onUpdateStory: (index: number, patch: Partial<Story>) => void;
  onRemoveDependency: (depIndex: number) => void;
  onRemoveStory: (index: number) => void;
  storyRemoveErrors: Record<number, string>;
  branchDeletionNotice: string | null;
  onDismissBranchNotice: () => void;
  review: AdvisorReview | null;
  advising: boolean;
  onAdvise: () => void;
  onApplySuggestedDependency: (dep: Dependency) => void;
  onAddDependency: (dep: Dependency) => string | null;
}) {
```

- [ ] **Step 3: Add the branch deletion notice banner inside PlanView**

In `PlanView`, find the `<div className="space-y-3">` that contains the `plan.stories.map(...)` call (around line 427). Add the dismissible notice banner immediately BEFORE that div:

```tsx
      {branchDeletionNotice && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-200 text-xs p-3 flex items-center justify-between">
          <span>Branch warning: {branchDeletionNotice}</span>
          <button
            onClick={onDismissBranchNotice}
            className="ml-4 text-neutral-500 hover:text-neutral-300"
          >
            ✕
          </button>
        </div>
      )}
```

- [ ] **Step 4: Add the four remove-related props to each StoryCard call**

In `PlanView`, find the `<StoryCard` JSX call inside the `plan.stories.map` (around line 434). Update it to pass the four new props. The full StoryCard call should now be:

```tsx
            <StoryCard
              key={i}
              index={i}
              story={story}
              runtime={runtime[i] ?? emptyRuntime()}
              waitsOn={waitsOn}
              editable={!running}
              onChange={(patch) => onUpdateStory(i, patch)}
              onRunStory={() => onRunStory(i)}
              canRunIndividual={canRunIndividual}
              unmetDependencies={unmetDependencies}
              runActive={runActive}
              hasDownstreamDependents={plan.dependencies.some((d) => d.from === i)}
              onRemove={() => onRemoveStory(i)}
              removeError={storyRemoveErrors[i] ?? null}
            />
```

- [ ] **Step 5: Typecheck — expect clean**

```bash
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 6: Lint**

```bash
pnpm lint
```

Expected: No errors or warnings.

- [ ] **Step 7: Run tests**

```bash
pnpm test
```

Expected: All existing tests pass (no tests exist for the renderer, so this verifies no regressions in `libs/`).

- [ ] **Step 8: Commit**

```bash
git add apps/desktop/src/renderer/App.tsx
git commit -m "feat: wire remove story through PlanView with optimistic update and branch warning notice"
```

---

### Task 4: Final verification

**Files:** None (read-only)

- [ ] **Step 1: Run the full quality suite**

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Expected output:
- typecheck: exits 0, no errors
- lint: exits 0, no errors
- test: all tests pass

- [ ] **Step 2: Verify acceptance criteria coverage**

Manually trace each criterion against the implementation:

1. **Remove button only when no run is active** — `{!runActive && <button ...>}` in StoryCard ✓  
2. **Disabled with tooltip when has downstream dependents** — `disabled={hasDownstreamDependents}` + `title="Remove dependents first"` ✓  
3. **Calls removeStory, optimistic removal, success replaces plan** — `handleRemoveStory` in App.tsx ✓  
4. **Rollback + inline error on IPC failure** — catch block restores `prevPlan`, sets `storyRemoveErrors[storyIndex]`; card renders `{removeError && <p>}` ✓  
5. **Non-blocking notice for branchDeletionWarning** — amber dismissible banner in PlanView ✓
