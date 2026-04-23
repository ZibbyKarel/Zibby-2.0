# Remove Story UI — Per-Card Remove Button with Gating and Feedback

**Date:** 2026-04-23  
**Branch:** zibby/2-remove-story-ui-per-card-remove-button-with-gati

## Overview

Add a remove button to each story card that lets users delete individual stories from the plan when no run is active. The button is disabled when the story has downstream dependents, and branch-deletion warnings are surfaced non-intrusively.

## Acceptance Criteria

1. Each story card renders a remove button only when no run is active; 'run active' means at least one story has status `running` or `pushing`.
2. The remove button is visually disabled with tooltip 'Remove dependents first' when the story's index appears as a `from` node in any dependency edge.
3. Clicking an enabled remove button calls `window.zibby.removeStory(storyIndex)`, optimistically removes the card, and on success replaces the in-memory plan with the returned `RefinedPlan`.
4. If the IPC call rejects, the optimistic removal is rolled back, the card is restored, and an inline error message is shown on the card.
5. If the response contains a non-empty `branchDeletionWarning`, a dismissible amber inline notice appears at the plan level.

## Architecture

### IPC Layer (already implemented)

`window.zibby.removeStory(storyIndex: number): Promise<RemoveStoryResult>` is already defined in the preload and IpcApi type. `RemoveStoryResult = { plan: RefinedPlan; branchDeletionWarning?: string }`.

### State Changes (App.tsx)

| State | Type | Purpose |
|---|---|---|
| `storyRemoveErrors` | `Record<number, string>` | Per-card inline error message shown after rollback |
| `branchDeletionNotice` | `string \| null` | Plan-level dismissible notice for branch deletion warnings |

### handleRemoveStory(storyIndex: number)

1. Snapshot current plan as `prevPlan`
2. Compute `optimisticPlan` by filtering out the story and re-indexing dependencies
3. `setPlan(optimisticPlan)` — card disappears immediately
4. Clear any previous remove error for this index
5. Call `window.zibby.removeStory(storyIndex)`
6. On success: `setPlan(result.plan)` (canonical server plan); set `branchDeletionNotice` if warning present
7. On failure: `setPlan(prevPlan)` (rollback); set `storyRemoveErrors[storyIndex]` with error message

### Optimistic Re-indexing Formula

```typescript
stories: plan.stories.filter((_, i) => i !== storyIndex)
dependencies: plan.dependencies
  .filter((d) => d.from !== storyIndex && d.to !== storyIndex)
  .map((d) => ({
    ...d,
    from: d.from > storyIndex ? d.from - 1 : d.from,
    to: d.to > storyIndex ? d.to - 1 : d.to,
  }))
```

### runActive Computation

```typescript
const runActive = running || Object.values(runtime).some(
  r => r.status === 'running' || r.status === 'pushing'
);
```

Covers both full plan runs (runId !== null) and individual story runs.

### hasDownstreamDependents (per card)

```typescript
const hasDownstreamDependents = plan.dependencies.some((d) => d.from === i);
```

Story `i` is a prerequisite for other stories when it appears as `d.from`.

### PlanView Changes

- Accept and thread through: `onRemoveStory`, `storyRemoveErrors`, `branchDeletionNotice`, `onDismissBranchNotice`, `runActive`
- Compute `hasDownstreamDependents` per story from `plan.dependencies`
- Render dismissible amber banner when `branchDeletionNotice` is set
- Pass remove props to each StoryCard

### StoryCard Changes

New props:
- `runActive: boolean` — hides remove button when true
- `hasDownstreamDependents: boolean` — disables button with tooltip
- `onRemove: () => void` — handler
- `removeError?: string | null` — shown inline below card header on rollback

Remove button appears in the card header alongside Edit and Run buttons:
- Only renders when `!runActive`
- Disabled + tooltip 'Remove dependents first' when `hasDownstreamDependents`
- Small ✕ button styled like the Edit button

## Files to Change

- `apps/desktop/src/renderer/App.tsx`
- `apps/desktop/src/renderer/components/StoryCard.tsx`

No new files. No toast system needed — inline banner for branch warnings.
