# Agent Orchestration App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local web app in Docker where a user submits an overnight coding task, it auto-decomposes into subtasks, each runs a parallel Claude Code agent on a git worktree, and on success opens a GitHub PR per subtask.

**Architecture:** NestJS API orchestrates a queue of Claude Code subprocesses (`claude -p --output-format stream-json`), each isolated in a `git worktree`. Decomposition uses `@anthropic-ai/sdk` directly (structured output). React/Vite frontend shows live log streaming via SSE. State stored in SQLite via Prisma.

**Tech Stack:** TypeScript, Nx monorepo, pnpm, NestJS, React + Vite, Tailwind, TanStack Query v5, Prisma + SQLite, zod, @anthropic-ai/sdk, Claude Code CLI, gh CLI, Docker

---

## File Map

```
Zibby-2.0/
├── apps/
│   ├── api/src/
│   │   ├── main.ts                              NestJS bootstrap, Prisma WAL mode
│   │   ├── app.module.ts                        Root module
│   │   └── modules/
│   │       ├── db/db.module.ts                  PrismaService DI provider
│   │       ├── sse/sse.service.ts               EventEmitter2 → SSE broadcast
│   │       ├── jobs/jobs.controller.ts          POST /api/jobs, GET /api/jobs, GET /api/jobs/:id/stream
│   │       ├── jobs/jobs.service.ts             Job CRUD + trigger decompose + enqueue
│   │       ├── subtasks/subtasks.controller.ts  GET /api/subtasks/:id, GET /api/subtasks/:id/stream
│   │       ├── subtasks/subtasks.service.ts     Subtask CRUD, status transitions
│   │       ├── decomposer/decomposer.service.ts Anthropic SDK → structured subtasks
│   │       ├── decomposer/decomposer.prompt.ts  Prompt template constants
│   │       ├── orchestrator/orchestrator.service.ts Queue + semaphore + rehydrate on boot
│   │       ├── runners/runners.service.ts       Adapter: libs/runner ↔ DB + SSE
│   │       └── github/github.service.ts         git push + gh pr create
│   └── web/src/
│       ├── main.tsx
│       ├── App.tsx                              URL-param routing (?jobId=)
│       ├── components/StatusBadge.tsx
│       ├── components/JobForm.tsx
│       ├── components/JobList.tsx
│       ├── components/JobCard.tsx
│       ├── components/SubtaskGrid.tsx
│       ├── components/SubtaskCard.tsx
│       ├── components/LogTail.tsx
│       ├── hooks/useJobs.ts                     TanStack Query: job list polling
│       ├── hooks/useJob.ts                      TanStack Query: single job
│       ├── hooks/useSubtaskStream.ts            EventSource hook for SSE log tail
│       └── api/client.ts                        fetch wrapper with base URL
├── libs/
│   ├── shared-types/src/
│   │   ├── index.ts
│   │   ├── enums.ts                             JobStatus, SubtaskStatus, LogStream enums
│   │   └── schemas.ts                           zod schemas + inferred TS types for all API shapes
│   ├── db/
│   │   ├── prisma/schema.prisma                 Job, Subtask, SubtaskLog models
│   │   └── src/index.ts                         re-exports PrismaClient, generated types
│   ├── orchestration/src/lib/
│   │   ├── types.ts                             JobStatus, SubtaskStatus (re-exported from shared-types)
│   │   ├── state-machine.ts                     isValidTransition(from, to) + allowed transitions map
│   │   └── queue.ts                             AsyncQueue<T> with concurrency semaphore
│   └── runner/src/lib/
│       ├── types.ts                             RunnerConfig, RunnerEvent union
│       ├── worktree.ts                          addWorktree(), removeWorktree(), hasNewCommits()
│       ├── prompt-builder.ts                    buildSubtaskPrompt(subtask)
│       └── claude-runner.ts                     runSubtask(): AsyncIterable<RunnerEvent>
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## Phase 1 — Foundation

### Task 1: Nx Workspace Scaffold

**Files:**
- Create: `nx.json`, `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`
- Create: `apps/api/` (NestJS skeleton)
- Create: `apps/web/` (React+Vite skeleton)

- [ ] **Step 1: Initialize Nx workspace**

```bash
cd /Users/zibby/Workspace
# create-nx-workspace will merge into existing dir (only has CLAUDE.md + .git)
npx create-nx-workspace@latest "Zibby-2.0" \
  --preset=ts \
  --packageManager=pnpm \
  --no-nxCloud \
  --no-interactive
cd Zibby-2.0
```

If prompted about existing directory, confirm to proceed. CLAUDE.md is preserved.

- [ ] **Step 2: Install Nx plugins**

```bash
pnpm add -D @nx/nest @nx/react @nx/vite @nx/js @nx/node vitest
```

- [ ] **Step 3: Generate NestJS app**

```bash
npx nx g @nx/nest:app api --directory=apps/api --no-interactive
```

- [ ] **Step 4: Generate React+Vite app**

```bash
npx nx g @nx/react:app web --directory=apps/web --bundler=vite --style=none --no-interactive
```

- [ ] **Step 5: Generate libs**

```bash
npx nx g @nx/js:lib shared-types --directory=libs/shared-types --bundler=swc --unitTestRunner=jest --no-interactive
npx nx g @nx/js:lib db --directory=libs/db --bundler=swc --unitTestRunner=jest --no-interactive
npx nx g @nx/js:lib orchestration --directory=libs/orchestration --bundler=swc --unitTestRunner=jest --no-interactive
npx nx g @nx/js:lib runner --directory=libs/runner --bundler=swc --unitTestRunner=jest --no-interactive
```

- [ ] **Step 6: Install shared runtime deps**

```bash
pnpm add @nestjs/common @nestjs/core @nestjs/platform-express @nestjs/event-emitter \
  @anthropic-ai/sdk @prisma/client zod \
  @tanstack/react-query react react-dom

pnpm add -D prisma tailwindcss postcss autoprefixer \
  @types/node @types/react @types/react-dom
```

- [ ] **Step 7: Verify workspace builds**

```bash
npx nx run-many --target=build --all --skip-nx-cache
```

Expected: all apps + libs build without errors (empty stubs).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: initialize Nx workspace with NestJS API and React/Vite web app"
```

---

### Task 2: Prisma Schema + DB Lib

**Files:**
- Create: `libs/db/prisma/schema.prisma`
- Modify: `libs/db/src/index.ts`

- [ ] **Step 1: Initialize Prisma in db lib**

```bash
cd libs/db
npx prisma init --datasource-provider sqlite
```

Move the generated `prisma/` folder to `libs/db/prisma/` if it landed elsewhere:
```bash
mkdir -p libs/db/prisma
mv prisma/schema.prisma libs/db/prisma/schema.prisma 2>/dev/null || true
```

- [ ] **Step 2: Write the schema**

`libs/db/prisma/schema.prisma`:
```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../../../node_modules/.prisma/client"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Job {
  id         String    @id @default(cuid())
  prompt     String
  status     String    @default("PENDING")
  error      String?
  createdAt  DateTime  @default(now())
  finishedAt DateTime?
  subtasks   Subtask[]
}

model Subtask {
  id                 String       @id @default(cuid())
  jobId              String
  order              Int
  title              String
  spec               String
  acceptanceCriteria String       // JSON-encoded string[]
  status             String       @default("QUEUED")
  branch             String?
  prUrl              String?
  error              String?
  createdAt          DateTime     @default(now())
  startedAt          DateTime?
  finishedAt         DateTime?
  job                Job          @relation(fields: [jobId], references: [id], onDelete: Cascade)
  logs               SubtaskLog[]

  @@index([jobId])
}

model SubtaskLog {
  id        String   @id @default(cuid())
  subtaskId String
  ts        DateTime @default(now())
  stream    String   @default("STDOUT") // STDOUT | STDERR | SYSTEM
  line      String
  subtask   Subtask  @relation(fields: [subtaskId], references: [id], onDelete: Cascade)

  @@index([subtaskId, ts])
}
```

- [ ] **Step 3: Add DATABASE_URL to .env.example**

```bash
cat > .env.example << 'EOF'
DATABASE_URL="file:/data/db.sqlite"
ANTHROPIC_API_KEY="sk-ant-..."
GITHUB_TOKEN="ghp_..."
MAX_PARALLEL_RUNNERS=3
CLAUDE_MODEL="claude-sonnet-4-6"
MAX_TURNS=300
BASE_BRANCH="main"
REPO_PATH="/workspace"
EOF

cp .env.example .env
# Edit .env with real values for local dev:
# DATABASE_URL="file:./dev.sqlite"
```

- [ ] **Step 4: Run migration**

```bash
DATABASE_URL="file:./dev.sqlite" npx prisma migrate dev --name init --schema=libs/db/prisma/schema.prisma
```

Expected: migration created, `dev.sqlite` created.

- [ ] **Step 5: Generate Prisma client**

```bash
DATABASE_URL="file:./dev.sqlite" npx prisma generate --schema=libs/db/prisma/schema.prisma
```

- [ ] **Step 6: Write db lib index**

`libs/db/src/index.ts`:
```typescript
export { PrismaClient } from '@prisma/client';
export type { Job, Subtask, SubtaskLog, Prisma } from '@prisma/client';
```

- [ ] **Step 7: Add Prisma script to package.json**

In root `package.json`, add:
```json
{
  "scripts": {
    "db:migrate": "DATABASE_URL=file:./dev.sqlite prisma migrate dev --schema=libs/db/prisma/schema.prisma",
    "db:generate": "prisma generate --schema=libs/db/prisma/schema.prisma"
  }
}
```

- [ ] **Step 8: Commit**

```bash
git add libs/db .env.example
git commit -m "feat: add Prisma schema with Job, Subtask, SubtaskLog models"
```

---

### Task 3: Shared Types (zod schemas)

**Files:**
- Create: `libs/shared-types/src/enums.ts`
- Create: `libs/shared-types/src/schemas.ts`
- Modify: `libs/shared-types/src/index.ts`
- Test: `libs/shared-types/src/lib/shared-types.spec.ts`

- [ ] **Step 1: Write the failing test**

