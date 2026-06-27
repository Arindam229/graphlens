import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Code2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { AnalysisResult, GraphNodeData } from '@/types';

interface Props {
  node: GraphNodeData;
  result: AnalysisResult;
  repoPath: string;
  repoType: string;
  onClose: () => void;
  isDark: boolean;
}

function renderMarkdown(raw: string) {
  return raw.split('\n').map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**'))
      return <p key={i} className="text-xs font-bold text-foreground mt-4 mb-1 uppercase tracking-widest">{line.slice(2, -2)}</p>;
    if (line.startsWith('- `') || line.startsWith('- '))
      return <p key={i} className="text-xs text-muted-foreground ml-2 mb-0.5 font-mono">{line}</p>;
    if (line.trim() === '---') return <hr key={i} className="border-border my-3" />;
    if (line.trim() === '') return <div key={i} className="h-1" />;
    return <p key={i} className="text-xs text-muted-foreground leading-relaxed">{line}</p>;
  });
}

export function ExplainPanel({ node, result, repoPath, repoType, onClose, isDark }: Props) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cache = useRef(new Map<string, string>());
  const { getToken } = useAuth();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useEffect(() => {
    if (cache.current.has(node.id)) { setText(cache.current.get(node.id)!); return; }
    setLoading(true);
    setText(null);

    const imports    = result.graph.edges.filter(e => e.source === node.id).map(e => e.target.split('/').pop()!);
    const importedBy = result.graph.edges.filter(e => e.target === node.id).map(e => e.source.split('/').pop()!);

    getToken()
      .then(token =>
        fetch('/api/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: repoType,
            file_id: node.id,
            label: node.label,
            imports,
            imported_by: importedBy,
            ...(repoType === 'local' ? { path: repoPath } : { url: repoPath }),
            token,
          }),
        })
      )
      .then(r => r.json())
      .then(d => {
        const t = d.explanation || d.detail || 'No explanation available.';
        cache.current.set(node.id, t);
        setText(t);
      })
      .catch(() => setText('Failed to load explanation.'))
      .finally(() => setLoading(false));
  }, [node.id]);

  const imports    = result.graph.edges.filter(e => e.source === node.id);
  const importedBy = result.graph.edges.filter(e => e.target === node.id);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col h-full border-l border-border ${isDark ? 'bg-slate-900/95' : 'bg-white'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Code2 className="size-3.5 text-green-500 flex-shrink-0" />
          <span className="text-sm font-mono font-semibold text-foreground truncate">{node.label}</span>
          <span className="text-xs text-muted-foreground font-mono flex-shrink-0">{node.loc} LOC</span>
        </div>
        <button onClick={onClose}
          className="size-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors flex-shrink-0 ml-2 text-xs">
          ✕
        </button>
      </div>

      {/* Connection badges */}
      {(imports.length > 0 || importedBy.length > 0) && (
        <div className="px-4 py-2 border-b border-border/50 flex flex-wrap gap-1.5 flex-shrink-0">
          {imports.map(e => (
            <span key={e.target} className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-green-500/30 bg-green-500/10 text-green-400">
              → {e.target.split('/').pop()}
            </span>
          ))}
          {importedBy.map(e => (
            <span key={e.source} className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
              ← {e.source.split('/').pop()}
            </span>
          ))}
        </div>
      )}

      {/* AI explanation */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-3 rounded-full border-2 border-green-500/30 border-t-green-500 animate-spin flex-shrink-0" />
            Asking Gemini…
          </div>
        ) : text === 'QUOTA_EXCEEDED' ? (
          <div className="flex flex-col gap-1.5 px-3 py-2.5 rounded-lg border border-orange-500/30 bg-orange-500/10">
            <p className="text-xs font-semibold text-orange-400">Gemini quota exceeded</p>
            <p className="text-[10px] text-muted-foreground">Free tier limit hit. Enable billing at <span className="font-mono">ai.google.dev</span> or wait for quota reset.</p>
          </div>
        ) : text === 'INVALID_KEY' ? (
          <div className="flex flex-col gap-1 px-3 py-2.5 rounded-lg border border-red-500/30 bg-red-500/10">
            <p className="text-xs font-semibold text-red-400">Invalid API key</p>
            <p className="text-[10px] text-muted-foreground">Check GEMINI_API_KEY in backend-local/.env</p>
          </div>
        ) : text === 'BLOCKED' ? (
          <p className="text-xs text-muted-foreground">Gemini blocked this response (safety filter). Try a different file.</p>
        ) : text === 'GENERATION_FAILED' ? (
          <p className="text-xs text-muted-foreground">Generation failed — check backend-local terminal for the actual error.</p>
        ) : text ? (
          <div>{renderMarkdown(text)}</div>
        ) : null}
      </div>
    </motion.div>
  );
}
