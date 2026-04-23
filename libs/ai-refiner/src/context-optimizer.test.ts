import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { optimizeContext, estimateTokens } from './context-optimizer';
import type { RepoContext } from './repo-context';

const LARGE_README = `# My Project

A project that does many things.

## Quick start

\`\`\`bash
npm install
npm start
\`\`\`

## Features

- Feature A that is very useful
- Feature B that is also useful
- Feature C with a long description that goes on and on
- Feature D which integrates with Feature A and Feature B

## Installation

Full installation steps follow. First, you need to clone the repository:

\`\`\`bash
git clone https://github.com/example/my-project
cd my-project
\`\`\`

## Configuration

Many configuration options are available. See the config docs for full details.
`.repeat(10); // Repeat to make it large

const LARGE_PACKAGE_JSON = JSON.stringify(
  {
    name: 'my-project',
    version: '1.2.3',
    description: 'A useful project',
    type: 'module',
    scripts: { build: 'tsc', test: 'vitest run', lint: 'eslint .' },
    engines: { node: '>=18' },
    packageManager: 'pnpm@9.0.0',
    dependencies: Object.fromEntries(
      Array.from({ length: 30 }, (_, i) => [`dep-${i}`, `^${i}.0.0`])
    ),
    devDependencies: Object.fromEntries(
      Array.from({ length: 40 }, (_, i) => [`dev-dep-${i}`, `^${i}.0.0`])
    ),
  },
  null,
  2
);

function makeCtx(overrides: Partial<RepoContext> = {}): RepoContext {
  return {
    folderPath: '/tmp/repo',
    aiConventions: [],
    projectInfo: [
      { relPath: 'README.md', content: LARGE_README },
      { relPath: 'package.json', content: LARGE_PACKAGE_JSON },
    ],
    tree: '📁 src\n  📄 index.ts\n📄 package.json',
    ...overrides,
  };
}

describe('estimateTokens', () => {
  it('returns ceil(length/4)', () => {
    expect(estimateTokens('aaaa')).toBe(1);
    expect(estimateTokens('aaaaa')).toBe(2);
    expect(estimateTokens('')).toBe(0);
  });
});

describe('optimizeContext', () => {
  beforeEach(() => {
    delete process.env.ZIBBY_SKIP_CONTEXT_OPTIMIZATION;
  });

  afterEach(() => {
    delete process.env.ZIBBY_SKIP_CONTEXT_OPTIMIZATION;
  });

  it('reduces token count by at least 30% on realistic fixture', () => {
    const ctx = makeCtx();
    const rawSize = ctx.projectInfo.reduce((n, f) => n + f.content.length, 0);

    const optimized = optimizeContext(ctx);
    const optimizedSize = optimized.projectInfo.reduce((n, f) => n + f.content.length, 0);

    const reduction = 1 - optimizedSize / rawSize;
    expect(reduction).toBeGreaterThanOrEqual(0.3);
  });

  it('truncates README at first ## heading after intro', () => {
    const ctx = makeCtx();
    const optimized = optimizeContext(ctx);
    const readme = optimized.projectInfo.find((f) => f.relPath === 'README.md');
    expect(readme).toBeDefined();
    expect(readme!.content).toContain('…[truncated for planning context]');
    // Should stop at the first ## after line 5
    expect(readme!.content.split('\n').length).toBeLessThan(LARGE_README.split('\n').length);
  });

  it('truncates README at horizontal rule', () => {
    const withHr = '# Title\n\nIntro paragraph.\n\n---\n\n## More content\n\nExtra content.'.repeat(5);
    const ctx = makeCtx({ projectInfo: [{ relPath: 'README.md', content: withHr }] });
    const optimized = optimizeContext(ctx);
    const readme = optimized.projectInfo.find((f) => f.relPath === 'README.md');
    expect(readme!.content).toContain('…[truncated for planning context]');
    expect(readme!.content).not.toContain('## More content');
  });

  it('strips dependencies and devDependencies from package.json', () => {
    const ctx = makeCtx();
    const optimized = optimizeContext(ctx);
    const pkg = optimized.projectInfo.find((f) => f.relPath === 'package.json');
    expect(pkg).toBeDefined();
    const parsed = JSON.parse(pkg!.content) as Record<string, unknown>;
    expect(parsed.dependencies).toBeUndefined();
    expect(parsed.devDependencies).toBeUndefined();
    expect(parsed.name).toBe('my-project');
    expect(parsed.scripts).toBeDefined();
    expect(parsed.packageManager).toBeDefined();
  });

  it('returns original context when ZIBBY_SKIP_CONTEXT_OPTIMIZATION=1', () => {
    process.env.ZIBBY_SKIP_CONTEXT_OPTIMIZATION = '1';
    const ctx = makeCtx();
    const result = optimizeContext(ctx);
    expect(result).toBe(ctx);
    const pkg = result.projectInfo.find((f) => f.relPath === 'package.json');
    const parsed = JSON.parse(pkg!.content) as Record<string, unknown>;
    expect(parsed.dependencies).toBeDefined();
  });

  it('preserves aiConventions unchanged', () => {
    const ctx = makeCtx({
      aiConventions: [{ relPath: 'CLAUDE.md', content: 'Use pnpm. Never use npm.' }],
    });
    const optimized = optimizeContext(ctx);
    expect(optimized.aiConventions).toEqual(ctx.aiConventions);
  });

  it('preserves short README without truncation marker', () => {
    const short = '# Title\n\nJust a brief description.';
    const ctx = makeCtx({ projectInfo: [{ relPath: 'README.md', content: short }] });
    const optimized = optimizeContext(ctx);
    const readme = optimized.projectInfo.find((f) => f.relPath === 'README.md');
    expect(readme!.content).toBe(short);
    expect(readme!.content).not.toContain('…[truncated');
  });
});