`libs/shared-types/src/lib/shared-types.spec.ts`:
```typescript
import {
  JobStatus, SubtaskStatus, LogStream,
  CreateJobSchema, JobSchema, SubtaskSchema, SubtaskLogSchema,
  DecomposerOutputSchema,
} from '../index';

describe('shared-types', () => {
  it('JobStatus enum has expected values', () => {
    expect(JobStatus.PENDING).toBe('PENDING');
    expect(JobStatus.DECOMPOSING).toBe('DECOMPOSING');
    expect(JobStatus.RUNNING).toBe('RUNNING');
    expect(JobStatus.COMPLETED).toBe('COMPLETED');
    expect(JobStatus.PARTIALLY_COMPLETED).toBe('PARTIALLY_COMPLETED');
    expect(JobStatus.FAILED).toBe('FAILED');
  });

  it('SubtaskStatus enum has expected values', () => {
    expect(SubtaskStatus.QUEUED).toBe('QUEUED');
    expect(SubtaskStatus.RUNNING).toBe('RUNNING');
    expect(SubtaskStatus.PUSHING).toBe('PUSHING');
    expect(SubtaskStatus.PR_CREATED).toBe('PR_CREATED');
    expect(SubtaskStatus.FAILED).toBe('FAILED');
  });

  it('CreateJobSchema validates a valid payload', () => {
    const result = CreateJobSchema.safeParse({ prompt: 'Add dark mode' });
    expect(result.success).toBe(true);
  });

  it('CreateJobSchema rejects empty prompt', () => {
    const result = CreateJobSchema.safeParse({ prompt: '' });
    expect(result.success).toBe(false);
  });

  it('DecomposerOutputSchema validates subtask list', () => {
    const result = DecomposerOutputSchema.safeParse({
      subtasks: [
        {
          order: 1,
          title: 'Implement toggle button',
          spec: 'Add a DarkModeToggle component...',
          acceptanceCriteria: ['Toggle changes body class', 'State persists in localStorage'],
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('DecomposerOutputSchema rejects empty acceptanceCriteria', () => {
    const result = DecomposerOutputSchema.safeParse({
      subtasks: [{ order: 1, title: 'T', spec: 'S', acceptanceCriteria: [] }],
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx nx test shared-types --testFile=src/lib/shared-types.spec.ts
```

Expected: FAIL (imports not found).

- [ ] **Step 3: Write enums**

`libs/shared-types/src/enums.ts`:
```typescript
export const JobStatus = {
  PENDING: 'PENDING',
  DECOMPOSING: 'DECOMPOSING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  PARTIALLY_COMPLETED: 'PARTIALLY_COMPLETED',
  FAILED: 'FAILED',
} as const;
export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const SubtaskStatus = {
  QUEUED: 'QUEUED',
  RUNNING: 'RUNNING',
  PUSHING: 'PUSHING',
  PR_CREATED: 'PR_CREATED',
  FAILED: 'FAILED',
} as const;
export type SubtaskStatus = (typeof SubtaskStatus)[keyof typeof SubtaskStatus];

export const LogStream = {
  STDOUT: 'STDOUT',
  STDERR: 'STDERR',
  SYSTEM: 'SYSTEM',
} as const;
export type LogStream = (typeof LogStream)[keyof typeof LogStream];
```

- [ ] **Step 4: Write zod schemas**

`libs/shared-types/src/schemas.ts`:
```typescript
import { z } from 'zod';

export const CreateJobSchema = z.object({
  prompt: z.string().min(1, 'Prompt must not be empty'),
});
export type CreateJobDto = z.infer<typeof CreateJobSchema>;

export const SubtaskSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  order: z.number(),
  title: z.string(),
  spec: z.string(),
  acceptanceCriteria: z.array(z.string()),
  status: z.string(),
  branch: z.string().nullable(),
  prUrl: z.string().nullable(),
  error: z.string().nullable(),
  createdAt: z.string(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
});
export type SubtaskDto = z.infer<typeof SubtaskSchema>;

export const JobSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  status: z.string(),
  error: z.string().nullable(),
  createdAt: z.string(),
  finishedAt: z.string().nullable(),
  subtasks: z.array(SubtaskSchema).optional(),
});
export type JobDto = z.infer<typeof JobSchema>;

export const SubtaskLogSchema = z.object({
  id: z.string(),
  subtaskId: z.string(),
  ts: z.string(),
  stream: z.string(),
  line: z.string(),
});
export type SubtaskLogDto = z.infer<typeof SubtaskLogSchema>;

// Used by decomposer service to validate Anthropic API response
export const DecomposerSubtaskSchema = z.object({
  order: z.number().int().positive(),
  title: z.string().min(1),
  spec: z.string().min(1),
  acceptanceCriteria: z.array(z.string().min(1)).min(1, 'At least one acceptance criterion required'),
});

export const DecomposerOutputSchema = z.object({
  subtasks: z.array(DecomposerSubtaskSchema).min(1).max(10),
});
export type DecomposerOutput = z.infer<typeof DecomposerOutputSchema>;
```

- [ ] **Step 5: Update index**

`libs/shared-types/src/index.ts`:
```typescript
export * from './enums';
export * from './schemas';
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
npx nx test shared-types
```

Expected: all 6 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add libs/shared-types
git commit -m "feat: add shared-types enums and zod schemas"
```

---

### Task 4: libs/orchestration — State Machine + Queue

**Files:**
- Create: `libs/orchestration/src/lib/types.ts`
- Create: `libs/orchestration/src/lib/state-machine.ts`
- Create: `libs/orchestration/src/lib/queue.ts`
- Modify: `libs/orchestration/src/index.ts`
- Test: `libs/orchestration/src/lib/state-machine.spec.ts`
- Test: `libs/orchestration/src/lib/queue.spec.ts`

- [ ] **Step 1: Write failing state machine tests**

`libs/orchestration/src/lib/state-machine.spec.ts`:
```typescript
import { isValidJobTransition, isValidSubtaskTransition } from './state-machine';

describe('Job state machine', () => {
  it('allows PENDING → DECOMPOSING', () => {
    expect(isValidJobTransition('PENDING', 'DECOMPOSING')).toBe(true);
  });
  it('allows DECOMPOSING → RUNNING', () => {
    expect(isValidJobTransition('DECOMPOSING', 'RUNNING')).toBe(true);
  });
  it('allows RUNNING → COMPLETED', () => {
    expect(isValidJobTransition('RUNNING', 'COMPLETED')).toBe(true);
  });
  it('allows RUNNING → PARTIALLY_COMPLETED', () => {
    expect(isValidJobTransition('RUNNING', 'PARTIALLY_COMPLETED')).toBe(true);
  });
  it('allows RUNNING → FAILED', () => {
    expect(isValidJobTransition('RUNNING', 'FAILED')).toBe(true);
  });
  it('allows DECOMPOSING → FAILED', () => {
    expect(isValidJobTransition('DECOMPOSING', 'FAILED')).toBe(true);
  });
  it('rejects COMPLETED → RUNNING', () => {
    expect(isValidJobTransition('COMPLETED', 'RUNNING')).toBe(false);
  });
  it('rejects PENDING → COMPLETED', () => {
    expect(isValidJobTransition('PENDING', 'COMPLETED')).toBe(false);
  });
});

describe('Subtask state machine', () => {
  it('allows QUEUED → RUNNING', () => {
    expect(isValidSubtaskTransition('QUEUED', 'RUNNING')).toBe(true);
  });
  it('allows RUNNING → PUSHING', () => {
    expect(isValidSubtaskTransition('RUNNING', 'PUSHING')).toBe(true);
  });
  it('allows PUSHING → PR_CREATED', () => {
    expect(isValidSubtaskTransition('PUSHING', 'PR_CREATED')).toBe(true);
  });
  it('allows RUNNING → FAILED', () => {
    expect(isValidSubtaskTransition('RUNNING', 'FAILED')).toBe(true);
  });
  it('allows PUSHING → FAILED', () => {
    expect(isValidSubtaskTransition('PUSHING', 'FAILED')).toBe(true);
  });
  it('rejects PR_CREATED → RUNNING', () => {
    expect(isValidSubtaskTransition('PR_CREATED', 'RUNNING')).toBe(false);
  });
});
```

- [ ] **Step 2: Write failing queue tests**

`libs/orchestration/src/lib/queue.spec.ts`:
```typescript
import { AsyncQueue } from './queue';

