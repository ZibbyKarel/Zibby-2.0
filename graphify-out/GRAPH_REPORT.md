# Graph Report - /Users/zibby/Workspace/Zibby-2.0  (2026-04-22)

## Corpus Check
- Corpus is ~14,044 words - fits in a single context window. You may not need a graph.

## Summary
- 427 nodes · 1475 edges · 31 communities detected
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Bundled JS Cluster A|Bundled JS Cluster A]]
- [[_COMMUNITY_Bundled JS Cluster B|Bundled JS Cluster B]]
- [[_COMMUNITY_Bundled JS Cluster C|Bundled JS Cluster C]]
- [[_COMMUNITY_Bundled JS Cluster D|Bundled JS Cluster D]]
- [[_COMMUNITY_Bundled JS Cluster E|Bundled JS Cluster E]]
- [[_COMMUNITY_Bundled JS Cluster F|Bundled JS Cluster F]]
- [[_COMMUNITY_Advise & App Handlers|Advise & App Handlers]]
- [[_COMMUNITY_Story Execution & GitPR|Story Execution & Git/PR]]
- [[_COMMUNITY_Bundled JS Cluster G|Bundled JS Cluster G]]
- [[_COMMUNITY_DAG Scheduler|DAG Scheduler]]
- [[_COMMUNITY_Electron Main Process|Electron Main Process]]
- [[_COMMUNITY_Claude Stream Parser|Claude Stream Parser]]
- [[_COMMUNITY_HTML Entry Points|HTML Entry Points]]
- [[_COMMUNITY_Desktop State Store|Desktop State Store]]
- [[_COMMUNITY_Vitest Config|Vitest Config]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Stream Parser Tests|Stream Parser Tests]]
- [[_COMMUNITY_Claude Runner Index|Claude Runner Index]]
- [[_COMMUNITY_Shared Schemas|Shared Schemas]]
- [[_COMMUNITY_Shared IPC Types|Shared IPC Types]]
- [[_COMMUNITY_Shared Types Index|Shared Types Index]]
- [[_COMMUNITY_AI Refiner|AI Refiner]]
- [[_COMMUNITY_Slug Tests|Slug Tests]]
- [[_COMMUNITY_DAG Tests|DAG Tests]]
- [[_COMMUNITY_Orchestrator Index|Orchestrator Index]]
- [[_COMMUNITY_Vite Main Config|Vite Main Config]]
- [[_COMMUNITY_Vite Preload Config|Vite Preload Config]]
- [[_COMMUNITY_Vite Renderer Config|Vite Renderer Config]]
- [[_COMMUNITY_Renderer Entry|Renderer Entry]]
- [[_COMMUNITY_Renderer Globals|Renderer Globals]]
- [[_COMMUNITY_Preload Script|Preload Script]]

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
- `handleRefine()` --calls--> `refine()`  [INFERRED]
  apps/desktop/src/renderer/App.tsx → libs/ai-refiner/src/refine.ts
- `handleAdvise()` --calls--> `advise()`  [INFERRED]
  apps/desktop/src/renderer/App.tsx → libs/ai-refiner/src/advise.ts
- `runClaudeInWorktree()` --calls--> `On()`  [INFERRED]
  libs/claude-runner/src/run.ts → apps/desktop/dist-renderer/assets/index-C7xtax59.js
- `executeStory()` --calls--> `gitPush()`  [INFERRED]
  libs/orchestrator/src/execute-story.ts → libs/github/src/index.ts
- `executeStory()` --calls--> `ghCreatePr()`  [INFERRED]
  libs/orchestrator/src/execute-story.ts → libs/github/src/index.ts

## Communities

### Community 0 - "Bundled JS Cluster A"
Cohesion: 0.06
Nodes (59): $a(), ad(), ap(), as(), cr(), dn(), dp(), dr() (+51 more)

### Community 1 - "Bundled JS Cluster B"
Cohesion: 0.07
Nodes (64): b(), Bo(), bs(), ce(), co(), cs(), da(), De() (+56 more)

