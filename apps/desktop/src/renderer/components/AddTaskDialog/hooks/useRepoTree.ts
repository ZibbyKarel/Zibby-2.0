import { useEffect, useState } from 'react';
import type { RepoTreeEntry } from '@nightcoder/shared-types/ipc';

type RepoTreeState = {
  tree: RepoTreeEntry[];
  loading: boolean;
  error: string | null;
};

export function useRepoTree(
  open: boolean,
  folderPath: string | null | undefined,
): RepoTreeState {
  const [tree, setTree] = useState<RepoTreeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !folderPath) {
      setTree([]);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    window.nightcoder
      .listRepoTree({ folderPath })
      .then((res) => {
        if (cancelled) return;
        if (res.kind === 'ok') {
          setTree(res.tree);
        } else {
          setTree([]);
          setError(res.message);
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setTree([]);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, folderPath]);

  return { tree, loading, error };
}
