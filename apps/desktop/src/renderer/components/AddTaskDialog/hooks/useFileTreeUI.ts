import { useEffect, useMemo, useState } from 'react';
import type { RepoTreeEntry } from '@nightcoder/shared-types/ipc';
import { filterTree, collectDirPaths } from '../FileTree/FileTree';
import { TREE_STORAGE_KEY, readTreeStoragePref } from '../types';

export function useFileTreeUI(tree: RepoTreeEntry[]) {
  const [showTree, setShowTree] = useState<boolean>(readTreeStoragePref);
  const [treeFilter, setTreeFilter] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [dropActive, setDropActive] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(TREE_STORAGE_KEY, showTree ? '1' : '0');
    } catch {
      /* noop */
    }
  }, [showTree]);

  const filteredTree = useMemo(
    () => filterTree(tree, treeFilter),
    [tree, treeFilter],
  );

  const effectiveExpanded = useMemo(() => {
    if (!treeFilter) return expanded;
    const s = new Set(expanded);
    collectDirPaths(filteredTree, s);
    return s;
  }, [expanded, filteredTree, treeFilter]);

  const toggleDir = (dirPath: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(dirPath)) next.delete(dirPath);
      else next.add(dirPath);
      return next;
    });
  };

  const reset = () => {
    setTreeFilter('');
    setExpanded(new Set());
    setDropActive(false);
  };

  return {
    showTree,
    setShowTree,
    treeFilter,
    setTreeFilter,
    dropActive,
    setDropActive,
    filteredTree,
    effectiveExpanded,
    toggleDir,
    reset,
  };
}
