import type { GraphNodeData, GraphEdgeData } from '@/types';

const COL_GAP     = 190;
const ROW_GAP     = 90;
const MAX_PER_ROW = 5;
const ISLAND_GAP  = 160; // vertical gap between connected graph and isolated section

export function computeLayout(
  nodes: GraphNodeData[],
  edges: GraphEdgeData[],
): Map<string, { x: number; y: number }> {
  // ── which nodes have at least one edge? ──
  const connectedIds = new Set<string>();
  for (const e of edges) { connectedIds.add(e.source); connectedIds.add(e.target); }

  const connected = nodes.filter(n =>  connectedIds.has(n.id));
  const isolated  = nodes.filter(n => !connectedIds.has(n.id));

  const pos = new Map<string, { x: number; y: number }>();

  // ── BFS layout for connected nodes ──
  const nodeIds  = new Set(connected.map(n => n.id));
  const inDegree = new Map<string, number>(connected.map(n => [n.id, 0]));
  const children = new Map<string, string[]>(connected.map(n => [n.id, []]));

  for (const e of edges) {
    if (!nodeIds.has(e.source) || !nodeIds.has(e.target)) continue;
    children.get(e.source)!.push(e.target);
    inDegree.set(e.target, (inDegree.get(e.target) ?? 0) + 1);
  }

  const level = new Map<string, number>();
  const queue: string[] = [];
  for (const n of connected) {
    if (inDegree.get(n.id) === 0) { level.set(n.id, 0); queue.push(n.id); }
  }
  for (const n of connected) {
    if (!level.has(n.id)) { level.set(n.id, 0); queue.push(n.id); }
  }

  const processed = new Set<string>();
  let head = 0;
  while (head < queue.length) {
    const id = queue[head++];
    if (processed.has(id)) continue;
    processed.add(id);
    const l = level.get(id)!;
    for (const child of children.get(id) ?? []) {
      if (!level.has(child)) { level.set(child, l + 1); queue.push(child); }
    }
  }

  const byLevel = new Map<number, string[]>();
  for (const [id, l] of level) {
    if (!byLevel.has(l)) byLevel.set(l, []);
    byLevel.get(l)!.push(id);
  }

  let currentY = 0;
  for (const l of [...byLevel.keys()].sort((a, b) => a - b)) {
    const ids = byLevel.get(l)!;
    for (let row = 0; row < Math.ceil(ids.length / MAX_PER_ROW); row++) {
      const rowIds = ids.slice(row * MAX_PER_ROW, (row + 1) * MAX_PER_ROW);
      const totalW = rowIds.length * COL_GAP;
      rowIds.forEach((id, i) => {
        pos.set(id, { x: i * COL_GAP - totalW / 2 + COL_GAP / 2, y: currentY });
      });
      currentY += ROW_GAP;
    }
  }

  // ── grid layout for isolated nodes, below connected graph ──
  if (isolated.length > 0) {
    const islandStartY = currentY + ISLAND_GAP;
    isolated.forEach((n, i) => {
      const row   = Math.floor(i / MAX_PER_ROW);
      const col   = i % MAX_PER_ROW;
      const count = Math.min(isolated.length - row * MAX_PER_ROW, MAX_PER_ROW);
      const totalW = count * COL_GAP;
      pos.set(n.id, {
        x: col * COL_GAP - totalW / 2 + COL_GAP / 2,
        y: islandStartY + row * ROW_GAP,
      });
    });
  }

  return pos;
}
