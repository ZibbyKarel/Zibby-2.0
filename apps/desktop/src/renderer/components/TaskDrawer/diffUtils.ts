import type { TaskDiffFile } from '@nightcoder/shared-types/ipc';
import type { TextTone } from '@nightcoder/design-system';
import type { HunkLine, HunkRowBackground } from './types';

export function diffSummary(f: TaskDiffFile): { adds: number; dels: number } {
  let adds = 0;
  let dels = 0;
  for (const h of f.hunks) {
    for (const line of h.split('\n')) {
      if (line.startsWith('+') && !line.startsWith('+++')) adds++;
      else if (line.startsWith('-') && !line.startsWith('---')) dels++;
    }
  }
  return { adds, dels };
}

export function filePathLabel(f: TaskDiffFile): string {
  if (f.changeKind === 'renamed' && f.oldPath && f.newPath && f.oldPath !== f.newPath) {
    return `${f.oldPath} → ${f.newPath}`;
  }
  return f.newPath ?? f.oldPath ?? '(unknown)';
}

export function changeKindTone(kind: TaskDiffFile['changeKind']): TextTone {
  switch (kind) {
    case 'added':   return 'emerald';
    case 'deleted': return 'rose';
    case 'renamed': return 'sky';
    case 'binary':  return 'faint';
    default:        return 'amber';
  }
}

export function parseHunkLines(hunk: string): HunkLine[] {
  const out: HunkLine[] = [];
  const lines = hunk.split('\n');
  let oldLine = 0;
  let newLine = 0;
  for (const line of lines) {
    if (line.startsWith('@@')) {
      const m = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (m) {
        oldLine = Number(m[1]);
        newLine = Number(m[2]);
      }
      out.push({ kind: 'header', text: line });
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      out.push({ kind: 'add', text: line.slice(1), newLine });
      newLine++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      out.push({ kind: 'del', text: line.slice(1), oldLine });
      oldLine++;
    } else if (line.startsWith(' ')) {
      out.push({ kind: 'context', text: line.slice(1), oldLine, newLine });
      oldLine++;
      newLine++;
    } else if (line.length > 0) {
      out.push({ kind: 'other', text: line });
    }
  }
  return out;
}

export function rowBackground(kind: HunkLine['kind']): HunkRowBackground {
  switch (kind) {
    case 'add':    return 'emeraldTint';
    case 'del':    return 'roseTint';
    case 'header': return 'bg2';
    default:       return 'transparent';
  }
}
