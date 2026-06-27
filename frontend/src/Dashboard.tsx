import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { GitBranch, Search, History, Sun, Moon, Layers, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

import { SidebarAnalyze }  from '@/components/analyzer/SidebarAnalyze';
import { HistoryView }     from '@/components/history/HistoryView';
import { DependencyGraph } from '@/components/graph/DependencyGraph';
import { ExplainPanel }    from '@/components/graph/ExplainPanel';
import { HackerLoader }    from '@/components/loader/HackerLoader';
import { DinoGame }        from '@/components/loader/DinoGame';

import type { AnalysisResult, GraphNodeData, EntryPoint, HistoryItem } from '@/types';

function OverviewPanel({
  result,
  onSelectEntry,
  isDark,
}: {
  result: AnalysisResult;
  onSelectEntry: (node: GraphNodeData) => void;
  isDark: boolean;
}) {
  const summary = result.meta.repo_summary ?? '';
  const entries = result.meta.entry_points ?? [];

  const summaryLines = summary
    .split('\n')
    .filter(l => l.trim())
    .map((l, i) => ({ key: i, bold: l.startsWith('**'), text: l.replace(/\*\*/g, '') }));

  return (
    <div className={`w-80 flex-shrink-0 h-full flex flex-col border-l border-border overflow-y-auto ${isDark ? 'bg-[#0d1117]' : 'bg-white'}`}>
      <div className="p-4 border-b border-border">
        <p className="text-xs font-bold font-mono text-muted-foreground uppercase tracking-widest">Repository Overview</p>
      </div>

      {summary ? (
        <div className="p-4 border-b border-border space-y-1">
          {summaryLines.map(({ key, bold, text }) =>
            bold
              ? <p key={key} className="text-xs font-semibold text-foreground mt-2 first:mt-0">{text}</p>
              : text.match(/^\d\./)
                ? <p key={key} className="text-xs text-muted-foreground pl-2">{text}</p>
                : <p key={key} className="text-xs text-muted-foreground leading-relaxed">{text}</p>
          )}
        </div>
      ) : (
        <div className="p-4 border-b border-border">
          <p className="text-xs text-muted-foreground italic">No summary — re-analyze repo to generate one.</p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="p-4">
          <p className="text-xs font-semibold text-foreground mb-3">Start here</p>
          <div className="space-y-2">
            {entries.map((ep: EntryPoint) => {
              const node = result.graph.nodes.find(n => n.id === ep.id);
              return (
                <button
                  key={ep.id}
                  onClick={() => node && onSelectEntry(node)}
                  className="w-full text-left rounded-lg border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 p-2.5 transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="size-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                    <span className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400 truncate">{ep.label}</span>
                  </div>
                  {ep.package && (
                    <p className="text-[10px] text-muted-foreground font-mono pl-3.5 truncate">{ep.package}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground pl-3.5 mt-0.5">{ep.reason}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

class GraphBoundary extends React.Component<
  { children: React.ReactNode },
  { err: string | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(e: Error) { return { err: e.message }; }
  render() {
    if (this.state.err)
      return (
        <div className="flex items-center justify-center h-full text-red-400 text-sm p-8">
          Graph error: {this.state.err}
        </div>
      );
    return this.props.children;
  }
}

interface Props {
  isDark: boolean;
  toggle: () => void;
}

export function Dashboard({ isDark, toggle }: Props) {
  const [view, setView]         = useState<'analyzer' | 'history'>('analyzer');
  const [repoPath, setRepoPath] = useState('');
  const [analyzing, setAnalyzing]       = useState(false);
  const [progressStep, setProgressStep] = useState('');
  const [result, setResult]             = useState<AnalysisResult | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [selectedNode, setSelectedNode]     = useState<GraphNodeData | null>(null);
  const [isolatedCount, setIsolatedCount]   = useState(0);
  const { user, logout, getToken } = useAuth();

  const isGitHub = repoPath.startsWith('https://github.com/');

  const handleLoadHistory = async (item: HistoryItem) => {
    setView('analyzer');
    setRepoPath(item.repo);
    setError(null);
    setSelectedNode(null);
    setAnalyzing(true);
    setProgressStep('Loading from history…');
    try {
      const token = await getToken();
      const res = await fetch(`/api/history?repo=${encodeURIComponent(item.repo)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (json.history?.graph) {
        setResult({
          status: 'success',
          cached: true,
          graph: json.history.graph,
          meta: json.history.meta ?? {},
          cycles: [],
        });
      } else {
        setError('Could not load cached analysis.');
      }
    } catch {
      setError('Failed to fetch history.');
    } finally {
      setAnalyzing(false);
      setProgressStep('');
    }
  };

  const handleAnalyze = async () => {
    if (!repoPath || analyzing) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);
    setSelectedNode(null);
    setProgressStep('');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10 * 60 * 1000); // 10 min for large repos
    try {
      const ghToken = await getToken();
      const payload = isGitHub
        ? { type: 'github', url: repoPath, token: ghToken, github_token: ghToken }
        : { type: 'local', path: repoPath, token: ghToken };

      const res = await fetch('/api/analyze/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}));
        setError(err.detail || 'Analysis failed.');
        return;
      }

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split('\n\n');
        buf = parts.pop() ?? '';
        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith('data: ')) continue;
          try {
            const msg = JSON.parse(line.slice(6));
            if (msg.step)  setProgressStep(msg.step);
            if (msg.error) setError(msg.error);
            if (msg.done)  setResult(msg.result);
          } catch { /* ignore malformed */ }
        }
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        setError('Timed out (10 min). Repo may be too large.');
      } else {
        setError('Cannot reach backend-local (port 8001).');
      }
    } finally {
      clearTimeout(timer);
      setAnalyzing(false);
      setProgressStep('');
    }
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-background">

      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-72 flex-shrink-0 flex flex-col border-r border-border bg-card/40">

        {/* Logo */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-green-500/10 border border-green-500/25 flex items-center justify-center">
              <GitBranch className="size-3.5 text-green-500" />
            </div>
            <span className="font-bold font-mono text-sm tracking-tight">GraphLens</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggle}
              className="size-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
              {isDark ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
            </button>
            {user && (
              <div className="flex items-center gap-1.5">
                <img src={user.avatar_url} alt={user.login} className="size-7 rounded-full border border-border"/>
                <button onClick={logout} title="Sign out"
                  className="size-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  <LogOut className="size-3"/>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border flex-shrink-0">
          {([
            { id: 'analyzer', icon: Search,  label: 'Analyze' },
            { id: 'history',  icon: History, label: 'History' },
          ] as const).map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setView(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                view === id
                  ? 'text-foreground border-green-500'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              }`}>
              <Icon className="size-3" />{label}
            </button>
          ))}
        </div>

        {/* Content */}
        {view === 'analyzer' ? (
          <SidebarAnalyze
            repoPath={repoPath}
            setRepoPath={setRepoPath}
            analyzing={analyzing}
            handleAnalyze={handleAnalyze}
            error={error}
            result={result}
            isolatedCount={isolatedCount}
            onFileClick={setSelectedNode}
            selectedNodeId={selectedNode?.id ?? null}
          />
        ) : (
          <HistoryView onLoadAnalysis={handleLoadHistory} />
        )}
      </aside>

      {/* ── MAIN CANVAS ── */}
      <main className="flex-1 flex overflow-hidden">
        {result ? (
          <>
            <div className="flex-1 overflow-hidden">
              <GraphBoundary>
                <DependencyGraph
                  result={result}
                  isDark={isDark}
                  onNodeClick={setSelectedNode}
                  selectedNodeId={selectedNode?.id ?? null}
                  onIsolatedCount={setIsolatedCount}
                />
              </GraphBoundary>
            </div>
            <AnimatePresence>
              {selectedNode ? (
                <div className="w-80 flex-shrink-0 h-full">
                  <ExplainPanel
                    node={selectedNode}
                    result={result}
                    repoPath={repoPath}
                    repoType={isGitHub ? 'github' : 'local'}
                    onClose={() => setSelectedNode(null)}
                    isDark={isDark}
                  />
                </div>
              ) : (
                <OverviewPanel
                  result={result}
                  onSelectEntry={setSelectedNode}
                  isDark={isDark}
                />
              )}
            </AnimatePresence>
          </>
        ) : analyzing ? (
          <div className="flex-1 flex flex-col gap-4 p-6 overflow-hidden">
            <HackerLoader step={progressStep} />
            <DinoGame isDark={isDark} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-12">
            <div className="size-16 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center">
              <Layers className="size-7 text-muted-foreground" />
            </div>
            <p className="text-foreground font-semibold">Dependency graph appears here</p>
            <p className="text-muted-foreground text-sm font-mono">Python · Node.js · Go · Rust</p>
          </div>
        )}
      </main>
    </div>
  );
}