describe('AsyncQueue', () => {
  it('processes items up to concurrency limit in parallel', async () => {
    const queue = new AsyncQueue<number>(2);
    const running: number[] = [];
    const maxConcurrent: number[] = [];

    const process = async (n: number) => {
      running.push(n);
      maxConcurrent.push(running.length);
      await new Promise((r) => setTimeout(r, 10));
      running.splice(running.indexOf(n), 1);
    };

    await Promise.all([1, 2, 3, 4].map((n) => queue.add(() => process(n))));

    expect(Math.max(...maxConcurrent)).toBeLessThanOrEqual(2);
  });

  it('resolves all items even if some throw', async () => {
    const queue = new AsyncQueue<void>(2);
    const results: ('ok' | 'err')[] = [];

    await Promise.allSettled([
      queue.add(async () => { results.push('ok'); }),
      queue.add(async () => { throw new Error('fail'); }).catch(() => { results.push('err'); }),
      queue.add(async () => { results.push('ok'); }),
    ]);

    expect(results.filter(r => r === 'ok').length).toBe(2);
    expect(results.filter(r => r === 'err').length).toBe(1);
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
npx nx test orchestration
```

Expected: FAIL (modules not found).

- [ ] **Step 4: Implement types.ts**

`libs/orchestration/src/lib/types.ts`:
```typescript
// Re-export from shared-types so orchestration logic stays decoupled from the lib
export { JobStatus, SubtaskStatus } from '@zibby-2-0/shared-types';
export type { JobStatus as JobStatusType, SubtaskStatus as SubtaskStatusType } from '@zibby-2-0/shared-types';
```

Note: verify the Nx library import alias with `cat libs/shared-types/project.json | grep name`. The alias is typically `@<workspace-name>/<lib-name>`.

- [ ] **Step 5: Implement state-machine.ts**

`libs/orchestration/src/lib/state-machine.ts`:
```typescript
type Transitions = Record<string, string[]>;

const JOB_TRANSITIONS: Transitions = {
  PENDING: ['DECOMPOSING'],
  DECOMPOSING: ['RUNNING', 'FAILED'],
  RUNNING: ['COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED'],
};

const SUBTASK_TRANSITIONS: Transitions = {
  QUEUED: ['RUNNING', 'FAILED'],
  RUNNING: ['PUSHING', 'FAILED'],
  PUSHING: ['PR_CREATED', 'FAILED'],
};

export function isValidJobTransition(from: string, to: string): boolean {
  return JOB_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isValidSubtaskTransition(from: string, to: string): boolean {
  return SUBTASK_TRANSITIONS[from]?.includes(to) ?? false;
}
```

- [ ] **Step 6: Implement queue.ts**

`libs/orchestration/src/lib/queue.ts`:
```typescript
export class AsyncQueue<T> {
  private running = 0;
  private waiters: (() => void)[] = [];

  constructor(private readonly concurrency: number) {}

  async add<R>(task: () => Promise<R>): Promise<R> {
    await this.acquire();
    try {
      return await task();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.running < this.concurrency) {
      this.running++;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.waiters.push(() => {
        this.running++;
        resolve();
      });
    });
  }

  private release(): void {
    this.running--;
    const next = this.waiters.shift();
    if (next) next();
  }

  get activeCount(): number {
    return this.running;
  }

  get pendingCount(): number {
    return this.waiters.length;
  }
}
```

- [ ] **Step 7: Update index**

`libs/orchestration/src/index.ts`:
```typescript
export { isValidJobTransition, isValidSubtaskTransition } from './lib/state-machine';
export { AsyncQueue } from './lib/queue';
export { JobStatus, SubtaskStatus } from './lib/types';
```

- [ ] **Step 8: Run tests to confirm they pass**

```bash
npx nx test orchestration
```

Expected: all 12 tests PASS.

- [ ] **Step 9: Commit**

```bash
git add libs/orchestration
git commit -m "feat: implement state machine and async concurrency queue"
```

---

## Phase 2 — Runner Library

### Task 5: libs/runner — Types + Worktree Helpers

**Files:**
- Create: `libs/runner/src/lib/types.ts`
- Create: `libs/runner/src/lib/worktree.ts`
- Test: `libs/runner/src/lib/worktree.spec.ts`

- [ ] **Step 1: Write failing worktree tests**

`libs/runner/src/lib/worktree.spec.ts`:
```typescript
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { addWorktree, removeWorktree, hasNewCommits } from './worktree';

describe('worktree helpers', () => {
  let repoPath: string;

  beforeAll(() => {
    // Create a temp git repo to test against
    repoPath = fs.mkdtempSync(path.join(os.tmpdir(), 'orch-test-'));
    execSync('git init', { cwd: repoPath });
    execSync('git config user.email "test@test.com"', { cwd: repoPath });
    execSync('git config user.name "Test"', { cwd: repoPath });
    execSync('echo "init" > README.md && git add . && git commit -m "init"', {
      cwd: repoPath,
      shell: '/bin/sh',
    });
  });

  afterAll(() => {
    fs.rmSync(repoPath, { recursive: true, force: true });
  });

  it('addWorktree creates a worktree directory with a new branch', async () => {
    const worktreePath = path.join(repoPath, '.worktrees', 'test-wt');
    await addWorktree(repoPath, worktreePath, 'task/test-wt');
    expect(fs.existsSync(worktreePath)).toBe(true);
    // cleanup
    await removeWorktree(repoPath, worktreePath);
  });

  it('removeWorktree removes the directory and deregisters the worktree', async () => {
    const worktreePath = path.join(repoPath, '.worktrees', 'test-wt2');
    await addWorktree(repoPath, worktreePath, 'task/test-wt2');
    await removeWorktree(repoPath, worktreePath);
    expect(fs.existsSync(worktreePath)).toBe(false);
  });

  it('hasNewCommits returns false when no commits beyond base branch', async () => {
    const worktreePath = path.join(repoPath, '.worktrees', 'test-wt3');
    await addWorktree(repoPath, worktreePath, 'task/test-wt3');
    const result = await hasNewCommits(worktreePath, 'main');
    expect(result).toBe(false);
    await removeWorktree(repoPath, worktreePath);
  });

  it('hasNewCommits returns true after committing in the worktree', async () => {
    const worktreePath = path.join(repoPath, '.worktrees', 'test-wt4');
    await addWorktree(repoPath, worktreePath, 'task/test-wt4');
    execSync('echo "change" >> README.md && git add . && git commit -m "add change"', {
      cwd: worktreePath,
      shell: '/bin/sh',
    });
    const result = await hasNewCommits(worktreePath, 'main');
    expect(result).toBe(true);
    await removeWorktree(repoPath, worktreePath);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx nx test runner --testFile=src/lib/worktree.spec.ts
```

Expected: FAIL (modules not found).

- [ ] **Step 3: Implement types.ts**

`libs/runner/src/lib/types.ts`:
```typescript
export interface RunnerConfig {
  repoPath: string;       // absolute path to the mounted repo root
  maxTurns: number;       // --max-turns for claude
  model: string;          // --model for claude
  baseBranch: string;     // e.g. "main", used to detect new commits
}

export type RunnerEvent =
  | { type: 'log'; stream: 'STDOUT' | 'STDERR'; line: string }
  | { type: 'system'; message: string }
  | { type: 'result_success'; summary: string }
  | { type: 'result_error'; error: string };
```

- [ ] **Step 4: Implement worktree.ts**

`libs/runner/src/lib/worktree.ts`:
```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function addWorktree(
  repoPath: string,
  worktreePath: string,
  branch: string,
): Promise<void> {
  await execAsync(`git worktree add "${worktreePath}" -b "${branch}"`, { cwd: repoPath });
}

export async function removeWorktree(
  repoPath: string,
  worktreePath: string,
): Promise<void> {
  // --force handles case where branch has uncommitted changes or no commits
  await execAsync(`git worktree remove --force "${worktreePath}"`, { cwd: repoPath });
  // Prune stale worktree entries
  await execAsync('git worktree prune', { cwd: repoPath }).catch(() => void 0);
}

export async function hasNewCommits(
  worktreePath: string,
  baseBranch: string,
): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `git log --oneline "origin/${baseBranch}..HEAD" 2>/dev/null || git log --oneline "${baseBranch}..HEAD"`,
      { cwd: worktreePath, shell: '/bin/sh' },
    );
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx nx test runner --testFile=src/lib/worktree.spec.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add libs/runner/src/lib/types.ts libs/runner/src/lib/worktree.ts libs/runner/src/lib/worktree.spec.ts
git commit -m "feat: add runner types and git worktree helpers"
```

---

### Task 6: libs/runner — Claude Subprocess + Stream Parser

**Files:**
- Create: `libs/runner/src/lib/prompt-builder.ts`
- Create: `libs/runner/src/lib/claude-runner.ts`
- Test: `libs/runner/src/lib/claude-runner.spec.ts`

- [ ] **Step 1: Write failing tests for the runner**

`libs/runner/src/lib/claude-runner.spec.ts`:
```typescript
import { collectEvents, detectSuccess } from './claude-runner';

// Unit-test the pure helper functions without spawning a real process

describe('detectSuccess', () => {
  it('returns true when exit code 0, result success, and has new commits', () => {
    expect(detectSuccess({ exitCode: 0, resultSubtype: 'success', hasCommits: true })).toBe(true);
  });
  it('returns false when exit code non-zero', () => {
    expect(detectSuccess({ exitCode: 1, resultSubtype: 'success', hasCommits: true })).toBe(false);
  });
  it('returns false when resultSubtype is error', () => {
    expect(detectSuccess({ exitCode: 0, resultSubtype: 'error', hasCommits: true })).toBe(false);
  });
  it('returns false when no new commits', () => {
    expect(detectSuccess({ exitCode: 0, resultSubtype: 'success', hasCommits: false })).toBe(false);
  });
});

describe('parseStreamLine', () => {
  it('parses assistant message turn', async () => {
    const { parseStreamLine } = await import('./claude-runner');
    const line = JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: 'Working...' }] } });
    const event = parseStreamLine(line);
    expect(event?.type).toBe('log');
  });
  it('parses result success', async () => {
    const { parseStreamLine } = await import('./claude-runner');
    const line = JSON.stringify({ type: 'result', subtype: 'success', result: 'Done' });
    const event = parseStreamLine(line);
    expect(event?.type).toBe('result_success');
  });
  it('parses result error', async () => {
    const { parseStreamLine } = await import('./claude-runner');
    const line = JSON.stringify({ type: 'result', subtype: 'error', error: 'Max turns reached' });
    const event = parseStreamLine(line);
    expect(event?.type).toBe('result_error');
  });
  it('returns null for unrecognized line', async () => {
    const { parseStreamLine } = await import('./claude-runner');
    const event = parseStreamLine('not json');
    expect(event).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx nx test runner --testFile=src/lib/claude-runner.spec.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement prompt-builder.ts**

`libs/runner/src/lib/prompt-builder.ts`:
```typescript
interface SubtaskForPrompt {
  title: string;
  spec: string;
  acceptanceCriteria: string; // JSON-encoded string[]
}

export function buildSubtaskPrompt(subtask: SubtaskForPrompt): string {
  let criteria: string[];
  try {
    criteria = JSON.parse(subtask.acceptanceCriteria) as string[];
  } catch {
    criteria = [subtask.acceptanceCriteria];
  }

  const criteriaList = criteria.map((c, i) => `${i + 1}. ${c}`).join('\n');

  return `You are an expert software engineer implementing the following task.

## Task: ${subtask.title}

## Specification
${subtask.spec}

## Acceptance Criteria
${criteriaList}

## Instructions
- Implement the task fully according to the specification and acceptance criteria above.
- Run the project's tests, linter, and type checker as you go and fix any issues.
- When you are satisfied that all acceptance criteria are met and tests pass, commit your changes with a descriptive commit message.
- Do NOT push the branch or create a pull request — the orchestrator will do that.
- If you cannot complete the task, explain why clearly in your response and exit WITHOUT committing.
- Do not modify files unrelated to this task.`;
}
```

- [ ] **Step 4: Implement claude-runner.ts**

`libs/runner/src/lib/claude-runner.ts`:
```typescript
import { spawn } from 'child_process';
import type { RunnerConfig, RunnerEvent } from './types';
import { hasNewCommits } from './worktree';

export interface SuccessCheckInput {
  exitCode: number;
  resultSubtype: string | null;
  hasCommits: boolean;
}

export function detectSuccess(input: SuccessCheckInput): boolean {
  return input.exitCode === 0 && input.resultSubtype === 'success' && input.hasCommits;
}

export function parseStreamLine(line: string): RunnerEvent | null {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(line) as Record<string, unknown>;
  } catch {
    return null;
  }

  const type = parsed['type'] as string;

  if (type === 'assistant') {
    // Emit the raw JSON line so the consumer can store it verbatim
    return { type: 'log', stream: 'STDOUT', line };
  }

  if (type === 'result') {
    const subtype = parsed['subtype'] as string;
    if (subtype === 'success') {
      return { type: 'result_success', summary: (parsed['result'] as string) ?? '' };
    }
    return { type: 'result_error', error: (parsed['error'] as string) ?? 'Unknown error' };
  }

  if (type === 'system' || type === 'user') {
    return { type: 'log', stream: 'STDOUT', line };
  }

  return null;
}

export interface RunSubtaskOptions {
  worktreePath: string;
  prompt: string;
  config: RunnerConfig;
}

export async function* runSubtask(
  opts: RunSubtaskOptions,
): AsyncGenerator<RunnerEvent> {
  const { worktreePath, prompt, config } = opts;

  const args = [
    '-p', prompt,
    '--output-format', 'stream-json',
    '--include-partial-messages',
    '--max-turns', String(config.maxTurns),
    '--model', config.model,
    '--permission-mode', 'bypassPermissions',
  ];

  yield { type: 'system', message: `Spawning claude with --max-turns ${config.maxTurns}` };

  const proc = spawn('claude', args, {
    cwd: worktreePath,
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let resultSubtype: string | null = null;
  let resultSummary = '';

  // Buffer for incomplete lines
  let stdoutBuf = '';
  let stderrBuf = '';

  for await (const chunk of proc.stdout) {
    stdoutBuf += (chunk as Buffer).toString('utf8');
    const lines = stdoutBuf.split('\n');
    stdoutBuf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      const event = parseStreamLine(line);
      if (event) {
        if (event.type === 'result_success') {
          resultSubtype = 'success';
          resultSummary = event.summary;
        } else if (event.type === 'result_error') {
          resultSubtype = 'error';
        }
        yield event;
      } else {
        yield { type: 'log', stream: 'STDOUT', line };
      }
    }
  }

  for await (const chunk of proc.stderr) {
    stderrBuf += (chunk as Buffer).toString('utf8');
    const lines = stderrBuf.split('\n');
    stderrBuf = lines.pop() ?? '';
    for (const line of lines) {
      if (line.trim()) yield { type: 'log', stream: 'STDERR', line };
    }
  }

  // Flush remaining buffer
  if (stdoutBuf.trim()) yield { type: 'log', stream: 'STDOUT', line: stdoutBuf };
  if (stderrBuf.trim()) yield { type: 'log', stream: 'STDERR', line: stderrBuf };

  const exitCode: number = await new Promise((resolve) => {
    proc.on('close', resolve);
  });

  const commits = await hasNewCommits(worktreePath, config.baseBranch);

  if (detectSuccess({ exitCode, resultSubtype, hasCommits: commits })) {
    yield { type: 'result_success', summary: resultSummary };
  } else {
    yield {
      type: 'result_error',
      error: `exitCode=${exitCode}, resultSubtype=${resultSubtype ?? 'none'}, hasCommits=${commits}`,
    };
  }
}
```

- [ ] **Step 5: Update runner index**

`libs/runner/src/index.ts`:
```typescript
export { runSubtask, parseStreamLine, detectSuccess } from './lib/claude-runner';
export { addWorktree, removeWorktree, hasNewCommits } from './lib/worktree';
export { buildSubtaskPrompt } from './lib/prompt-builder';
export type { RunnerConfig, RunnerEvent } from './lib/types';
```

- [ ] **Step 6: Run tests to confirm they pass**

```bash
npx nx test runner
```

Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add libs/runner
git commit -m "feat: implement claude subprocess runner with stream-json parser"
```

---

## Phase 3 — NestJS API

### Task 7: NestJS Bootstrap — DB Module + SSE Service

**Files:**
- Create: `apps/api/src/modules/db/db.module.ts`
- Create: `apps/api/src/modules/sse/sse.service.ts`
- Create: `apps/api/src/modules/sse/sse.module.ts`
- Modify: `apps/api/src/app.module.ts`
- Modify: `apps/api/src/main.ts`

- [ ] **Step 1: Create PrismaService (db module)**

`apps/api/src/modules/db/db.module.ts`:
```typescript
import { Module, OnModuleInit, OnModuleDestroy, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    // Enable WAL mode for better concurrent read performance
    await this.$executeRawUnsafe('PRAGMA journal_mode=WAL;');
    await this.$executeRawUnsafe('PRAGMA foreign_keys=ON;');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DbModule {}
```

- [ ] **Step 2: Create SSE service**

`apps/api/src/modules/sse/sse.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface SseMessage {
  topic: string;       // e.g. "subtask:clxyz123", "job:clxyz456"
  data: unknown;
  event?: string;
}

@Injectable()
export class SseService {
  private readonly stream$ = new Subject<SseMessage>();

  emit(topic: string, data: unknown, event?: string): void {
    this.stream$.next({ topic, data, event });
  }

  subscribe(topic: string): Observable<MessageEvent> {
    return this.stream$.pipe(
      filter((msg) => msg.topic === topic),
      map((msg) => ({
        data: JSON.stringify(msg.data),
        type: msg.event ?? 'message',
      } as MessageEvent)),
    );
  }
}
```

`apps/api/src/modules/sse/sse.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { SseService } from './sse.service';

@Module({
  providers: [SseService],
  exports: [SseService],
})
export class SseModule {}
```

- [ ] **Step 3: Wire up app.module.ts**

`apps/api/src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DbModule } from './modules/db/db.module';
import { SseModule } from './modules/sse/sse.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DbModule,
    SseModule,
  ],
})
export class AppModule {}
```

Install ConfigModule:
```bash
pnpm add @nestjs/config
```

- [ ] **Step 4: Update main.ts**

`apps/api/src/main.ts`:
```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({ origin: 'http://localhost:5173' }); // Vite dev server
  await app.listen(3001);
  console.log('API listening on http://localhost:3001');
}

bootstrap();
```

- [ ] **Step 5: Start API and verify**

```bash
DATABASE_URL="file:./dev.sqlite" npx nx serve api
```

Expected: "API listening on http://localhost:3001" with no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src
git commit -m "feat: bootstrap NestJS API with PrismaService and SSE service"
```

---

### Task 8: Jobs Module

**Files:**
- Create: `apps/api/src/modules/jobs/jobs.service.ts`
- Create: `apps/api/src/modules/jobs/jobs.controller.ts`
- Create: `apps/api/src/modules/jobs/jobs.module.ts`
- Test: `apps/api/src/modules/jobs/jobs.service.spec.ts`

- [ ] **Step 1: Write failing service test**

`apps/api/src/modules/jobs/jobs.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { JobsService } from './jobs.service';
import { PrismaService } from '../db/db.module';

const mockPrisma = {
  job: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

describe('JobsService', () => {
  let service: JobsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(JobsService);
    jest.clearAllMocks();
  });

  it('createJob creates a job with PENDING status', async () => {
    const fakeJob = { id: 'job1', prompt: 'Add dark mode', status: 'PENDING', createdAt: new Date() };
    mockPrisma.job.create.mockResolvedValue(fakeJob);

    const result = await service.createJob('Add dark mode');
    expect(mockPrisma.job.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ prompt: 'Add dark mode', status: 'PENDING' }),
    });
    expect(result.id).toBe('job1');
  });

  it('updateStatus throws if transition is invalid', async () => {
    mockPrisma.job.findUnique.mockResolvedValue({ id: 'job1', status: 'COMPLETED' });
    await expect(service.updateStatus('job1', 'RUNNING')).rejects.toThrow(/invalid.*transition/i);
  });

  it('updateStatus updates the DB on valid transition', async () => {
    mockPrisma.job.findUnique.mockResolvedValue({ id: 'job1', status: 'PENDING' });
    mockPrisma.job.update.mockResolvedValue({ id: 'job1', status: 'DECOMPOSING' });
    const result = await service.updateStatus('job1', 'DECOMPOSING');
    expect(result.status).toBe('DECOMPOSING');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx nx test api --testFile=src/modules/jobs/jobs.service.spec.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement jobs.service.ts**

`apps/api/src/modules/jobs/jobs.service.ts`:
```typescript
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../db/db.module';
import { isValidJobTransition } from '@zibby-2-0/orchestration';
import type { Job } from '@prisma/client';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async createJob(prompt: string): Promise<Job> {
    return this.prisma.job.create({
      data: { prompt, status: 'PENDING' },
    });
  }

  async findAll(limit = 50, offset = 0): Promise<Job[]> {
    return this.prisma.job.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: { subtasks: { orderBy: { order: 'asc' } } },
    });
  }

  async findOne(id: string): Promise<Job & { subtasks: unknown[] }> {
    const job = await this.prisma.job.findUnique({
      where: { id },
      include: { subtasks: { orderBy: { order: 'asc' } } },
    });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    return job as Job & { subtasks: unknown[] };
  }

  async updateStatus(id: string, status: string, error?: string): Promise<Job> {
    const job = await this.prisma.job.findUnique({ where: { id } });
    if (!job) throw new NotFoundException(`Job ${id} not found`);
    if (!isValidJobTransition(job.status, status)) {
      throw new BadRequestException(`Invalid job transition: ${job.status} → ${status}`);
    }
    return this.prisma.job.update({
      where: { id },
      data: {
        status,
        error: error ?? null,
        finishedAt: ['COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED'].includes(status)
          ? new Date()
          : undefined,
      },
    });
  }
}
```

- [ ] **Step 4: Implement jobs.controller.ts**

`apps/api/src/modules/jobs/jobs.controller.ts`:
```typescript
import { Controller, Post, Get, Param, Body, Query, Sse, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JobsService } from './jobs.service';
import { SseService } from '../sse/sse.service';
import { CreateJobSchema } from '@zibby-2-0/shared-types';

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobs: JobsService,
    private readonly sse: SseService,
  ) {}

  @Post()
  async create(@Body() body: unknown) {
    const { prompt } = CreateJobSchema.parse(body);
    return this.jobs.createJob(prompt);
    // NOTE: orchestration is triggered by a separate event; see OrchestratorService
  }

  @Get()
  findAll(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.jobs.findAll(limit, offset);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.jobs.findOne(id);
  }

  @Sse(':id/stream')
  stream(@Param('id') id: string): Observable<MessageEvent> {
    return this.sse.subscribe(`job:${id}`);
  }
}
```

- [ ] **Step 5: Create jobs.module.ts**

`apps/api/src/modules/jobs/jobs.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { DbModule } from '../db/db.module';
import { SseModule } from '../sse/sse.module';

