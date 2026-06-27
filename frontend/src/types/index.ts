export type Theme = 'dark' | 'light';

export type GraphNodeData = { id: string; label: string; type: string; loc: number; package?: string };
export type GraphEdgeData = { source: string; target: string; source_package?: string; target_package?: string };

export type EntryPoint = {
  id: string;
  label: string;
  package?: string;
  reason: string;
  in_degree: number;
};

export type AnalysisResult = {
  status: string;
  cached?: boolean;
  graph: { nodes: GraphNodeData[]; edges: GraphEdgeData[] };
  meta: {
    total_files?: number;
    total_loc?: number;
    total_edges?: number;
    cycles_found?: number;
    language?: string;
    dep_count?: number;
    circular_count?: number;
    analyzed_at?: string;
    entry_points?: EntryPoint[];
    repo_summary?: string;
  };
  cycles?: string[][];
};

export type HistoryItem = {
  id: string;
  repo: string;
  type: string;
  language: string;
  dep_count: number;
  circular_count: number;
  analyzed_at: string;
};

export type HistoryPage = {
  items: HistoryItem[];
  total: number;
  page: number;
  pages: number;
};
