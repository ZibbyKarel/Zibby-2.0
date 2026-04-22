import type { Dependency } from '@zibby/shared-types/ipc';

export type DagNode = {
  index: number;
  waitingFor: Set<number>;
  successors: Set<number>;
};

export function buildDag(storyCount: number, deps: Dependency[]): DagNode[] {
  const nodes: DagNode[] = Array.from({ length: storyCount }, (_, i) => ({
    index: i,
    waitingFor: new Set<number>(),
    successors: new Set<number>(),
  }));

  for (const d of deps) {
    if (
      !Number.isInteger(d.from) ||
      !Number.isInteger(d.to) ||
      d.from < 0 ||
      d.to < 0 ||
      d.from >= storyCount ||
      d.to >= storyCount ||
      d.from === d.to
    ) {
      continue;
    }
    nodes[d.to].waitingFor.add(d.from);
    nodes[d.from].successors.add(d.to);
  }

  if (hasCycle(nodes)) {
    throw new Error('Dependency graph contains a cycle.');
  }

  return nodes;
}

function hasCycle(nodes: DagNode[]): boolean {
  const inDegree = nodes.map((n) => n.waitingFor.size);
  const queue: number[] = [];
  for (let i = 0; i < inDegree.length; i++) if (inDegree[i] === 0) queue.push(i);
  let visited = 0;
  while (queue.length > 0) {
    const i = queue.shift()!;
    visited++;
    for (const s of nodes[i].successors) {
      inDegree[s]--;
      if (inDegree[s] === 0) queue.push(s);
    }
  }
  return visited < nodes.length;
}

export function collectTransitiveSuccessors(nodes: DagNode[], rootIndex: number): Set<number> {
  const out = new Set<number>();
  const stack = [...nodes[rootIndex].successors];
  while (stack.length > 0) {
    const i = stack.pop()!;
    if (out.has(i)) continue;
    out.add(i);
    for (const s of nodes[i].successors) stack.push(s);
  }
  return out;
}
