import { describe, expect, it } from 'vitest';
import { parseUnifiedDiff } from './task-diff';

describe('parseUnifiedDiff', () => {
  it('returns an empty array for empty input', () => {
    expect(parseUnifiedDiff('')).toEqual([]);
    expect(parseUnifiedDiff('   \n\n')).toEqual([]);
  });

  it('parses a simple modification', () => {
    const raw = [
      'diff --git a/foo.ts b/foo.ts',
      'index abc..def 100644',
      '--- a/foo.ts',
      '+++ b/foo.ts',
      '@@ -1,3 +1,3 @@',
      ' unchanged',
      '-old',
      '+new',
      ' unchanged2',
    ].join('\n');
    const files = parseUnifiedDiff(raw);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({
      oldPath: 'foo.ts',
      newPath: 'foo.ts',
      changeKind: 'modified',
      lang: 'typescript',
    });
    expect(files[0].hunks).toHaveLength(1);
    expect(files[0].hunks[0]).toContain('@@ -1,3 +1,3 @@');
    expect(files[0].hunks[0]).toContain('+new');
  });

  it('detects added files via new file mode and /dev/null old path', () => {
    const raw = [
      'diff --git a/created.md b/created.md',
      'new file mode 100644',
      'index 0000000..1234567',
      '--- /dev/null',
      '+++ b/created.md',
      '@@ -0,0 +1,2 @@',
      '+hello',
      '+world',
    ].join('\n');
    const [file] = parseUnifiedDiff(raw);
    expect(file.changeKind).toBe('added');
    expect(file.oldPath).toBeNull();
    expect(file.newPath).toBe('created.md');
    expect(file.lang).toBe('markdown');
  });

  it('detects deleted files', () => {
    const raw = [
      'diff --git a/gone.js b/gone.js',
      'deleted file mode 100644',
      'index 1234567..0000000',
      '--- a/gone.js',
      '+++ /dev/null',
      '@@ -1,1 +0,0 @@',
      '-bye',
    ].join('\n');
    const [file] = parseUnifiedDiff(raw);
    expect(file.changeKind).toBe('deleted');
    expect(file.oldPath).toBe('gone.js');
    expect(file.newPath).toBeNull();
  });

  it('detects renames', () => {
    const raw = [
      'diff --git a/old.ts b/new.ts',
      'similarity index 100%',
      'rename from old.ts',
      'rename to new.ts',
    ].join('\n');
    const [file] = parseUnifiedDiff(raw);
    expect(file.changeKind).toBe('renamed');
    expect(file.oldPath).toBe('old.ts');
    expect(file.newPath).toBe('new.ts');
    expect(file.hunks).toEqual([]);
  });

  it('marks binary diffs', () => {
    const raw = [
      'diff --git a/logo.png b/logo.png',
      'index 1111111..2222222 100644',
      'Binary files a/logo.png and b/logo.png differ',
    ].join('\n');
    const [file] = parseUnifiedDiff(raw);
    expect(file.changeKind).toBe('binary');
    expect(file.hunks).toEqual([]);
  });

  it('splits multiple hunks for the same file', () => {
    const raw = [
      'diff --git a/a.ts b/a.ts',
      '--- a/a.ts',
      '+++ b/a.ts',
      '@@ -1,2 +1,2 @@',
      '-old1',
      '+new1',
      ' ctx',
      '@@ -10,2 +10,2 @@',
      '-old2',
      '+new2',
      ' ctx2',
    ].join('\n');
    const [file] = parseUnifiedDiff(raw);
    expect(file.hunks).toHaveLength(2);
    expect(file.hunks[0]).toContain('@@ -1,2 +1,2 @@');
    expect(file.hunks[0]).toContain('+new1');
    expect(file.hunks[1]).toContain('@@ -10,2 +10,2 @@');
    expect(file.hunks[1]).toContain('+new2');
  });

  it('parses multiple files in a single diff', () => {
    const raw = [
      'diff --git a/a.ts b/a.ts',
      '--- a/a.ts',
      '+++ b/a.ts',
      '@@ -1 +1 @@',
      '-a',
      '+A',
      'diff --git a/b.md b/b.md',
      '--- a/b.md',
      '+++ b/b.md',
      '@@ -1 +1 @@',
      '-b',
      '+B',
      '',
    ].join('\n');
    const files = parseUnifiedDiff(raw);
    expect(files).toHaveLength(2);
    expect(files[0].newPath).toBe('a.ts');
    expect(files[0].lang).toBe('typescript');
    expect(files[1].newPath).toBe('b.md');
    expect(files[1].lang).toBe('markdown');
  });
});
