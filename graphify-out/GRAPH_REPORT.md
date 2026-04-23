# Graph Report - /Users/zibby/Workspace/Zibby-2.0/.worktrees/1-zobrazeni-usage  (2026-04-23)

## Corpus Check
- 44 files · ~76,303 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 460 nodes · 1501 edges · 38 communities detected
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.8)
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

## God Nodes (most connected - your core abstractions)
1. `S()` - 57 edges
2. `ic()` - 54 edges
3. `hc()` - 31 edges
4. `ec()` - 28 edges
5. `Z()` - 25 edges
6. `wd()` - 25 edges
7. `xc()` - 23 edges
8. `hu()` - 23 edges
9. `r()` - 22 edges
10. `pd()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `gitPush()` --calls--> `executeStory()`  [INFERRED]
  /Users/zibby/Workspace/Zibby-2.0/.worktrees/1-zobrazeni-usage/libs/github/src/index.ts → libs/orchestrator/src/execute-story.ts
- `ghCreatePr()` --calls--> `executeStory()`  [INFERRED]
  /Users/zibby/Workspace/Zibby-2.0/.worktrees/1-zobrazeni-usage/libs/github/src/index.ts → libs/orchestrator/src/execute-story.ts
- `runClaudeInWorktree()` --calls--> `On()`  [INFERRED]
  libs/claude-runner/src/run.ts → /Users/zibby/Workspace/Zibby-2.0/.worktrees/1-zobrazeni-usage/apps/desktop/dist-renderer/assets/index-D1uWPkwa.js
- `commitAllIfDirty()` --calls--> `executeStory()`  [INFERRED]
  /Users/zibby/Workspace/Zibby-2.0/.worktrees/1-zobrazeni-usage/libs/github/src/index.ts → libs/orchestrator/src/execute-story.ts
- `safeBuildDag()` --calls--> `buildDag()`  [INFERRED]
  libs/orchestrator/src/run-plan.ts → /Users/zibby/Workspace/Zibby-2.0/.worktrees/1-zobrazeni-usage/libs/orchestrator/src/dag.ts

## Communities

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (66): ad(), ap(), b(), ce(), cr(), cs(), De(), dn() (+58 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (65): aa(), ac(), Ao(), bc(), Bo(), ca(), cc(), co() (+57 more)

### Community 2 - "Community 2"
Cohesion: 0.1
Nodes (42): Au(), bd(), bu(), cd(), cp(), ct(), Cu(), ep() (+34 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (21): advise(), jsonSchemaForReview(), renderPlanForPrompt(), runClaudeCli(), handleAdvise(), parseClaudeOutput(), estimateTokens(), optimizeContext() (+13 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (39): $(), af(), an(), Bt(), cn(), df(), ef(), fd() (+31 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (39): Al(), at(), bl(), cl(), dl(), el(), en(), f() (+31 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (37): $a(), be(), bi(), c(), cf(), d(), dc(), Du() (+29 more)

### Community 7 - "Community 7"
Cohesion: 0.1
Nodes (31): as(), bs(), dd(), di(), es(), Fo(), fs(), Fu() (+23 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (16): buildPrBody(), buildPrompt(), executeStory(), commitAllIfDirty(), On(), ghCreatePr(), gitPush(), gitStatusIsClean() (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.25
Nodes (2): refreshUsage(), startUsagePolling()

### Community 10 - "Community 10"
Cohesion: 0.29
Nodes (3): buildDag(), hasCycle(), safeBuildDag()

### Community 11 - "Community 11"
Cohesion: 0.38
Nodes (4): fetchUsage(), parseUsageHeaders(), parseWindow(), toGetter()

### Community 12 - "Community 12"
Cohesion: 0.6
Nodes (3): renderEvent(), summarizeToolInput(), truncate()

### Community 13 - "Community 13"
Cohesion: 0.83
Nodes (3): loadPersisted(), resolveFile(), savePersisted()

### Community 14 - "Community 14"
Cohesion: 0.67
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 1.0
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

## Knowledge Gaps
- **Thin community `Community 15`** (2 nodes): `makeCtx()`, `context-optimizer.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (2 nodes): `makeStory()`, `dag.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (2 nodes): `runSingleStory()`, `runner.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (1 nodes): `vitest.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (1 nodes): `eslint.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (1 nodes): `stream-parser.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `schemas.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `ipc.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `parse-headers.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `slug.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `vite.main.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `vite.preload.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `vite.renderer.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `main.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `global.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `UsageBar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `StoryCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `On()` connect `Community 8` to `Community 0`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._