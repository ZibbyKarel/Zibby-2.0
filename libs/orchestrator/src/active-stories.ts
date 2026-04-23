const active = new Set<string>();

function key(repoPath: string, baseSlug: string): string {
  return `${repoPath}::${baseSlug}`;
}

export function tryClaimStory(repoPath: string, baseSlug: string): (() => void) | null {
  const k = key(repoPath, baseSlug);
  if (active.has(k)) return null;
  active.add(k);
  return () => {
    active.delete(k);
  };
}

export function isStoryActive(repoPath: string, baseSlug: string): boolean {
  return active.has(key(repoPath, baseSlug));
}
