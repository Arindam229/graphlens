import { useMemo, useEffect } from 'react';
import ReactFlow, {
  type Node as RFNode,
  type Edge as RFEdge,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { FileNode } from './FileNode';
import { computeLayout } from './computeLayout';
import type { AnalysisResult, GraphNodeData, GraphEdgeData } from '@/types';

function buildEgoNetwork(
  centerId: string,
  allNodes: GraphNodeData[],
  allEdges: GraphEdgeData[],
  hops = 2,
): { nodes: GraphNodeData[]; edges: GraphEdgeData[] } {
  const fwd = new Map<string, string[]>();
  const rev = new Map<string, string[]>();

  for (const e of allEdges) {
    if (!fwd.has(e.source)) fwd.set(e.source, []);
    fwd.get(e.source)!.push(e.target);
    if (!rev.has(e.target)) rev.set(e.target, []);
    rev.get(e.target)!.push(e.source);
  }

  const visited = new Set<string>([centerId]);
  let frontier = [centerId];

  for (let h = 0; h < hops; h++) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const nbr of [...(fwd.get(id) ?? []), ...(rev.get(id) ?? [])]) {
        if (!visited.has(nbr)) { visited.add(nbr); next.push(nbr); }
      }
    }
    frontier = next;
    if (frontier.length === 0) break;
  }

  const nodeMap  = new Map(allNodes.map(n => [n.id, n]));
  const egoEdges = allEdges.filter(e => visited.has(e.source) && visited.has(e.target));

  // Remove nodes that have no edges within the ego-network (except the center itself)
  const connectedInEgo = new Set<string>();
  for (const e of egoEdges) { connectedInEgo.add(e.source); connectedInEgo.add(e.target); }
  const egoNodes = [...visited]
    .filter(id => id === centerId || connectedInEgo.has(id))
    .map(id => nodeMap.get(id)!)
    .filter(Boolean);

  return { nodes: egoNodes, edges: egoEdges };
}

const NODE_TYPES = { file: FileNode };

interface Props {
  result: AnalysisResult;
  isDark: boolean;
  onNodeClick: (node: GraphNodeData) => void;
  selectedNodeId: string | null;
  onIsolatedCount?: (n: number) => void;
}

export function DependencyGraph({ result, isDark, onNodeClick, selectedNodeId, onIsolatedCount }: Props) {
  const cycleNodeIds = useMemo(
    () => new Set((result.cycles ?? []).flat()),
    [result.cycles],
  );

  const entryPointIds = useMemo(
    () => new Set((result.meta.entry_points ?? []).map(e => e.id)),
    [result.meta.entry_points],
  );

  // Focus: selected node or top entry point — drives ego-network
  const focusId = selectedNodeId ?? result.meta.entry_points?.[0]?.id ?? null;

  const { nodes: visibleNodes, edges: visibleEdges } = useMemo(() => {
    if (!focusId) return { nodes: result.graph.nodes, edges: result.graph.edges };
    return buildEgoNetwork(focusId, result.graph.nodes, result.graph.edges, 2);
  }, [focusId, result.graph.nodes, result.graph.edges]);

  // Nodes that appear in at least one visible edge
  const connectedIds = useMemo(() => {
    const s = new Set<string>();
    for (const e of visibleEdges) { s.add(e.source); s.add(e.target); }
    return s;
  }, [visibleEdges]);

  const pos = useMemo(
    () => computeLayout(visibleNodes, visibleEdges),
    [visibleNodes, visibleEdges],
  );

  const initialNodes: RFNode[] = useMemo(() =>
    visibleNodes.map(n => ({
      id: n.id,
      type: 'file',
      position: pos.get(n.id) ?? { x: 0, y: 0 },
      data: {
        label: n.label,
        isCyclic:     cycleNodeIds.has(n.id),
        isIsolated:   !connectedIds.has(n.id),
        isEntryPoint: entryPointIds.has(n.id),
        isDark,
        selected: n.id === selectedNodeId,
      },
    })),
    [result.graph.nodes, pos, cycleNodeIds, connectedIds, isDark, selectedNodeId],
  );

  useEffect(() => {
    const isolated = visibleNodes.length - connectedIds.size;
    onIsolatedCount?.(isolated);
  }, [visibleNodes.length, connectedIds.size, onIsolatedCount]);

  const initialEdges: RFEdge[] = useMemo(() =>
    visibleEdges.map((e, i) => {
      const isCyclic = cycleNodeIds.has(e.source) && cycleNodeIds.has(e.target);
      return {
        id: `e-${i}`,
        source: e.source,
        target: e.target,
        animated: isCyclic,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isCyclic ? '#ef4444' : (isDark ? '#4ade80' : '#16a34a'),
          width: 14,
          height: 14,
        },
        style: {
          stroke: isCyclic ? '#ef4444' : (isDark ? '#4ade80' : '#16a34a'),
          strokeWidth: isCyclic ? 2 : 1.5,
          opacity: 0.7,
        },
      };
    }),
    [result.graph.edges, cycleNodeIds, isDark],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => { setNodes(initialNodes); }, [initialNodes, setNodes]);
  useEffect(() => { setEdges(initialEdges); }, [initialEdges, setEdges]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={NODE_TYPES}
      nodesConnectable={false}
      onNodeClick={(_, node) => {
        const raw = result.graph.nodes.find(n => n.id === node.id);
        if (raw) onNodeClick(raw);  // refocuses ego-network + opens ExplainPanel
      }}
      fitView
      fitViewOptions={{ padding: 0.25 }}
      minZoom={0.05}
      style={{ background: isDark ? '#0a0f1e' : '#f8fafc', width: '100%', height: '100%' }}
    >
      <Background color={isDark ? '#1e293b' : '#e2e8f0'} gap={24} size={1} />
      <Controls showInteractive={false} />
      <MiniMap
        nodeColor={n => (n.data as any).isCyclic ? '#ef4444' : (isDark ? '#334155' : '#94a3b8')}
        maskColor={isDark ? 'rgba(10,15,30,0.7)' : 'rgba(248,250,252,0.7)'}
        style={{
          background: isDark ? '#1e293b' : '#f1f5f9',
          border: '1px solid',
          borderColor: isDark ? '#334155' : '#e2e8f0',
        }}
      />
    </ReactFlow>
  );
}
