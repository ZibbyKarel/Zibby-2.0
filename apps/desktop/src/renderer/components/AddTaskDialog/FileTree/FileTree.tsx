import React from 'react';
import type { RepoTreeEntry } from '@nightcoder/shared-types/ipc';
import {
  Container,
  Icon,
  IconName,
  Stack,
  Text,
} from '@nightcoder/design-system';
import { TreeRow } from './TreeRow';

export const DRAG_MIME = 'application/x-nightcoder-path';

export function basename(p: string): string {
  const idx = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  return idx >= 0 ? p.slice(idx + 1) : p;
}

/** Recursively keep only nodes whose path or descendants match the query. */
export function filterTree(
  nodes: readonly RepoTreeEntry[],
  query: string,
): RepoTreeEntry[] {
  if (!query) return [...nodes];
  const q = query.toLowerCase();
  const out: RepoTreeEntry[] = [];
  for (const n of nodes) {
    if (n.kind === 'dir' && n.children) {
      const kids = filterTree(n.children, query);
      if (kids.length > 0 || n.path.toLowerCase().includes(q)) {
        out.push({ ...n, children: kids });
      }
    } else if (
      n.path.toLowerCase().includes(q) ||
      n.name.toLowerCase().includes(q)
    ) {
      out.push(n);
    }
  }
  return out;
}

/** Collect every dir path under a tree — used to auto-expand when filtering. */
export function collectDirPaths(
  nodes: readonly RepoTreeEntry[],
  into: Set<string>,
): void {
  for (const n of nodes) {
    if (n.kind === 'dir') {
      into.add(n.path);
      if (n.children) collectDirPaths(n.children, into);
    }
  }
}

export function TreeList({
  nodes,
  depth,
  expanded,
  onToggle,
}: {
  nodes: readonly RepoTreeEntry[];
  depth: number;
  expanded: ReadonlySet<string>;
  onToggle: (path: string) => void;
}) {
  return (
    <Container as="ul">
      {nodes.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          depth={depth}
          expanded={expanded}
          onToggle={onToggle}
        />
      ))}
    </Container>
  );
}

function TreeNode({
  node,
  depth,
  expanded,
  onToggle,
}: {
  node: RepoTreeEntry;
  depth: number;
  expanded: ReadonlySet<string>;
  onToggle: (path: string) => void;
}) {
  const isDir = node.kind === 'dir';
  const isOpen = isDir && expanded.has(node.path);

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(DRAG_MIME, node.path);
    e.dataTransfer.setData('text/plain', `@${node.path}`);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <Container as="li">
      <TreeRow
        depth={depth}
        cursor={isDir ? 'pointer' : 'grab'}
        draggable
        onDragStart={onDragStart}
        onClick={() => isDir && onToggle(node.path)}
        title={node.path}
      >
        <Container width={12}>
          {isDir ? (
            <Icon
              value={isOpen ? IconName.ChevronDown : IconName.ChevronRight}
              size="xs"
            />
          ) : null}
        </Container>
        <Stack direction="row" align="center">
          <Icon value={isDir ? IconName.Folder : IconName.File} size="xs" />
        </Stack>
        <Text size="sm" mono tone={isDir ? 'subtle' : 'muted'} truncate>
          {node.name}
        </Text>
      </TreeRow>
      {isDir && isOpen && node.children && node.children.length > 0 && (
        <TreeList
          nodes={node.children}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
        />
      )}
    </Container>
  );
}
