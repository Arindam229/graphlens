import { AnimatePresence, motion } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import {
  Zap, FolderOpen, AlertCircle, AlertTriangle, Code2, Clock,
  ChevronRight, Search, X, GitBranch, MousePointerClick, Network,
} from 'lucide-react';
import type { AnalysisResult, GraphNodeData } from '@/types';

// ── File type helpers ──────────────────────────────────────────────────────────

function fileExtColor(name: string): string {
  if (name.endsWith('.tsx') || name.endsWith('.ts')) return '#3b82f6';
  if (name.endsWith('.jsx') || name.endsWith('.js')) return '#eab308';
  if (name.endsWith('.py')) return '#22c55e';
  if (name.endsWith('.go')) return '#06b6d4';
  if (name.endsWith('.rs')) return '#f97316';
  return '#94a3b8';
}

function FileIcon({ name, size = 10 }: { name: string; size?: number }) {
  const ext = name.split('.').pop()?.toUpperCase().slice(0, 2) ?? '  ';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size + 6, height: size + 4,
      borderRadius: 3,
      background: fileExtColor(name) + '22',
      border: `1px solid ${fileExtColor(name)}55`,
      color: fileExtColor(name),
      fontSize: 7, fontFamily: 'monospace', fontWeight: 700,
      flexShrink: 0, lineHeight: 1,
    }}>
      {ext}
    </span>
  );
}

// ── File Tree ─────────────────────────────────────────────────────────────────

type TreeNode = {
  name: string;
  path: string;
  isFile: boolean;
  children: Map<string, TreeNode>;
  graphNode?: GraphNodeData;
};

function buildTree(nodes: GraphNodeData[]): TreeNode {
  const root: TreeNode = { name: '', path: '', isFile: false, children: new Map() };
  for (const n of nodes) {
    const parts = n.id.split('/');
    let cur = root;
    parts.forEach((part, i) => {
      if (!cur.children.has(part)) {
        cur.children.set(part, {
          name: part,
          path: parts.slice(0, i + 1).join('/'),
          isFile: i === parts.length - 1,
          children: new Map(),
          graphNode: i === parts.length - 1 ? n : undefined,
        });
      }
      cur = cur.children.get(part)!;
    });
  }
  return root;
}

function countFiles(node: TreeNode): number {
  if (node.isFile) return 1;
  let count = 0;
  for (const child of node.children.values()) count += countFiles(child);
  return count;
}

function getAncestorPaths(nodeId: string): string[] {
  const parts = nodeId.split('/');
  return parts.slice(0, -1).map((_, i) => parts.slice(0, i + 1).join('/'));
}