@Module({
  imports: [DbModule, SseModule],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
```

Add `JobsModule` to `AppModule` imports.

- [ ] **Step 6: Run tests to confirm they pass**

```bash
npx nx test api --testFile=src/modules/jobs/jobs.service.spec.ts
```

Expected: all 3 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/jobs
git commit -m "feat: add jobs CRUD service with status transition guard"
```

---

### Task 9: Subtasks Module

**Files:**
- Create: `apps/api/src/modules/subtasks/subtasks.service.ts`
- Create: `apps/api/src/modules/subtasks/subtasks.controller.ts`
- Create: `apps/api/src/modules/subtasks/subtasks.module.ts`

- [ ] **Step 1: Implement subtasks.service.ts**

`apps/api/src/modules/subtasks/subtasks.service.ts`:
```typescript
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../db/db.module';
import { isValidSubtaskTransition } from '@zibby-2-0/orchestration';
import type { Subtask, SubtaskLog } from '@prisma/client';

@Injectable()
export class SubtasksService {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(
    jobId: string,
    subtasks: Array<{ order: number; title: string; spec: string; acceptanceCriteria: string[] }>,
  ): Promise<Subtask[]> {
    const data = subtasks.map((s) => ({
      jobId,
      order: s.order,
      title: s.title,
      spec: s.spec,
      acceptanceCriteria: JSON.stringify(s.acceptanceCriteria),
      status: 'QUEUED',
    }));
    // createMany doesn't return rows in SQLite; use individual creates
    const created: Subtask[] = [];
    for (const d of data) {
      created.push(await this.prisma.subtask.create({ data: d }));
    }
    return created;
  }

  async findOne(id: string): Promise<Subtask> {
    const subtask = await this.prisma.subtask.findUnique({ where: { id } });
    if (!subtask) throw new NotFoundException(`Subtask ${id} not found`);
    return subtask;
  }

  async findByJob(jobId: string): Promise<Subtask[]> {
    return this.prisma.subtask.findMany({
      where: { jobId },
      orderBy: { order: 'asc' },
    });
  }

  async updateStatus(
    id: string,
    status: string,
    extra?: { branch?: string; prUrl?: string; error?: string },
  ): Promise<Subtask> {
    const subtask = await this.prisma.subtask.findUnique({ where: { id } });
    if (!subtask) throw new NotFoundException(`Subtask ${id} not found`);
    if (!isValidSubtaskTransition(subtask.status, status)) {
      throw new BadRequestException(`Invalid subtask transition: ${subtask.status} → ${status}`);
    }
    return this.prisma.subtask.update({
      where: { id },
      data: {
        status,
        branch: extra?.branch,
        prUrl: extra?.prUrl,
        error: extra?.error ?? null,
        startedAt: status === 'RUNNING' ? new Date() : undefined,
        finishedAt: ['PR_CREATED', 'FAILED'].includes(status) ? new Date() : undefined,
      },
    });
  }

  async appendLog(subtaskId: string, stream: string, line: string): Promise<void> {
    await this.prisma.subtaskLog.create({
      data: { subtaskId, stream, line },
    });
  }

  async getLogs(subtaskId: string, sinceTs?: string): Promise<SubtaskLog[]> {
    return this.prisma.subtaskLog.findMany({
      where: {
        subtaskId,
        ...(sinceTs ? { ts: { gt: new Date(sinceTs) } } : {}),
      },
      orderBy: { ts: 'asc' },
      take: 1000,
    });
  }
}
```

- [ ] **Step 2: Implement subtasks.controller.ts**

`apps/api/src/modules/subtasks/subtasks.controller.ts`:
```typescript
import { Controller, Get, Param, Query, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SubtasksService } from './subtasks.service';
import { SseService } from '../sse/sse.service';

@Controller('subtasks')
export class SubtasksController {
  constructor(
    private readonly subtasks: SubtasksService,
    private readonly sse: SseService,
  ) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.subtasks.findOne(id);
  }

  @Get(':id/logs')
  getLogs(@Param('id') id: string, @Query('since_ts') sinceTs?: string) {
    return this.subtasks.getLogs(id, sinceTs);
  }

  @Sse(':id/stream')
  stream(@Param('id') id: string): Observable<MessageEvent> {
    return this.sse.subscribe(`subtask:${id}`);
  }
}
```

- [ ] **Step 3: Create subtasks.module.ts**

`apps/api/src/modules/subtasks/subtasks.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { SubtasksController } from './subtasks.controller';
import { SubtasksService } from './subtasks.service';
import { DbModule } from '../db/db.module';
import { SseModule } from '../sse/sse.module';

@Module({
  imports: [DbModule, SseModule],
  controllers: [SubtasksController],
  providers: [SubtasksService],
  exports: [SubtasksService],
})
export class SubtasksModule {}
```

Add `SubtasksModule` to `AppModule` imports.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/modules/subtasks
git commit -m "feat: add subtasks service with status transitions and log append"
```

---

### Task 10: Decomposer Module

**Files:**
- Create: `apps/api/src/modules/decomposer/decomposer.prompt.ts`
- Create: `apps/api/src/modules/decomposer/decomposer.service.ts`
- Create: `apps/api/src/modules/decomposer/decomposer.module.ts`
- Test: `apps/api/src/modules/decomposer/decomposer.service.spec.ts`

- [ ] **Step 1: Write failing decomposer test**

`apps/api/src/modules/decomposer/decomposer.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DecomposerService } from './decomposer.service';

// Mock @anthropic-ai/sdk so the test doesn't make real API calls
jest.mock('@anthropic-ai/sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [
          {
            type: 'tool_use',
            name: 'emit_subtasks',
            input: {
              subtasks: [
                {
                  order: 1,
                  title: 'Add DarkModeToggle component',
                  spec: 'Create a toggle button in the header...',
                  acceptanceCriteria: ['Toggle changes body class to "dark"', 'State persists'],
                },
              ],
            },
          },
        ],
      }),
    },
  })),
}));

