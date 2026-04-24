import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { HOOK_SCRIPT, installPostCommitHook, isNightcoderHook, NIGHTCODER_HOOK_MARKER } from './post-commit-hook';

let repo: string;

beforeEach(async () => {
  repo = await mkdtemp(path.join(os.tmpdir(), 'nc-hook-'));
  await mkdir(path.join(repo, '.git', 'hooks'), { recursive: true });
});

afterEach(async () => {
  await rm(repo, { recursive: true, force: true });
});

describe('installPostCommitHook', () => {
  it('installs a fresh hook when none exists', async () => {
    const result = await installPostCommitHook(repo);
    expect(result.kind).toBe('installed');
    const contents = await readFile(path.join(repo, '.git', 'hooks', 'post-commit'), 'utf8');
    expect(contents).toContain(NIGHTCODER_HOOK_MARKER);
    expect(contents).toContain('NIGHTCODER_JOURNAL_PATH');
  });

  it('refreshes an existing NightCoder hook idempotently', async () => {
    await installPostCommitHook(repo);
    const result = await installPostCommitHook(repo);
    expect(result.kind).toBe('refreshed');
    const contents = await readFile(path.join(repo, '.git', 'hooks', 'post-commit'), 'utf8');
    expect(contents).toBe(HOOK_SCRIPT);
  });

  it('refuses to overwrite a foreign hook', async () => {
    const foreign = '#!/bin/sh\n# husky\nnpx lint-staged\n';
    await writeFile(path.join(repo, '.git', 'hooks', 'post-commit'), foreign, 'utf8');
    const result = await installPostCommitHook(repo);
    expect(result.kind).toBe('foreign');
    if (result.kind === 'foreign') expect(result.preview).toContain('husky');
    const after = await readFile(path.join(repo, '.git', 'hooks', 'post-commit'), 'utf8');
    expect(after).toBe(foreign);
  });
});

describe('isNightcoderHook', () => {
  it('detects the marker', () => {
    expect(isNightcoderHook(HOOK_SCRIPT)).toBe(true);
    expect(isNightcoderHook('#!/bin/sh\necho hi\n')).toBe(false);
  });
});
