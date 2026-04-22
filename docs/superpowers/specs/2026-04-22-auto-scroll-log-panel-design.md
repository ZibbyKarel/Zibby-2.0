# Auto-scroll Log Panel Design

## Summary

Extract `LogTail` and `StoryCard` from the monolithic `App.tsx` into dedicated component files, and add auto-scroll behavior to the log panel that pauses when the user scrolls up and resumes when they return to the bottom.

## Architecture

### Files changed

| File | Change |
|------|--------|
| `apps/desktop/src/renderer/components/LogPanel.tsx` | New — extracted `LogTail`, renamed `LogPanel`, with auto-scroll |
| `apps/desktop/src/renderer/components/StoryCard.tsx` | New — extracted `StoryCard`, imports `LogPanel` |
| `apps/desktop/src/renderer/App.tsx` | Remove inline `StoryCard` and `LogTail`; export `StoryRuntime`; import from new files |

### Component responsibilities

**`LogPanel`** receives `logs: LogEntry[]` and manages everything internally:
- `expanded` boolean state (expand/collapse toggle)
- `atBottom` ref (not state) — true when scroll is within 10 px of bottom; avoids re-renders on scroll
- `scrollRef` on the `<pre>` container

**`StoryCard`** receives the same props as today; delegates log rendering to `LogPanel`.

## Auto-scroll logic

```
On mount:               atBottom = true
On logs change:         if (expanded && atBottom.current) → scrollToBottom()
On expanded → true:     scrollToBottom(); atBottom.current = true
On expanded → false:    no-op (AC #5)
On scroll:              distFromBottom = scrollHeight - scrollTop - clientHeight
                        atBottom.current = distFromBottom <= 10
```

## Acceptance criteria mapping

| AC | Implementation |
|----|----------------|
| 1. New lines scroll to bottom | `useEffect([logs])` scrolls when `atBottom.current` |
| 2. Manual scroll up pauses | `onScroll` sets `atBottom.current = false` when > 10 px from bottom |
| 3. Return to bottom resumes | `onScroll` sets `atBottom.current = true` when ≤ 10 px from bottom |
| 4. Opening panel jumps to bottom | `useEffect([expanded])` fires `scrollToBottom()` when `expanded` toggles true |
| 5. Collapsed panel — no scroll | All scroll effects gate on `expanded` |
| 6. lint + typecheck pass | Types preserved; `StoryRuntime` exported from App.tsx |

## Data flow

```
App (StoryRuntime) → StoryCard (logs prop) → LogPanel (LogEntry[])
```

`StoryRuntime` stays in `App.tsx` (exported). `LogEntry` is a local type in `LogPanel.tsx` matching the `logs` array element shape.

## No new dependencies

Standard React hooks only: `useRef`, `useEffect`, `useState`, `useMemo`.
