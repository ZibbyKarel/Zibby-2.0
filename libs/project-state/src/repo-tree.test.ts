import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, mkdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readRepoTree } from './repo-tree';

describe('readRepoTree', () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'repo-tree-'));
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  async function touch(relPath: string): Promise<void> {
    const abs = path.join(root, relPath);
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, '', 'utf8');
  }

  it('returns a sorted tree with dirs before files', async () => {
    await touch('src/a.ts');
    await touch('src/b.ts');
    await touch('README.md');
    await touch('package.json');

    const { tree, truncated } = await readRepoTree(root);
    expect(truncated).toBe(false);
    // Top level: src (dir) before README.md, package.json (files, case-insensitive sort)
    expect(tree.map((n) => n.name)).toEqual(['src', 'package.json', 'README.md']);
    const src = tree.find((n) => n.name === 'src');
    expect(src?.type).toBe('dir');
    expect(src?.children?.map((n) => n.name)).toEqual(['a.ts', 'b.ts']);
  });

  it('skips default-ignored directories (.git, node_modules, .worktrees)', async () => {
    await touch('.git/HEAD');
    await touch('node_modules/foo/index.js');
    await touch('.worktrees/slug/foo.ts');
    await touch('dist-renderer/assets.js');
    await touch('.nightcoder/index.json');
    await touch('src/app.ts');

    const { tree } = await readRepoTree(root);
    const names = tree.map((n) => n.name);
    expect(names).not.toContain('.git');
    expect(names).not.toContain('node_modules');
    expect(names).not.toContain('.worktrees');
    expect(names).not.toContain('dist-renderer');
    expect(names).not.toContain('.nightcoder');
    expect(names).toContain('src');
  });

  it('honors extra ignore entries', async () => {
    await touch('secrets/prod.env');
    await touch('src/index.ts');
    const { tree } = await readRepoTree(root, { ignore: ['secrets'] });
    expect(tree.map((n) => n.name)).toEqual(['src']);
  });

  it('caps depth and truncates entries', async () => {
    for (let i = 0; i < 10; i++) {
      await touch(`pkg/f${i}.ts`);
    }
    const { tree, truncated } = await readRepoTree(root, { maxEntries: 4 });
    expect(truncated).toBe(true);
    // first entry is the directory 'pkg', then 3 more children before cutoff
    const pkg = tree[0];
    expect(pkg?.name).toBe('pkg');
    expect(pkg?.children?.length ?? 0).toBeLessThanOrEqual(3);
  });

  it('does not follow symlinks', async () => {
    await touch('real/file.ts');
    await symlink(path.join(root, 'real'), path.join(root, 'linked'));
    const { tree } = await readRepoTree(root);
    expect(tree.map((n) => n.name)).toEqual(['real']);
  });

  it('returns empty tree on missing directory', async () => {
    const missing = path.join(root, 'does-not-exist');
    const { tree, truncated } = await readRepoTree(missing);
    expect(tree).toEqual([]);
    expect(truncated).toBe(false);
  });
});