function TreeNodeView({
  node, depth, expanded, toggle, onFileClick, selectedNodeId, entryPointIds, cycleNodeIds, isLast,
}: {
  node: TreeNode; depth: number; isLast: boolean;
  expanded: Set<string>; toggle: (p: string) => void;
  onFileClick: (n: GraphNodeData) => void;
  selectedNodeId: string | null;
  entryPointIds: Set<string>;
  cycleNodeIds: Set<string>;
}) {
  const isExpanded = expanded.has(node.path);
  const isSelected = node.graphNode?.id === selectedNodeId;
  const isEntry    = node.graphNode ? entryPointIds.has(node.graphNode.id) : false;
  const isCyclic   = node.graphNode ? cycleNodeIds.has(node.graphNode.id) : false;

  if (node.isFile) {
    const labelColor = isCyclic ? '#ef4444' : isSelected ? '#4ade80' : isEntry ? '#f59e0b' : undefined;
    return (
      <button
        onClick={() => node.graphNode && onFileClick(node.graphNode)}
        title={node.graphNode?.id}
        style={{ paddingLeft: `${6 + depth * 14}px` }}
        className={`w-full flex items-center gap-1.5 py-[3px] pr-2 text-left rounded-md transition-all group
          ${isSelected ? 'bg-green-500/12' : 'hover:bg-secondary/50'}`}
      >
        <FileIcon name={node.name} />
        <span className="text-[11px] font-mono truncate flex-1" style={{ color: labelColor }}>
          {node.name}
        </span>
        {isEntry && (
          <span title="Entry point — start reading here"
            className="text-[8px] font-bold px-1 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20 flex-shrink-0">
            ENTRY
          </span>
        )}
        {isCyclic && (
          <span title="Involved in a circular dependency"
            className="text-[8px] font-bold px-1 py-0.5 rounded bg-red-500/15 text-red-400 border border-red-500/20 flex-shrink-0">
            CYCLE
          </span>
        )}
      </button>
    );
  }

  const children = [...node.children.values()].sort((a, b) =>
    a.isFile === b.isFile ? a.name.localeCompare(b.name) : a.isFile ? 1 : -1
  );
  const fileCount = countFiles(node);

  return (
    <div>
      <button
        onClick={() => toggle(node.path)}
        style={{ paddingLeft: `${6 + depth * 14}px` }}
        className="w-full flex items-center gap-1.5 py-[3px] pr-2 text-left rounded-md hover:bg-secondary/50 transition-colors group"
      >
        <ChevronRight className={`size-3 text-muted-foreground/60 flex-shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`} />
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 16, height: 14, borderRadius: 3, flexShrink: 0,
          background: isExpanded ? '#3b82f620' : '#64748b18',
          fontSize: 8,
        }}>
          {isExpanded ? '📂' : '📁'}
        </span>
        <span className="text-[11px] font-mono text-foreground/80 truncate flex-1">{node.name}</span>
        <span className="text-[9px] text-muted-foreground/40 font-mono flex-shrink-0">{fileCount}</span>
      </button>
      {isExpanded && (
        <div className="relative">
          <div style={{
            position: 'absolute', left: `${6 + depth * 14 + 7}px`,
            top: 0, bottom: 4, width: 1,
            background: 'rgba(100,116,139,0.2)',
          }} />
          {children.map((child, i) => (
            <TreeNodeView key={child.path} node={child} depth={depth + 1}
              isLast={i === children.length - 1}
              expanded={expanded} toggle={toggle}
              onFileClick={onFileClick} selectedNodeId={selectedNodeId}
              entryPointIds={entryPointIds} cycleNodeIds={cycleNodeIds} />
          ))}
        </div>
      )}
    </div>
  );
}

function FileExplorer({ result, onFileClick, selectedNodeId }: {
  result: AnalysisResult;
  onFileClick: (n: GraphNodeData) => void;
  selectedNodeId: string | null;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch]     = useState('');

  const tree = useMemo(() => buildTree(result.graph.nodes), [result.graph.nodes]);

  const entryPointIds = useMemo(
    () => new Set((result.meta.entry_points ?? []).map(e => e.id)),
    [result.meta.entry_points],
  );

  const cycleNodeIds = useMemo(
    () => new Set((result.cycles ?? []).flat()),
    [result.cycles],
  );

  useEffect(() => {
    if (!selectedNodeId) return;
    setExpanded(prev => {
      const next = new Set(prev);
      getAncestorPaths(selectedNodeId).forEach(p => next.add(p));
      return next;
    });
  }, [selectedNodeId]);

  const toggle = (path: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });

  const filteredNodes = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return result.graph.nodes.filter(n =>
      n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q)
    );
  }, [search, result.graph.nodes]);

  const rootChildren = [...tree.children.values()].sort((a, b) =>
    a.isFile === b.isFile ? a.name.localeCompare(b.name) : a.isFile ? 1 : -1
  );

  return (
    <div className="flex flex-col gap-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-foreground/40" />
        <input
          type="text" placeholder="Search files…" value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-secondary/40 border border-border rounded-lg pl-7 pr-7 py-1.5 text-[11px] font-mono placeholder:text-muted-foreground/30 focus:outline-none focus:border-green-500/40 transition-colors"
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground">
            <X className="size-3" />
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-1">
        <span className="flex items-center gap-1 text-[9px] text-amber-400/70">
          <span className="size-1.5 rounded-full bg-amber-400" />ENTRY
        </span>
        <span className="flex items-center gap-1 text-[9px] text-red-400/70">
          <span className="size-1.5 rounded-full bg-red-400" />CYCLE
        </span>
        <span className="text-[9px] text-muted-foreground/40 ml-auto">click to explore</span>
      </div>

      {/* Tree / Search results */}
      <div className="flex flex-col gap-px max-h-[420px] overflow-y-auto -mx-1 px-1 py-0.5">
        {filteredNodes ? (
          filteredNodes.length === 0 ? (
            <p className="text-[10px] text-muted-foreground/50 text-center py-4">No files match "{search}"</p>
          ) : (
            filteredNodes.map(n => (
              <button key={n.id} onClick={() => onFileClick(n)} title={n.id}
                className={`flex items-center gap-2 px-2 py-[3px] rounded-md text-left transition-colors
                  ${n.id === selectedNodeId ? 'bg-green-500/12' : 'hover:bg-secondary/50'}`}>
                <FileIcon name={n.label} />
                <span className={`text-[11px] font-mono truncate ${n.id === selectedNodeId ? 'text-green-400' : 'text-foreground/80'}`}>
                  {n.label}
                </span>
                <span className="text-[9px] text-muted-foreground/40 truncate ml-auto font-mono">
                  {n.id.split('/').slice(0, -1).slice(-2).join('/')}
                </span>
              </button>
            ))
          )
        ) : (
          rootChildren.map((child, i) => (
            <TreeNodeView key={child.path} node={child} depth={0}
              isLast={i === rootChildren.length - 1}
              expanded={expanded} toggle={toggle}
              onFileClick={onFileClick} selectedNodeId={selectedNodeId}
              entryPointIds={entryPointIds} cycleNodeIds={cycleNodeIds} />
          ))
        )}
      </div>
    </div>
  );
}

