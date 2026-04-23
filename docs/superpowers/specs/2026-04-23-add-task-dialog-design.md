# Design: Add Task Dialog

**Date:** 2026-04-23
**Status:** Approved

## Problem

The current flow requires the user to write a full project brief and run AI refinement to generate all stories at once. There is no way to add an individual task/story to an existing plan manually and quickly. This makes incremental task management slow — every story creation goes through an LLM call.

## Goal

Add a "+ Přidat task" button that opens a dialog for creating individual tasks. Refinement (via AI) is optional — a task can be added as a raw title + description and Claude will handle the details during execution.

## Approach

**Frontend-only task addition** (no new IPC channel needed for the add itself).

- Adding without refinement: append Story directly into React state → `saveState` (debounced). No main process call.
- Adding with refinement: call new `refineStory` IPC → returns single `Story` → user can review/edit → append + save.

## Architecture

### New types (`libs/shared-types/src/ipc.ts`)

```ts
IpcChannels.RefineStory = 'zibby:refineStory'

RefineStoryRequest = {
  folderPath: string;
  title: string;
  description: string;
  model?: RefineModel;
}

RefineStoryResult =
  | { kind: 'ok'; story: Story }
  | { kind: 'error'; message: string }

// Added to IpcApi:
refineStory: (req: RefineStoryRequest) => Promise<RefineStoryResult>
```

### New lib function (`libs/ai-refiner/src/refine-story.ts`)

Single-story refinement. Reuses the existing `runClaudeCli` helper and `StorySchema` for validation.

**System prompt:** Senior technical PM role. Given a brief task description, produce exactly one well-scoped user story with 2–8 concrete, testable acceptance criteria and a best-effort list of affected files. Return structured output — no prose.

**Input:** repo context (same as `refine()`) + title + description.

**Output:** `Story` validated against `StorySchema`.

### Main process (`apps/desktop/src/main/index.ts`)

New handler for `IpcChannels.RefineStory` — calls `refineStory()`, wraps result in `{ kind: 'ok' | 'error' }`.

### Preload (`apps/desktop/src/preload/index.ts`)

Add `refineStory` bridge method to the `api` object.

### Renderer

#### `AddTaskDialog` (new component, inline in `App.tsx`)

Modal overlay. Fields:
- **Title** — `<input>` required, min 3 chars
- **Description / Brief** — `<textarea>` rows=5
- **Model** — `<select>` Haiku / Sonnet / Opus (default: Sonnet) — used for task *execution*, not for refine
- **Acceptance criteria preview** — read-only list, shown after successful Refine

Buttons:
- **Refine** — disabled until description filled; calls `refineStory` IPC; on success overwrites title + description with AI version and shows AC preview
- **Přidat task** — disabled until title + description filled; appends Story to plan; closes dialog
- **Zrušit** — closes dialog, discards state

Dialog states:
```
idle → [typing] → refining (spinner on Refine) → refined (AC preview shown)
                                                       ↓
                                              [user edits] → Add
```

#### `App.tsx` changes

- Remove `BriefSection` from main render (brief textarea + global Refine button are gone from the main screen)
- Add `showAddTask` state (boolean)
- Add `handleAddTask(story: Story)`:
  ```ts
  setPlan(cur =>
    cur
      ? { ...cur, stories: [...cur.stories, story] }
      : { stories: [story], dependencies: [] }
  );
  ```
- Show `AddTaskDialog` when `showAddTask === true`
- "+ Přidat task" button:
  - Appears as soon as a folder is selected (regardless of whether a plan exists)
  - In `PlanView` header next to "Run all" when plan exists
  - As a standalone CTA above an empty stories list when no plan exists yet

## Data flow

### Add without refinement
```
Dialog submit
  → App.handleAddTask({ title, description, acceptanceCriteria: [], affectedFiles: [], model })
  → setPlan(append)
  → saveState (debounced 500ms)
```

### Add with refinement
```
Dialog Refine click
  → window.zibby.refineStory({ folderPath, title, description, model })
  → main process → refineStory() → Story
  → form fields overwritten with AI result + AC preview shown
  → user reviews / edits title & description
  → Add click → App.handleAddTask(story) → setPlan(append) → saveState
```

## Edge Cases

| Situation | Handling |
|---|---|
| Refine fails (timeout / CLI error) | Error shown in dialog; form stays open with original input |
| First task added (no plan exists) | `handleAddTask` creates `{ stories: [story], dependencies: [] }` |
| Dialog opened during active run | Add allowed (appends to plan); Refine allowed; new task won't be part of the running batch |
| Title empty but description filled | Refine generates title from AI; without Refine user must fill title manually |
| Duplicate titles | Allowed — same as today |

## What Does NOT Change

- Orchestrator, DAG, `executeStory`, `runSingleStory` — no changes
- `StoryCard` edit mode (title, description, AC, affectedFiles, model override)
- RemoveStory flow
- Dependency management UI
- `refine()` (global brief → full plan) is removed from the main screen but the function stays in the lib (may be reintroduced later)