describe('DecomposerService', () => {
  let service: DecomposerService;

  beforeEach(async () => {
    process.env['ANTHROPIC_API_KEY'] = 'test-key';
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [DecomposerService],
    }).compile();
    service = module.get(DecomposerService);
  });

  it('decomposes a prompt into subtasks', async () => {
    const result = await service.decompose('Add dark mode to the app', undefined);
    expect(result.subtasks).toHaveLength(1);
    expect(result.subtasks[0].title).toBe('Add DarkModeToggle component');
    expect(result.subtasks[0].acceptanceCriteria).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx nx test api --testFile=src/modules/decomposer/decomposer.service.spec.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement decomposer.prompt.ts**

`apps/api/src/modules/decomposer/decomposer.prompt.ts`:
```typescript
export function buildDecomposerPrompt(userPrompt: string, repoContext: string | undefined): string {
  const context = repoContext
    ? `\n\n## Repository Context\n${repoContext}`
    : '';

  return `You are a senior software engineer helping decompose a feature request into independent, parallelizable subtasks.

## User Request
${userPrompt}${context}

## Instructions
- Break the request into independent subtasks that can be worked on in parallel without blocking each other.
- Each subtask must have at least 2 specific, testable acceptance criteria.
- Maximum 10 subtasks.
- Acceptance criteria should be concrete and verifiable (e.g., "The component renders without errors", not "It works").
- Each subtask's spec should be detailed enough for an engineer to implement without asking follow-up questions.`;
}

export const EMIT_SUBTASKS_TOOL = {
  name: 'emit_subtasks',
  description: 'Output the decomposed subtasks as structured data.',
  input_schema: {
    type: 'object' as const,
    properties: {
      subtasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            order: { type: 'integer', description: 'Sequential order number starting from 1' },
            title: { type: 'string', description: 'Short title for this subtask (5-10 words)' },
            spec: { type: 'string', description: 'Detailed specification for the engineer' },
            acceptanceCriteria: {
              type: 'array',
              items: { type: 'string' },
              minItems: 2,
              description: 'Specific, testable criteria that must all be met',
            },
          },
          required: ['order', 'title', 'spec', 'acceptanceCriteria'],
        },
        minItems: 1,
        maxItems: 10,
      },
    },
    required: ['subtasks'],
  },
} as const;
```

- [ ] **Step 4: Implement decomposer.service.ts**

`apps/api/src/modules/decomposer/decomposer.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { DecomposerOutputSchema, type DecomposerOutput } from '@zibby-2-0/shared-types';
import { buildDecomposerPrompt, EMIT_SUBTASKS_TOOL } from './decomposer.prompt';

@Injectable()
export class DecomposerService {
  private readonly client: Anthropic;

  constructor(private readonly config: ConfigService) {
    this.client = new Anthropic({
      apiKey: this.config.getOrThrow('ANTHROPIC_API_KEY'),
    });
  }

  async decompose(prompt: string, repoContext: string | undefined): Promise<DecomposerOutput> {
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      tools: [EMIT_SUBTASKS_TOOL],
      tool_choice: { type: 'tool', name: 'emit_subtasks' },
      messages: [{ role: 'user', content: buildDecomposerPrompt(prompt, repoContext) }],
    });

    const toolUse = response.content.find((c) => c.type === 'tool_use' && c.name === 'emit_subtasks');
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('Decomposer did not return tool_use block');
    }

    const parsed = DecomposerOutputSchema.safeParse(toolUse.input);
    if (!parsed.success) {
      throw new Error(`Decomposer output invalid: ${parsed.error.message}`);
    }

    return parsed.data;
  }

  async getRepoContext(repoPath: string): Promise<string | undefined> {
    const { readFile } = await import('fs/promises');
    const { join } = await import('path');
    for (const candidate of ['CLAUDE.md', 'README.md', 'readme.md']) {
      try {
        const content = await readFile(join(repoPath, candidate), 'utf8');
        // Truncate to first 2000 chars to keep the prompt focused
        return content.slice(0, 2000);
      } catch {
        continue;
      }
    }
    return undefined;
  }
}
```

- [ ] **Step 5: Create decomposer.module.ts**

`apps/api/src/modules/decomposer/decomposer.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { DecomposerService } from './decomposer.service';

@Module({
  providers: [DecomposerService],
  exports: [DecomposerService],
})
export class DecomposerModule {}
```

Add `DecomposerModule` to `AppModule` imports.

- [ ] **Step 6: Run tests to confirm they pass**

```bash
npx nx test api --testFile=src/modules/decomposer/decomposer.service.spec.ts
```

Expected: 1 test PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/decomposer
git commit -m "feat: add decomposer service using Anthropic SDK structured output"
```

---

### Task 11: GitHub Module

**Files:**
- Create: `apps/api/src/modules/github/github.service.ts`
- Create: `apps/api/src/modules/github/github.module.ts`
- Test: `apps/api/src/modules/github/github.service.spec.ts`

- [ ] **Step 1: Write failing test**

`apps/api/src/modules/github/github.service.spec.ts`:
```typescript
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { GitHubService } from './github.service';

const mockExec = jest.fn();
jest.mock('child_process', () => ({
  exec: (...args: unknown[]) => mockExec(...args),
}));

describe('GitHubService', () => {
  let service: GitHubService;

  beforeEach(async () => {
    process.env['GITHUB_TOKEN'] = 'test-token';
    const module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [GitHubService],
    }).compile();
    service = module.get(GitHubService);
    jest.clearAllMocks();
  });

  it('pushBranch calls git push with the branch name', async () => {
    mockExec.mockImplementation((_cmd: string, _opts: unknown, cb: (err: null, stdout: string) => void) => cb(null, ''));
    await service.pushBranch('/workspace/.worktrees/t1', 'task/feature-1');
    expect(mockExec).toHaveBeenCalledWith(
      expect.stringContaining('git push -u origin task/feature-1'),
      expect.anything(),
      expect.any(Function),
    );
  });

  it('createPr returns the PR URL from gh output', async () => {
    mockExec.mockImplementation((_cmd: string, _opts: unknown, cb: (err: null, stdout: string) => void) =>
      cb(null, 'https://github.com/owner/repo/pull/42\n'),
    );
    const url = await service.createPr({
      worktreePath: '/workspace/.worktrees/t1',
      baseBranch: 'main',
      branch: 'task/feature-1',
      title: 'Add dark mode',
      body: 'Spec: ...',
    });
    expect(url).toBe('https://github.com/owner/repo/pull/42');
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx nx test api --testFile=src/modules/github/github.service.spec.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement github.service.ts**

`apps/api/src/modules/github/github.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface CreatePrOptions {
  worktreePath: string;
  baseBranch: string;
  branch: string;
  title: string;
  body: string;
}

@Injectable()
export class GitHubService {
  async pushBranch(worktreePath: string, branch: string): Promise<void> {
    await execAsync(`git push -u origin ${branch}`, {
      cwd: worktreePath,
      env: { ...process.env },
    });
  }

