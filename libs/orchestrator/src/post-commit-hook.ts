import { access, chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const NIGHTCODER_HOOK_MARKER = '# nightcoder-managed v1';

/**
 * Body of the post-commit hook NightCoder writes into `.git/hooks/post-commit`.
 *
 * The hook is env-guarded: it silently no-ops for every commit EXCEPT those
 * made inside a spawn that has `NIGHTCODER_JOURNAL_PATH` set. NightCoder is
 * the only thing that sets that env var, so the user's regular `git commit`
 * in the same repo won't trigger journal writes.
 */
export const HOOK_SCRIPT = `#!/bin/sh
${NIGHTCODER_HOOK_MARKER}
# Appends a journal entry for commits made during a NightCoder run.
# Exit silently when not invoked by NightCoder.
if [ -z "$NIGHTCODER_JOURNAL_PATH" ]; then
  exit 0
fi
HASH=$(git rev-parse HEAD)
SUBJECT=$(git log -1 --pretty=%s)
TS=$(date -u +%s)
mkdir -p "$(dirname "$NIGHTCODER_JOURNAL_PATH")" 2>/dev/null
printf '%s %s %s\\n' "$TS" "$HASH" "$SUBJECT" >> "$NIGHTCODER_JOURNAL_PATH"
exit 0
`;

export type HookInstallResult =
  | { kind: 'installed' }           // we wrote a fresh hook
  | { kind: 'refreshed' }            // our hook was already there, rewrote it (idempotent)
  | { kind: 'foreign'; preview: string }; // something else owns the hook, we refuse to touch it

export function isNightcoderHook(content: string): boolean {
  return content.includes(NIGHTCODER_HOOK_MARKER);
}

/**
 * Install (or refresh) the NightCoder post-commit hook at
 * `<repoPath>/.git/hooks/post-commit`. Returns `foreign` when a different
 * hook is already present — callers should fall back to polling `git log`.
 */
export async function installPostCommitHook(repoPath: string): Promise<HookInstallResult> {
  const hooksDir = path.join(repoPath, '.git', 'hooks');
  const hookPath = path.join(hooksDir, 'post-commit');

  await mkdir(hooksDir, { recursive: true });

  let existing: string | null = null;
  try {
    await access(hookPath);
    existing = await readFile(hookPath, 'utf8');
  } catch {
    existing = null;
  }

  if (existing !== null && !isNightcoderHook(existing)) {
    const preview = existing.split('\n').slice(0, 3).join('\n').slice(0, 300);
    return { kind: 'foreign', preview };
  }

  await writeFile(hookPath, HOOK_SCRIPT, 'utf8');
  await chmod(hookPath, 0o755);
  return { kind: existing === null ? 'installed' : 'refreshed' };
}
