import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, FolderOpen, ExternalLink, ChevronLeft, ChevronRight, History, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { HistoryPage, HistoryItem } from '@/types';

function Github({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.02c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A4.37 4.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

export function HistoryView({ onLoadAnalysis }: { onLoadAnalysis?: (item: HistoryItem) => void }) {
  const [data, setData]         = useState<HistoryPage | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [page, setPage]         = useState(1);
  const [deleting, setDeleting] = useState(false);
  const { getToken }            = useAuth();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getToken()
      .then(token =>
        fetch(`/api/history/all?page=${page}&limit=20`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
      )
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(json => {
        if (!cancelled) setData(json);
      })
      .catch((e) => {
        if (!cancelled) setError(`Could not load history (${e.message}). Is backend running?`);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [page, getToken]);

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete all history? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const token = await getToken();
      await fetch('/api/history/all', {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setData(null);
      setPage(1);
    } catch (e) {
      setError('Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {data ? `${data.total} past ${data.total === 1 ? 'analysis' : 'analyses'}` : 'Past analyses'}
        </p>
        {data && data.total > 0 && (
          <button onClick={handleDeleteAll} disabled={deleting}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-40">
            <Trash2 className="size-3" />{deleting ? 'Clearing…' : 'Clear all'}
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-xs">
          <AlertCircle className="size-3 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        [...Array(6)].map((_, i) => (
          <div key={i} className="h-14 rounded-lg border border-border bg-card animate-pulse" />
        ))
      ) : !data || data.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center py-12">
          <History className="size-8 text-muted-foreground/40 animate-[spin_10s_linear_infinite]" />
          <p className="text-sm text-muted-foreground">No analyses yet</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {data.items.map(item => (
              <motion.div key={item.id}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                onClick={() => onLoadAnalysis?.(item)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border bg-card hover:border-green-500/30 transition-colors ${onLoadAnalysis ? 'cursor-pointer' : ''}`}>
                <div className={`size-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                  item.type === 'github'
                    ? 'bg-violet-500/10 border border-violet-500/20'
                    : 'bg-green-500/10 border border-green-500/20'
                }`}>
                  {item.type === 'github'
                    ? <Github className="text-violet-400" />
                    : <FolderOpen className="size-3.5 text-green-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-foreground truncate">{item.repo.split('/').slice(-2).join('/')}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {item.language} · {item.dep_count} modules
                    {item.circular_count > 0 && <span className="text-orange-400"> · {item.circular_count} cycles</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {new Date(item.analyzed_at).toLocaleDateString()}
                  </span>
                  {item.type === 'github' && (
                    <a href={item.repo} target="_blank" rel="noreferrer"
                      className="text-muted-foreground hover:text-foreground">
                      <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {data.pages > 1 && (
            <div className="flex items-center justify-between mt-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors">
                <ChevronLeft className="size-3" />Prev
              </button>
              <span className="text-[10px] text-muted-foreground font-mono">{data.page} / {data.pages}</span>
              <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page >= data.pages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors">
                Next<ChevronRight className="size-3" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