// ── GitHub icon ───────────────────────────────────────────────────────────────

function Github({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.02c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A4.37 4.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  repoPath: string;
  setRepoPath: (v: string) => void;
  analyzing: boolean;
  handleAnalyze: () => void;
  error: string | null;
  result: AnalysisResult | null;
  isolatedCount?: number;
  onFileClick?: (node: GraphNodeData) => void;
  selectedNodeId?: string | null;
}

export function SidebarAnalyze({
  repoPath, setRepoPath, analyzing, handleAnalyze,
  error, result, isolatedCount = 0, onFileClick, selectedNodeId = null,
}: Props) {
  const isGitHub  = repoPath.startsWith('https://github.com/');
  const inputType = repoPath.length === 0 ? null : isGitHub ? 'github' : 'local';

  const fileCount  = result ? String(result.meta.total_files  ?? result.graph.nodes.length) : '—';
  const edgeCount  = result ? String(result.meta.total_edges  ?? result.graph.edges.length) : '—';
  const cycleCount = result ? String(result.meta.cycles_found ?? result.meta.circular_count ?? result.cycles?.length ?? 0) : '—';

  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-4 p-4">

      {/* Input */}
      <div className="group relative">
        <div className="absolute -inset-px rounded-xl opacity-0 group-focus-within:opacity-100 transition-all duration-300 blur-sm bg-gradient-to-r from-green-500/40 via-cyan-400/20 to-green-500/40" />
        <div className="relative flex flex-col gap-2 p-2 rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-2 px-2 pt-1">
            <AnimatePresence mode="wait">
              {isGitHub
                ? <motion.div key="gh" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}><Github className="text-foreground/70" /></motion.div>
                : <motion.div key="lc" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}><FolderOpen className="size-4 text-muted-foreground" /></motion.div>
              }
            </AnimatePresence>
            {inputType && (
              <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded border ${
                isGitHub ? 'border-violet-500/30 bg-violet-500/10 text-violet-400' : 'border-border bg-secondary text-muted-foreground'
              }`}>
                {isGitHub ? 'GitHub' : 'Local'}
              </span>
            )}
          </div>
          <input
            type="text"
            placeholder="github.com/owner/repo or /path/to/repo"
            className="w-full bg-transparent border-0 px-2 pb-1 text-xs font-mono placeholder:text-muted-foreground/40 focus:outline-none"
            value={repoPath}
            onChange={e => setRepoPath(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
          />
          <button onClick={handleAnalyze} disabled={!repoPath || analyzing}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-green-500 hover:bg-green-400 text-black text-xs font-semibold transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer">
            {analyzing
              ? <><span className="size-3 rounded-full border-2 border-black/30 border-t-black animate-spin" />Analyzing…</>
              : <><Zap className="size-3" />Analyze Repo</>}
          </button>
        </div>
      </div>

      {/* How-to hint when empty */}
      {!result && !analyzing && !error && (
        <div className="flex flex-col gap-2.5 px-1">
          <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest">How it works</p>
          {[
            { icon: GitBranch,        text: 'Paste a GitHub URL or local path above' },
            { icon: Network,          text: 'We map every import across your entire codebase' },
            { icon: MousePointerClick, text: 'Click any file to see what it affects' },
          ].map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-start gap-2.5">
              <div className="size-5 rounded-md bg-secondary/80 border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="size-3 text-muted-foreground" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
          <AlertCircle className="size-3 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats */}
      {result && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                label: 'Files',
                sub: 'source files',
                value: fileCount,
                color: 'text-green-500',
                bg: 'bg-green-500/8',
                border: 'border-green-500/20',
              },
              {
                label: 'Imports',
                sub: 'dependencies',
                value: edgeCount,
                color: 'text-blue-400',
                bg: 'bg-blue-500/8',
                border: 'border-blue-500/20',
              },
              {
                label: 'Cycles',
                sub: 'circular deps',
                value: cycleCount,
                color: Number(cycleCount) > 0 ? 'text-orange-400' : 'text-muted-foreground',
                bg: Number(cycleCount) > 0 ? 'bg-orange-500/8' : 'bg-secondary/40',
                border: Number(cycleCount) > 0 ? 'border-orange-500/20' : 'border-border',
              },
            ].map(({ label, sub, value, color, bg, border }) => (
              <div key={label} className={`rounded-lg border ${border} ${bg} px-2 py-2 text-center`}>
                <div className={`text-sm font-bold font-mono ${color}`}>{value}</div>
                <div className="text-[9px] font-semibold text-muted-foreground mt-0.5">{label}</div>
                <div className="text-[8px] text-muted-foreground/40">{sub}</div>
              </div>
            ))}
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground font-mono px-1">
            {result.meta.language && (
              <span className="flex items-center gap-1">
                <Code2 className="size-3" />
                {result.meta.language}
              </span>
            )}
            {result.meta.total_loc !== undefined && (
              <span className="flex items-center gap-1">
                <span className="opacity-40">·</span>
                {result.meta.total_loc.toLocaleString()} lines of code
              </span>
            )}
            {result.cached && (
              <span className="flex items-center gap-1 text-muted-foreground/60">
                <Clock className="size-3" />
                cached{result.meta.analyzed_at && ` · ${new Date(result.meta.analyzed_at).toLocaleDateString()}`}
              </span>
            )}
          </div>

          {/* Cycles detail */}
          {(result.cycles?.length ?? 0) > 0 && (
            <div className="px-3 py-2.5 rounded-lg border border-orange-500/25 bg-orange-500/5">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="size-3 text-orange-400" />
                <p className="text-[10px] font-semibold text-orange-400">
                  {result.cycles!.length} Circular {result.cycles!.length === 1 ? 'Dependency' : 'Dependencies'} Found
                </p>
              </div>
              <p className="text-[9px] text-muted-foreground/60 mb-1.5">
                These files import each other — can cause build issues
              </p>
              <ul className="space-y-1">
                {result.cycles!.slice(0, 4).map((cycle, i) => (
                  <li key={i} className="text-[10px] font-mono text-muted-foreground truncate">
                    {cycle.map(f => f.split('/').pop()).join(' → ')}
                  </li>
                ))}
                {result.cycles!.length > 4 && (
                  <li className="text-[9px] text-muted-foreground/50">…{result.cycles!.length - 4} more cycles</li>
                )}
              </ul>
            </div>
          )}

          {isolatedCount > 0 && (
            <p className="text-[10px] text-muted-foreground/40 px-1">
              {isolatedCount} file{isolatedCount > 1 ? 's' : ''} have no detected imports
            </p>
          )}
        </>
      )}

      {/* File Explorer */}
      {result && onFileClick && (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
              File Explorer
            </p>
            <p className="text-[9px] text-muted-foreground/40">
              {result.graph.nodes.length} files
            </p>
          </div>
          <FileExplorer result={result} onFileClick={onFileClick} selectedNodeId={selectedNodeId} />
        </div>
      )}
    </div>
  );
}