### Community 2 - "Bundled JS Cluster C"
Cohesion: 0.1
Nodes (61): aa(), ac(), Ao(), bc(), bd(), be(), bi(), c() (+53 more)

### Community 3 - "Bundled JS Cluster D"
Cohesion: 0.11
Nodes (47): Al(), at(), bl(), cl(), di(), dl(), el(), en() (+39 more)

### Community 4 - "Bundled JS Cluster E"
Cohesion: 0.13
Nodes (41): $(), af(), an(), Bt(), cn(), df(), ef(), fd() (+33 more)

### Community 5 - "Bundled JS Cluster F"
Cohesion: 0.1
Nodes (39): Au(), bu(), cd(), cp(), ct(), Cu(), Eu(), Fr() (+31 more)

### Community 6 - "Advise & App Handlers"
Cohesion: 0.11
Nodes (14): advise(), jsonSchemaForReview(), renderPlanForPrompt(), runClaudeCli(), handleAdvise(), handleRefine(), jsonSchemaForPlan(), refine() (+6 more)

### Community 7 - "Story Execution & Git/PR"
Cohesion: 0.12
Nodes (16): buildPrBody(), buildPrompt(), executeStory(), On(), commitAllIfDirty(), ghCreatePr(), gitPush(), gitStatusIsClean() (+8 more)

### Community 8 - "Bundled JS Cluster G"
Cohesion: 0.31
Nodes (9): dd(), fs(), Fu(), ha(), Iu(), pu(), rc(), tc() (+1 more)

### Community 9 - "DAG Scheduler"
Cohesion: 0.33
Nodes (3): buildDag(), hasCycle(), safeBuildDag()

### Community 10 - "Electron Main Process"
Cohesion: 0.33
Nodes (0): 

### Community 11 - "Claude Stream Parser"
Cohesion: 0.6
Nodes (3): renderEvent(), summarizeToolInput(), truncate()

### Community 12 - "HTML Entry Points"
Cohesion: 0.5
Nodes (5): Built JS/CSS Assets Bundle, Built Renderer HTML (dist), Renderer Entry main.tsx, Root Mount Div (#root), Source Renderer HTML

### Community 13 - "Desktop State Store"
Cohesion: 0.83
Nodes (3): loadPersisted(), resolveFile(), savePersisted()

### Community 14 - "Vitest Config"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "ESLint Config"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Stream Parser Tests"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Claude Runner Index"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Shared Schemas"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Shared IPC Types"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Shared Types Index"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "AI Refiner"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Slug Tests"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "DAG Tests"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Orchestrator Index"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Vite Main Config"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Vite Preload Config"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Vite Renderer Config"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Renderer Entry"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Renderer Globals"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Preload Script"
Cohesion: 1.0
Nodes (0): 

## Knowledge Gaps
- **1 isolated node(s):** `Root Mount Div (#root)`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Vitest Config`** (1 nodes): `vitest.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ESLint Config`** (1 nodes): `eslint.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stream Parser Tests`** (1 nodes): `stream-parser.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Claude Runner Index`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Schemas`** (1 nodes): `schemas.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared IPC Types`** (1 nodes): `ipc.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Shared Types Index`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `AI Refiner`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Slug Tests`** (1 nodes): `slug.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `DAG Tests`** (1 nodes): `dag.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Orchestrator Index`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Main Config`** (1 nodes): `vite.main.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Preload Config`** (1 nodes): `vite.preload.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Renderer Config`** (1 nodes): `vite.renderer.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Renderer Entry`** (1 nodes): `main.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Renderer Globals`** (1 nodes): `global.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Preload Script`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `On()` connect `Story Execution & Git/PR` to `Bundled JS Cluster A`, `Bundled JS Cluster E`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **What connects `Root Mount Div (#root)` to the rest of the system?**
  _1 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Bundled JS Cluster A` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Bundled JS Cluster B` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Bundled JS Cluster C` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Bundled JS Cluster D` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Bundled JS Cluster E` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._