  async createPr(opts: CreatePrOptions): Promise<string> {
    const escapedTitle = opts.title.replace(/"/g, '\\"');
    const escapedBody = opts.body.replace(/"/g, '\\"');
    const { stdout } = await execAsync(
      `gh pr create --base "${opts.baseBranch}" --head "${opts.branch}" --title "${escapedTitle}" --body "${escapedBody}"`,
      {
        cwd: opts.worktreePath,
        env: { ...process.env, GITHUB_TOKEN: process.env['GITHUB_TOKEN'] ?? '' },
      },
    );
    return stdout.trim();
  }
}
```

- [ ] **Step 4: Create github.module.ts**

`apps/api/src/modules/github/github.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { GitHubService } from './github.service';

@Module({
  providers: [GitHubService],
  exports: [GitHubService],
})
export class GitHubModule {}
```

Add `GitHubModule` to `AppModule` imports.

- [ ] **Step 5: Run tests to confirm they pass**

```bash
npx nx test api --testFile=src/modules/github/github.service.spec.ts
```

Expected: 2 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/github
git commit -m "feat: add GitHub service for git push and gh pr create"
```

---

### Task 12: Runners Module + Orchestrator

**Files:**
- Create: `apps/api/src/modules/runners/runners.service.ts`
- Create: `apps/api/src/modules/runners/runners.module.ts`
- Create: `apps/api/src/modules/orchestrator/orchestrator.service.ts`
- Create: `apps/api/src/modules/orchestrator/orchestrator.module.ts`

- [ ] **Step 1: Implement runners.service.ts**

This service is the adapter between `libs/runner` (pure logic) and the NestJS ecosystem (DB, SSE). It handles one subtask end-to-end.

`apps/api/src/modules/runners/runners.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SubtasksService } from '../subtasks/subtasks.service';
import { GitHubService } from '../github/github.service';
import { SseService } from '../sse/sse.service';
import { addWorktree, removeWorktree, buildSubtaskPrompt, runSubtask } from '@zibby-2-0/runner';
import type { Subtask } from '@prisma/client';
import * as path from 'path';

// Batch log inserts: flush every N lines or every M ms
const LOG_BATCH_SIZE = 50;
const LOG_FLUSH_INTERVAL_MS = 500;

@Injectable()
export class RunnersService {
  private readonly logger = new Logger(RunnersService.name);

  constructor(
    private readonly subtasks: SubtasksService,
    private readonly github: GitHubService,
    private readonly sse: SseService,
    private readonly config: ConfigService,
  ) {}

  async runSubtask(subtask: Subtask): Promise<void> {
    const repoPath = this.config.get('REPO_PATH', '/workspace');
    const baseBranch = this.config.get('BASE_BRANCH', 'main');
    const maxTurns = Number(this.config.get('MAX_TURNS', '300'));
    const model = this.config.get('CLAUDE_MODEL', 'claude-sonnet-4-6');

    const branch = `task/${subtask.id}`;
    const worktreePath = path.join(repoPath, '.worktrees', subtask.id);

    // Mark running
    await this.subtasks.updateStatus(subtask.id, 'RUNNING', { branch });
    this.sse.emit(`subtask:${subtask.id}`, { type: 'status', status: 'RUNNING' });
    this.sse.emit(`job:${subtask.jobId}`, { type: 'subtask_status', subtaskId: subtask.id, status: 'RUNNING' });

    let logBuffer: Array<{ stream: string; line: string }> = [];
    let flushTimer: ReturnType<typeof setInterval> | null = null;

    const flushLogs = async () => {
      if (logBuffer.length === 0) return;
      const batch = logBuffer.splice(0, logBuffer.length);
      for (const entry of batch) {
        await this.subtasks.appendLog(subtask.id, entry.stream, entry.line);
      }
    };

    const queueLog = (stream: string, line: string) => {
      logBuffer.push({ stream, line });
      this.sse.emit(`subtask:${subtask.id}`, { type: 'log', stream, line });
      if (logBuffer.length >= LOG_BATCH_SIZE) {
        flushLogs().catch((err) => this.logger.error('Log flush error', err));
      }
    };

    flushTimer = setInterval(() => {
      flushLogs().catch((err) => this.logger.error('Log flush timer error', err));
    }, LOG_FLUSH_INTERVAL_MS);

    try {
      await addWorktree(repoPath, worktreePath, branch);

      const prompt = buildSubtaskPrompt({
        title: subtask.title,
        spec: subtask.spec,
        acceptanceCriteria: subtask.acceptanceCriteria,
      });

      let success = false;

      for await (const event of runSubtask({ worktreePath, prompt, config: { repoPath, maxTurns, model, baseBranch } })) {
        if (event.type === 'log') {
          queueLog(event.stream, event.line);
        } else if (event.type === 'system') {
          queueLog('SYSTEM', event.message);
        } else if (event.type === 'result_success') {
          success = true;
          queueLog('SYSTEM', `Claude exited successfully: ${event.summary}`);
        } else if (event.type === 'result_error') {
          queueLog('SYSTEM', `Claude exited with error: ${event.error}`);
        }
      }

      await flushLogs();

      if (success) {
        await this.subtasks.updateStatus(subtask.id, 'PUSHING', { branch });
        this.sse.emit(`subtask:${subtask.id}`, { type: 'status', status: 'PUSHING' });

        await this.github.pushBranch(worktreePath, branch);

        const prBody = `## ${subtask.title}\n\n${subtask.spec}\n\n### Acceptance Criteria\n${
          (JSON.parse(subtask.acceptanceCriteria) as string[]).map((c, i) => `${i + 1}. ${c}`).join('\n')
        }`;
        const prUrl = await this.github.createPr({
          worktreePath,
          baseBranch,
          branch,
          title: subtask.title,
          body: prBody,
        });

        await this.subtasks.updateStatus(subtask.id, 'PR_CREATED', { prUrl });
        this.sse.emit(`subtask:${subtask.id}`, { type: 'status', status: 'PR_CREATED', prUrl });
        this.sse.emit(`job:${subtask.jobId}`, { type: 'subtask_status', subtaskId: subtask.id, status: 'PR_CREATED', prUrl });
      } else {
        await this.subtasks.updateStatus(subtask.id, 'FAILED', { error: 'Claude did not complete the task successfully' });
        this.sse.emit(`subtask:${subtask.id}`, { type: 'status', status: 'FAILED' });
        this.sse.emit(`job:${subtask.jobId}`, { type: 'subtask_status', subtaskId: subtask.id, status: 'FAILED' });
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.error(`Subtask ${subtask.id} failed with exception`, error);
      await flushLogs();
      await this.subtasks.updateStatus(subtask.id, 'FAILED', { error }).catch(() => void 0);
      this.sse.emit(`subtask:${subtask.id}`, { type: 'status', status: 'FAILED', error });
      this.sse.emit(`job:${subtask.jobId}`, { type: 'subtask_status', subtaskId: subtask.id, status: 'FAILED' });
    } finally {
      if (flushTimer) clearInterval(flushTimer);
      await removeWorktree(repoPath, worktreePath).catch(() => void 0);
    }
  }
}
```

- [ ] **Step 2: Create runners.module.ts**

`apps/api/src/modules/runners/runners.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { RunnersService } from './runners.service';
import { SubtasksModule } from '../subtasks/subtasks.module';
import { GitHubModule } from '../github/github.module';
import { SseModule } from '../sse/sse.module';

@Module({
  imports: [SubtasksModule, GitHubModule, SseModule],
  providers: [RunnersService],
  exports: [RunnersService],
})
export class RunnersModule {}
```

- [ ] **Step 3: Implement orchestrator.service.ts**

`apps/api/src/modules/orchestrator/orchestrator.service.ts`:
```typescript
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../db/db.module';
import { JobsService } from '../jobs/jobs.service';
import { SubtasksService } from '../subtasks/subtasks.service';
import { DecomposerService } from '../decomposer/decomposer.service';
import { RunnersService } from '../runners/runners.service';
import { SseService } from '../sse/sse.service';
import { AsyncQueue } from '@zibby-2-0/orchestration';
import type { Subtask } from '@prisma/client';

@Injectable()
export class OrchestratorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(OrchestratorService.name);
  private readonly queue: AsyncQueue<void>;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
    private readonly subtasks: SubtasksService,
    private readonly decomposer: DecomposerService,
    private readonly runners: RunnersService,
    private readonly sse: SseService,
  ) {
    const maxParallel = Number(this.config.get('MAX_PARALLEL_RUNNERS', '3'));
    this.queue = new AsyncQueue<void>(maxParallel);
  }

  async onApplicationBootstrap() {
    // Rehydrate: any subtask left as RUNNING was interrupted by a prior restart
    const stale = await this.prisma.subtask.findMany({ where: { status: 'RUNNING' } });
    for (const s of stale) {
      this.logger.warn(`Marking stale subtask ${s.id} as FAILED (orchestrator restart)`);
      await this.subtasks.updateStatus(s.id, 'FAILED', { error: 'Orchestrator restarted while task was running' }).catch(() => void 0);
    }
    // Re-enqueue any QUEUED subtasks that were not started
    const queued = await this.prisma.subtask.findMany({ where: { status: 'QUEUED' } });
    for (const s of queued) {
      this.enqueue(s);
    }
    this.logger.log(`Orchestrator ready. Rehydrated ${queued.length} queued subtask(s).`);
  }

  async submitJob(jobId: string): Promise<void> {
    const job = await this.jobs.findOne(jobId);
    const repoPath = this.config.get('REPO_PATH', '/workspace');

    await this.jobs.updateStatus(jobId, 'DECOMPOSING');
    this.sse.emit(`job:${jobId}`, { type: 'status', status: 'DECOMPOSING' });

    let subtaskRows: Subtask[];
    try {
      const repoContext = await this.decomposer.getRepoContext(repoPath);
      const decomposed = await this.decomposer.decompose(job.prompt, repoContext);

      subtaskRows = await this.subtasks.createMany(
        jobId,
        decomposed.subtasks.map((s) => ({
          order: s.order,
          title: s.title,
          spec: s.spec,
          acceptanceCriteria: s.acceptanceCriteria,
        })),
      );
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.error(`Decomposition failed for job ${jobId}`, error);
      await this.jobs.updateStatus(jobId, 'FAILED', error);
      this.sse.emit(`job:${jobId}`, { type: 'status', status: 'FAILED', error });
      return;
    }

    await this.jobs.updateStatus(jobId, 'RUNNING');
    this.sse.emit(`job:${jobId}`, { type: 'status', status: 'RUNNING', subtaskCount: subtaskRows.length });

    for (const subtask of subtaskRows) {
      this.enqueue(subtask);
    }
  }

  private enqueue(subtask: Subtask): void {
    this.queue.add(async () => {
      await this.runners.runSubtask(subtask);
      await this.finalizeJobIfDone(subtask.jobId);
    }).catch((err) => {
      this.logger.error(`Queue error for subtask ${subtask.id}`, err);
    });
  }

  private async finalizeJobIfDone(jobId: string): Promise<void> {
    const all = await this.subtasks.findByJob(jobId);
    const terminal = all.filter((s) => s.status === 'PR_CREATED' || s.status === 'FAILED');
    if (terminal.length < all.length) return; // not all done yet

    const allSuccess = all.every((s) => s.status === 'PR_CREATED');
    const anySuccess = all.some((s) => s.status === 'PR_CREATED');

    const finalStatus = allSuccess ? 'COMPLETED' : anySuccess ? 'PARTIALLY_COMPLETED' : 'FAILED';
    await this.jobs.updateStatus(jobId, finalStatus).catch(() => void 0);
    this.sse.emit(`job:${jobId}`, { type: 'status', status: finalStatus });
  }
}
```

- [ ] **Step 4: Create orchestrator.module.ts**

`apps/api/src/modules/orchestrator/orchestrator.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';
import { DbModule } from '../db/db.module';
import { JobsModule } from '../jobs/jobs.module';
import { SubtasksModule } from '../subtasks/subtasks.module';
import { DecomposerModule } from '../decomposer/decomposer.module';
import { RunnersModule } from '../runners/runners.module';
import { SseModule } from '../sse/sse.module';

@Module({
  imports: [DbModule, JobsModule, SubtasksModule, DecomposerModule, RunnersModule, SseModule],
  providers: [OrchestratorService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
```

- [ ] **Step 5: Wire OrchestratorService into JobsController**

Update `apps/api/src/modules/jobs/jobs.controller.ts` — inject `OrchestratorService` and call `submitJob` after job creation:

```typescript
// In the create() method, after createJob():
const job = await this.jobs.createJob(prompt);
// Fire-and-forget; orchestrator runs async
this.orchestrator.submitJob(job.id).catch((err) =>
  console.error('submitJob error', err),
);
return job;
```

Update `JobsModule` to import `OrchestratorModule` and update `JobsController` constructor to inject `OrchestratorService`.

Note: To avoid circular dependency (Jobs ↔ Orchestrator), keep `OrchestratorService` injected into `JobsController` but NOT into `JobsService`. `JobsModule` should import `OrchestratorModule`, and `OrchestratorModule` should import `JobsModule`.

Add all new modules to `AppModule` imports.

- [ ] **Step 6: Verify app starts**

```bash
DATABASE_URL="file:./dev.sqlite" npx nx serve api
```

Expected: No circular dependency errors, API starts on port 3001.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/modules/runners apps/api/src/modules/orchestrator apps/api/src/modules/jobs/jobs.controller.ts apps/api/src/app.module.ts
git commit -m "feat: implement runners adapter and orchestrator with queue-based parallelism"
```

---

## Phase 4 — Web UI

### Task 13: API Client + React Hooks

**Files:**
- Create: `apps/web/src/api/client.ts`
- Create: `apps/web/src/hooks/useJobs.ts`
- Create: `apps/web/src/hooks/useJob.ts`
- Create: `apps/web/src/hooks/useSubtaskStream.ts`
- Modify: `apps/web/src/main.tsx`

- [ ] **Step 1: Configure Tailwind**

```bash
cd apps/web
npx tailwindcss init -p
```

Update `apps/web/tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{tsx,ts}'],
  theme: { extend: {} },
  plugins: [],
};
```

Add to `apps/web/src/index.css` (create if needed):
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Import in `apps/web/src/main.tsx`:
```typescript
import './index.css';
```

- [ ] **Step 2: Implement API client**

`apps/web/src/api/client.ts`:
```typescript
const BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3001';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${init?.method ?? 'GET'} ${path} failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  createJob: (prompt: string) =>
    apiFetch<{ id: string; status: string; prompt: string; createdAt: string }>('/jobs', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),
  listJobs: () => apiFetch<unknown[]>('/jobs'),
  getJob: (id: string) => apiFetch<unknown>(`/jobs/${id}`),
  getSubtask: (id: string) => apiFetch<unknown>(`/subtasks/${id}`),
};
```

- [ ] **Step 3: Set up QueryClient in main.tsx**

`apps/web/src/main.tsx`:
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5_000, refetchInterval: 10_000 } },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
```

