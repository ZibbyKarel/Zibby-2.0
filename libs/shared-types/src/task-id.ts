import type { Story } from './ipc';

export function slugify(input: string): string {
  const normalized = input
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return normalized || 'task';
}

export function uniqueSlug(base: string, existing: ReadonlySet<string>): string {
  if (!existing.has(base)) return base;
  let i = 2;
  while (existing.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

/**
 * Stamps a stable `taskId` on each story. Existing non-empty taskIds are
 * preserved; missing or colliding ones are regenerated from the title with a
 * numeric suffix. The result has every story's taskId guaranteed unique.
 */
export function assignTaskIds<T extends { title: string; taskId?: string }>(
  stories: readonly T[],
): (T & { taskId: string })[] {
  const used = new Set<string>();
  const out: (T & { taskId: string })[] = [];
  for (const s of stories) {
    const incoming = s.taskId && s.taskId.length > 0 ? s.taskId : '';
    const base = incoming || slugify(s.title);
    const id = uniqueSlug(base, used);
    used.add(id);
    out.push({ ...s, taskId: id });
  }
  return out;
}

/** Compute a fresh taskId for a story being added to an existing plan. */
export function taskIdForNewStory(title: string, existing: ReadonlySet<string>): string {
  return uniqueSlug(slugify(title), existing);
}

/** Collect all taskIds in a plan as a Set (handy for taskIdForNewStory). */
export function collectTaskIds(stories: readonly Story[]): Set<string> {
  return new Set(stories.map((s) => s.taskId).filter((id): id is string => !!id));
}
