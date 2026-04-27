import React from 'react';
import type { RepoTreeEntry } from '@nightcoder/shared-types/ipc';
import { Icon, IconName, Surface, Text } from '@nightcoder/design-system';

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
    <Surface as="ul">
      {nodes.map((node) => (
        <TreeNode
          key={node.path}
          node={node}
          depth={depth}
          expanded={expanded}
          onToggle={onToggle}
        />
      ))}
    </Surface>
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
    <Surface as="li">
      <Surface
        draggable
        onDragStart={onDragStart}
        onClick={() => isDir && onToggle(node.path)}
        title={node.path}
        direction="row"
        align="center"
        gap={4}
        paddingLeft={8 + depth * 12}
        paddingRight={8}
        paddingTop={3}
        paddingBottom={3}
        cursor={isDir ? 'pointer' : 'grab'}
        userSelect="none"
        radius="sm"
        interactive
      >
        <Surface width={12} direction="row" align="center">
          {isDir ? (
            <Icon
              value={isOpen ? IconName.ChevronDown : IconName.ChevronRight}
              size="xs"
            />
          ) : null}
        </Surface>
        <Surface direction="row" align="center">
          <Icon value={isDir ? IconName.Folder : IconName.File} size="xs" />
        </Surface>
        <Text size="sm" mono tone={isDir ? 'subtle' : 'muted'} truncate>
          {node.name}
        </Text>
      </Surface>
      {isDir && isOpen && node.children && node.children.length > 0 && (
        <TreeList
          nodes={node.children}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
        />
      )}
    </Surface>
  );
}