- [ ] **Step 4: Implement hooks**

`apps/web/src/hooks/useJobs.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export function useJobs() {
  return useQuery({ queryKey: ['jobs'], queryFn: () => api.listJobs(), refetchInterval: 5_000 });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prompt: string) => api.createJob(prompt),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  });
}
```

`apps/web/src/hooks/useJob.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export function useJob(id: string | null) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => api.getJob(id!),
    enabled: !!id,
    refetchInterval: 3_000,
  });
}
```

`apps/web/src/hooks/useSubtaskStream.ts`:
```typescript
import { useEffect, useState } from 'react';

const BASE_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3001';

export interface StreamEvent {
  type: string;
  stream?: string;
  line?: string;
  status?: string;
  error?: string;
  prUrl?: string;
}

export function useSubtaskStream(subtaskId: string | null) {
  const [events, setEvents] = useState<StreamEvent[]>([]);

  useEffect(() => {
    if (!subtaskId) return;
    const es = new EventSource(`${BASE_URL}/api/subtasks/${subtaskId}/stream`);

    es.onmessage = (e: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(e.data) as StreamEvent;
        setEvents((prev) => [...prev.slice(-500), parsed]); // keep last 500 events
      } catch {
        // ignore malformed events
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, [subtaskId]);

  return events;
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/api apps/web/src/hooks apps/web/src/main.tsx apps/web/src/index.css apps/web/tailwind.config.js
git commit -m "feat: add API client, React Query hooks, and Tailwind setup"
```

---

### Task 14: Core UI Components

**Files:**
- Create: `apps/web/src/components/StatusBadge.tsx`
- Create: `apps/web/src/components/JobForm.tsx`
- Create: `apps/web/src/components/JobList.tsx`
- Create: `apps/web/src/components/SubtaskCard.tsx`
- Create: `apps/web/src/components/LogTail.tsx`
- Create: `apps/web/src/App.tsx`

- [ ] **Step 1: StatusBadge**

`apps/web/src/components/StatusBadge.tsx`:
```typescript
const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700',
  DECOMPOSING: 'bg-blue-100 text-blue-700 animate-pulse',
  RUNNING: 'bg-blue-100 text-blue-700 animate-pulse',
  PUSHING: 'bg-purple-100 text-purple-700 animate-pulse',
  PR_CREATED: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-green-100 text-green-700',
  PARTIALLY_COMPLETED: 'bg-yellow-100 text-yellow-700',
  QUEUED: 'bg-gray-100 text-gray-500',
  FAILED: 'bg-red-100 text-red-700',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}
```

- [ ] **Step 2: JobForm**

`apps/web/src/components/JobForm.tsx`:
```typescript
import { useState } from 'react';
import { useCreateJob } from '../hooks/useJobs';

export function JobForm() {
  const [prompt, setPrompt] = useState('');
  const { mutate, isPending, error } = useCreateJob();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    mutate(prompt.trim(), { onSuccess: () => setPrompt('') });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        className="w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
        placeholder="Describe what needs to be done overnight..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={isPending}
      />
      {error && <p className="text-red-600 text-sm">{String(error)}</p>}
      <button
        type="submit"
        disabled={isPending || !prompt.trim()}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition-colors"
      >
        {isPending ? 'Submitting...' : 'Submit Job'}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: SubtaskCard**

`apps/web/src/components/SubtaskCard.tsx`:
```typescript
import { useState } from 'react';
import { StatusBadge } from './StatusBadge';
import { LogTail } from './LogTail';

interface SubtaskCardProps {
  subtask: {
    id: string;
    title: string;
    spec: string;
    acceptanceCriteria: string; // JSON-encoded
    status: string;
    branch: string | null;
    prUrl: string | null;
    error: string | null;
  };
}

