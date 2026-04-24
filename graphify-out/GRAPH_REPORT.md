# Graph Report - /Users/zibby/Workspace/Zibby-2.0/.worktrees/1-uprav-time-to-reset-v-limitech  (2026-04-24)

## Corpus Check
- 59 files · ~45,891 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 191 nodes · 244 edges · 51 communities detected
- Extraction: 86% EXTRACTED · 14% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]

## God Nodes (most connected - your core abstractions)
1. `executeStory()` - 19 edges
2. `taskDir()` - 9 edges
3. `initProject()` - 9 edges
4. `projectDir()` - 8 edges
5. `refine()` - 8 edges
6. `migrateLegacyIfNeeded()` - 8 edges
7. `advise()` - 7 edges
8. `assignTaskIds()` - 6 edges
9. `collectRepoContext()` - 6 edges
10. `attachWorktree()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `runClaudeInWorktree()` --calls--> `executeStory()`  [INFERRED]
  /Users/zibby/Workspace/Zibby-2.0/libs/claude-runner/src/run.ts → /Users/zibby/Workspace/Zibby-2.0/libs/orchestrator/src/execute-story.ts
- `slugify()` --calls--> `executeStory()`  [INFERRED]
  /Users/zibby/Workspace/Zibby-2.0/libs/shared-types/src/task-id.ts → /Users/zibby/Workspace/Zibby-2.0/libs/orchestrator/src/execute-story.ts
- `uniqueSlug()` --calls--> `executeStory()`  [INFERRED]
  /Users/zibby/Workspace/Zibby-2.0/libs/shared-types/src/task-id.ts → /Users/zibby/Workspace/Zibby-2.0/libs/orchestrator/src/execute-story.ts
- `assignTaskIds()` --calls--> `mergePlanOnReplan()`  [INFERRED]
  /Users/zibby/Workspace/Zibby-2.0/libs/shared-types/src/task-id.ts → /Users/zibby/Workspace/Zibby-2.0/libs/project-state/src/project-state.ts
- `assignTaskIds()` --calls--> `refine()`  [INFERRED]
  /Users/zibby/Workspace/Zibby-2.0/libs/shared-types/src/task-id.ts → /Users/zibby/Workspace/Zibby-2.0/libs/ai-refiner/src/refine.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.17
Nodes (24): appendJournalLine(), archiveDroppedTaskFolders(), emptyState(), enqueue(), ensureInnerGitignore(), ensureRootGitignore(), ensureTaskDir(), fileExists() (+16 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (14): isStoryActive(), key(), tryClaimStory(), buildPrBody(), buildPrompt(), executeStory(), extractPlanBlock(), startCommitPoller() (+6 more)

### Community 2 - "Community 2"
Cohesion: 0.2
Nodes (12): advise(), jsonSchemaForReview(), renderPlanForPrompt(), runClaudeCli(), parseClaudeOutput(), jsonSchemaForPlan(), refine(), buildTree() (+4 more)

### Community 3 - "Community 3"
Cohesion: 0.16
Nodes (6): persistStoryBranch(), persistStoryPr(), persistStoryStatus(), refreshUsage(), startUsagePolling(), updateTask()

### Community 4 - "Community 4"
Cohesion: 0.42
Nodes (7): attachWorktree(), buildCleanup(), createWorktree(), exists(), mirrorLocalAiSettings(), nextFreeName(), refExists()

### Community 5 - "Community 5"
Cohesion: 0.29
Nodes (3): buildDag(), hasCycle(), safeBuildDag()

### Community 6 - "Community 6"
Cohesion: 0.46
Nodes (7): runtimeToTasks(), loadUserData(), migrateLegacyIfNeeded(), readRaw(), resolveFile(), saveUserData(), writeRaw()

### Community 7 - "Community 7"
Cohesion: 0.38
Nodes (4): fetchUsage(), parseUsageHeaders(), parseWindow(), toGetter()

### Community 8 - "Community 8"
Cohesion: 0.48
Nodes (6): estimateTokens(), optimizeContext(), optimizeFile(), optimizePackageJson(), rawText(), truncateReadme()

### Community 9 - "Community 9"
Cohesion: 0.6
Nodes (4): assignTaskIds(), slugify(), taskIdForNewStory(), uniqueSlug()

### Community 10 - "Community 10"
Cohesion: 0.6
Nodes (3): renderEvent(), summarizeToolInput(), truncate()

### Community 11 - "Community 11"
Cohesion: 0.4
Nodes (0): 

### Community 12 - "Community 12"
Cohesion: 0.67
Nodes (0): 

### Community 13 - "Community 13"
Cohesion: 1.0
Nodes (2): installPostCommitHook(), isNightcoderHook()

### Community 14 - "Community 14"
Cohesion: 1.0
Nodes (2): applyUsage(), toViewUsage()

### Community 15 - "Community 15"
Cohesion: 0.67
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 0.67
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **Thin community `Community 17`** (2 nodes): `makeCtx()`, `context-optimizer.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `makeStory()`, `dag.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (2 nodes): `App()`, `App.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (2 nodes): `onKey()`, `CommandPalette.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (2 nodes): `onKey()`, `AddTaskDialog.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (2 nodes): `Column()`, `Column.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `vitest.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (1 nodes): `eslint.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `stream-parser.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `schemas.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `ipc.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `parse-headers.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `project-state.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `active-stories.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `slug.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `run-plan.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `slug.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `execute-story.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (1 nodes): `post-commit-hook.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (1 nodes): `vite.main.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (1 nodes): `vite.preload.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (1 nodes): `vite.renderer.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (1 nodes): `main.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (1 nodes): `global.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (1 nodes): `Toasts.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (1 nodes): `TaskCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `primitives.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `executeStory()` connect `Community 1` to `Community 0`, `Community 9`, `Community 4`, `Community 13`?**
  _High betweenness centrality (0.183) - this node is a cross-community bridge._
- **Why does `assignTaskIds()` connect `Community 9` to `Community 0`, `Community 2`, `Community 6`?**
  _High betweenness centrality (0.142) - this node is a cross-community bridge._
- **Why does `refine()` connect `Community 2` to `Community 8`, `Community 9`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **Are the 14 inferred relationships involving `executeStory()` (e.g. with `slugify()` and `tryClaimStory()`) actually correct?**
  _`executeStory()` has 14 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `refine()` (e.g. with `collectRepoContext()` and `renderContextForPrompt()`) actually correct?**
  _`refine()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._