export function SubtaskCard({ subtask }: SubtaskCardProps) {
  const [expanded, setExpanded] = useState(false);

  let criteria: string[] = [];
  try { criteria = JSON.parse(subtask.acceptanceCriteria) as string[]; } catch { /* noop */ }

  const isActive = ['RUNNING', 'PUSHING'].includes(subtask.status);

  return (
    <div className="border rounded-lg p-4 space-y-2 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-sm">{subtask.title}</span>
        <StatusBadge status={subtask.status} />
      </div>

      {subtask.prUrl && (
        <a href={subtask.prUrl} target="_blank" rel="noreferrer" className="text-blue-600 text-xs underline">
          View PR →
        </a>
      )}

      {subtask.error && (
        <p className="text-red-600 text-xs bg-red-50 rounded p-2">{subtask.error}</p>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-gray-500 underline"
      >
        {expanded ? 'Hide details' : 'Show details'}
      </button>

      {expanded && (
        <div className="space-y-3 pt-2 border-t">
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Specification</p>
            <p className="text-xs text-gray-700 whitespace-pre-wrap">{subtask.spec}</p>
          </div>
          {criteria.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Acceptance Criteria</p>
              <ol className="list-decimal list-inside space-y-1">
                {criteria.map((c, i) => (
                  <li key={i} className="text-xs text-gray-700">{c}</li>
                ))}
              </ol>
            </div>
          )}
          {(isActive || subtask.status === 'FAILED') && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Live Logs</p>
              <LogTail subtaskId={subtask.id} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: LogTail**

`apps/web/src/components/LogTail.tsx`:
```typescript
import { useEffect, useRef } from 'react';
import { useSubtaskStream } from '../hooks/useSubtaskStream';

export function LogTail({ subtaskId }: { subtaskId: string }) {
  const events = useSubtaskStream(subtaskId);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

  const logLines = events.filter((e) => e.type === 'log' && e.line);

  return (
    <div className="bg-gray-900 text-gray-100 rounded text-xs font-mono p-3 max-h-64 overflow-y-auto">
      {logLines.length === 0 && <span className="text-gray-500">Waiting for output...</span>}
      {logLines.map((e, i) => {
        let text = e.line ?? '';
        // Attempt to extract human-readable text from stream-json
        try {
          const parsed = JSON.parse(text) as Record<string, unknown>;
          if (parsed['type'] === 'assistant') {
            const content = (parsed['message'] as { content?: Array<{ type: string; text?: string }> })?.content;
            const textBlock = content?.find((c) => c.type === 'text');
            if (textBlock?.text) text = textBlock.text;
          }
        } catch { /* keep raw */ }

        return (
          <div key={i} className={`${e.stream === 'STDERR' ? 'text-red-400' : ''} ${e.stream === 'SYSTEM' ? 'text-yellow-400' : ''}`}>
            {text}
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
```

- [ ] **Step 5: App.tsx**

`apps/web/src/App.tsx`:
```typescript
import { useState, useEffect } from 'react';
import { useJobs } from './hooks/useJobs';
import { useJob } from './hooks/useJob';
import { JobForm } from './components/JobForm';
import { StatusBadge } from './components/StatusBadge';
import { SubtaskCard } from './components/SubtaskCard';

function JobDetail({ jobId, onBack }: { jobId: string; onBack: () => void }) {
  const { data: job, isLoading } = useJob(jobId);

  if (isLoading || !job) return <p className="text-gray-500 text-sm">Loading...</p>;

  const j = job as {
    id: string; prompt: string; status: string; error?: string;
    subtasks?: Array<{ id: string; title: string; spec: string; acceptanceCriteria: string; status: string; branch: string | null; prUrl: string | null; error: string | null; order: number }>;
  };

  const prCount = j.subtasks?.filter((s) => s.status === 'PR_CREATED').length ?? 0;
  const total = j.subtasks?.length ?? 0;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-blue-600 text-sm underline">← Back</button>
      <div className="bg-white border rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between">
          <StatusBadge status={j.status} />
          <span className="text-xs text-gray-500">{prCount}/{total} PRs created</span>
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{j.prompt}</p>
        {j.error && <p className="text-red-600 text-xs">{j.error}</p>}
      </div>
      <div className="space-y-3">
        {j.subtasks?.sort((a, b) => a.order - b.order).map((s) => (
          <SubtaskCard key={s.id} subtask={s} />
        ))}
      </div>
    </div>
  );
}

function JobList({ onSelect }: { onSelect: (id: string) => void }) {
  const { data: jobs, isLoading } = useJobs();

  if (isLoading) return <p className="text-gray-500 text-sm">Loading jobs...</p>;
  if (!jobs?.length) return <p className="text-gray-400 text-sm">No jobs yet. Submit one above.</p>;

  const list = jobs as Array<{
    id: string; prompt: string; status: string; createdAt: string;
    subtasks?: Array<{ status: string }>;
  }>;

  return (
    <div className="space-y-2">
      {list.map((job) => {
        const prCount = job.subtasks?.filter((s) => s.status === 'PR_CREATED').length ?? 0;
        const total = job.subtasks?.length ?? 0;
        return (
          <button
            key={job.id}
            onClick={() => onSelect(job.id)}
            className="w-full text-left border rounded-lg p-3 bg-white hover:border-blue-400 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm text-gray-800 line-clamp-2">{job.prompt}</p>
              <StatusBadge status={job.status} />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-400">{new Date(job.createdAt).toLocaleString()}</span>
              {total > 0 && (
                <span className="text-xs text-gray-500">{prCount}/{total} PRs</span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function App() {
  // Simple URL-param routing
  const params = new URLSearchParams(window.location.search);
  const jobId = params.get('jobId');

  const selectJob = (id: string) => {
    window.history.pushState({}, '', `?jobId=${id}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const goBack = () => {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  // Force re-render on popstate (URL-param routing)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const handler = () => setTick((n) => n + 1);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _tick = tick; // consumed to trigger re-render
  const currentJobId = new URLSearchParams(window.location.search).get('jobId');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <h1 className="text-lg font-semibold text-gray-900">Agent Orchestrator</h1>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {currentJobId ? (
          <JobDetail jobId={currentJobId} onBack={goBack} />
        ) : (
          <>
            <section>
              <h2 className="text-sm font-medium text-gray-700 mb-2">New Job</h2>
              <JobForm />
            </section>
            <section>
              <h2 className="text-sm font-medium text-gray-700 mb-2">Jobs</h2>
              <JobList onSelect={selectJob} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 6: Start dev server and verify UI**

```bash
DATABASE_URL="file:./dev.sqlite" npx nx serve api &
npx nx serve web
```

Open `http://localhost:5173`. Verify: form renders, job list shows, no console errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src
git commit -m "feat: implement web UI with job form, job list, subtask cards, and log tail"
```

---

## Phase 5 — Docker

### Task 15: Dockerfile + docker-compose

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Modify: `.env.example`

- [ ] **Step 1: Write Dockerfile**

`Dockerfile`:
```dockerfile
# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml nx.json tsconfig.base.json ./
RUN pnpm install --frozen-lockfile

COPY apps apps
COPY libs libs

# Generate Prisma client
RUN DATABASE_URL="file:/tmp/build.sqlite" npx prisma generate --schema=libs/db/prisma/schema.prisma

# Build API and web
RUN pnpm exec nx build api --configuration=production
RUN pnpm exec nx build web --configuration=production

# ---- Runtime stage ----
FROM node:20-alpine AS runtime
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache git bash curl

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg 2>/dev/null; \
    apk add --no-cache --repository https://dl-cdn.alpinelinux.org/alpine/edge/community github-cli || \
    (curl -fsSL https://github.com/cli/cli/releases/latest/download/gh_2.45.0_linux_amd64.tar.gz | \
     tar -xz -C /usr/local --strip-components=1)

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Configure gh to use GITHUB_TOKEN
ENV GH_TOKEN=""

# Copy built artifacts from builder
COPY --from=builder /app/dist/apps/api ./dist/api
COPY --from=builder /app/dist/apps/web ./dist/web
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/libs/db/prisma ./prisma

# Serve web static files from API (NestJS ServeStaticModule)
# web build → dist/web/browser; API serves it at /

EXPOSE 3000

CMD ["node", "dist/api/main.js"]
```

Note: The API should serve web static files in production. Add `@nestjs/serve-static` to serve `dist/web/browser` at `/`. Install: `pnpm add @nestjs/serve-static`.

Update `apps/api/src/app.module.ts` in production mode:
```typescript
// Add to AppModule imports when NODE_ENV=production:
ServeStaticModule.forRoot({
  rootPath: join(__dirname, '..', '..', 'web', 'browser'), // adjust to actual dist path
  exclude: ['/api/(.*)'],
}),
```

Also update `apps/api/src/main.ts` to listen on port 3000 in production (or read `PORT` from env).

- [ ] **Step 2: Write docker-compose.yml**

`docker-compose.yml`:
```yaml
version: '3.9'
services:
  orchestrator:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    volumes:
      - ${WORKSPACE_PATH:-./workspace}:/workspace
      - orchestrator-data:/data
    env_file:
      - .env
    environment:
      - DATABASE_URL=file:/data/db.sqlite
      - REPO_PATH=/workspace
      - NODE_ENV=production
    restart: unless-stopped

volumes:
  orchestrator-data:
```

- [ ] **Step 3: Update .env.example**

```
# === Required ===
ANTHROPIC_API_KEY=sk-ant-...
GITHUB_TOKEN=ghp_...

# === Optional (with defaults) ===
MAX_PARALLEL_RUNNERS=3
CLAUDE_MODEL=claude-sonnet-4-6
MAX_TURNS=300
BASE_BRANCH=main
WORKSPACE_PATH=./workspace   # host path to target git repo, mounted at /workspace
DATABASE_URL=file:/data/db.sqlite
```

- [ ] **Step 4: Run Prisma migrations in entrypoint**

Create `scripts/entrypoint.sh`:
```bash
#!/bin/sh
set -e
# Run migrations on startup
npx prisma migrate deploy --schema=/app/prisma/schema.prisma
exec "$@"
```

Update Dockerfile `CMD`:
```dockerfile
COPY scripts/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/api/main.js"]
```

- [ ] **Step 5: Configure git identity for Claude in Docker**

Add to `docker-compose.yml` environment:
```yaml
- GIT_AUTHOR_NAME=Agent Orchestrator
- GIT_AUTHOR_EMAIL=agent@localhost
- GIT_COMMITTER_NAME=Agent Orchestrator
- GIT_COMMITTER_EMAIL=agent@localhost
```

These ensure `git commit` works inside the worktrees.

- [ ] **Step 6: Build and run**

First, create a test workspace with a git repo:
```bash
mkdir -p workspace
git -C workspace init
git -C workspace config user.email "test@test.com"
git -C workspace config user.name "Test"
echo "# Test Repo" > workspace/README.md
git -C workspace add .
git -C workspace commit -m "init"
```

Build and start:
```bash
docker-compose build
docker-compose up
```

Expected: container starts, migrations run, API reachable at `http://localhost:3000`.

- [ ] **Step 7: Smoke test the full flow (manual)**

1. Open `http://localhost:3000` in browser
2. Submit prompt: `"Add a CONTRIBUTING.md file with instructions for local setup"`
3. Watch: job appears in list, status changes to DECOMPOSING → RUNNING
4. Subtask cards appear, status badges animate
5. Expand a subtask to see live logs
6. Verify PR appears in GitHub

- [ ] **Step 8: Commit**

```bash
git add Dockerfile docker-compose.yml .env.example scripts/
git commit -m "feat: add Dockerfile and docker-compose for single-container deployment"
```

---

## Verification Checklist

After all tasks are complete:

```bash
# Unit tests — all should pass
npx nx run-many --target=test --projects=shared-types,orchestration,runner

# API module tests
npx nx test api

# Build all
npx nx run-many --target=build --all

# Full smoke test
docker-compose build && docker-compose up
# → submit a job and verify PR is created in GitHub
```

### Expected end state
- `nx test` for `shared-types`, `orchestration`, `runner` → all green
- `nx test api` → unit tests for jobs service, decomposer, github service green
- `docker-compose up` → accessible at `http://localhost:3000`
- Submitting a prompt → decomposition → subtask cards with live logs → GitHub PRs created

---

## Known Gotchas

1. **Circular dependency** (`JobsModule` ↔ `OrchestratorModule`): Use `@nestjs/event-emitter` to decouple. In `JobsController.create()`, emit `this.eventEmitter.emit('job.created', job.id)` instead of calling `OrchestratorService` directly. In `OrchestratorService`, handle with `@OnEvent('job.created')` decorator. Install: `pnpm add @nestjs/event-emitter`. Add `EventEmitterModule.forRoot()` to `AppModule`. This eliminates the circular dependency entirely.

2. **`createMany` in Prisma with SQLite**: `createMany` doesn't return records in SQLite. Use individual `create()` calls in `SubtasksService.createMany`.

3. **Claude Code CLI flags**: `--permission-mode bypassPermissions` may need to be verified against your installed Claude Code version. Run `claude --help` to confirm available flags. Alternative: use a `.claude/settings.json` in each worktree with `{ "permissionMode": "bypassPermissions" }`.

4. **`gh` CLI auth in Docker**: `GH_TOKEN` env var must be set — `gh` reads this automatically. Alternatively mount `~/.config/gh` from the host.

5. **Git identity for commits**: Worktrees inherit the repo's git config. Set `user.email` and `user.name` in the mounted repo or via `GIT_AUTHOR_*` env vars (as done in docker-compose).

6. **Nx library import path aliases**: Verify the correct import alias (e.g., `@zibby-2-0/shared-types`) by checking `libs/shared-types/project.json` → `name` field, and `tsconfig.base.json` → `paths`.

7. **SSE in NestJS + RxJS**: The `@Sse()` decorator requires `Observable<MessageEvent>`. The `MessageEvent` type in NestJS SSE is `{ data: string; type?: string; id?: string; retry?: number }`. Ensure `SseService.subscribe()` returns the correct shape.
