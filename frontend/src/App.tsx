import React, { useState, useEffect } from 'react';
import { ClerkProvider, SignedIn, SignedOut, SignIn, UserButton } from '@clerk/clerk-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, History, GitBranch, Zap, FolderOpen,
  BarChart3, AlertTriangle, Box, Sun, Moon,
  AlertCircle, Code2, Layers,
} from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { Button } from "@/components/ui/button";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { GridBackground } from "@/components/aceternity/grid-background";
import { AuroraBackground } from "@/components/aceternity/aurora-background";

function Github({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.02c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A4.37 4.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "pk_test_placeholder";

type Theme = 'dark' | 'light';

function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('graphlens-theme') as Theme) ?? 'dark';
  });
  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('graphlens-theme', theme);
  }, [theme]);
  return { theme, toggle: () => setTheme(t => t === 'dark' ? 'light' : 'dark') };
}

function clerkAppearance(theme: Theme) {
  const dark = theme === 'dark';
  return {
    variables: {
      colorBackground: dark ? '#0c1222' : '#ffffff',
      colorInputBackground: dark ? '#1e293b' : '#f8fafc',
      colorInputText: dark ? '#f1f5f9' : '#0f172a',
      colorText: dark ? '#f1f5f9' : '#0f172a',
      colorTextSecondary: dark ? '#94a3b8' : '#64748b',
      colorPrimary: dark ? '#22c55e' : '#16a34a',
      colorDanger: '#ef4444',
      colorNeutral: dark ? '#334155' : '#e2e8f0',
      borderRadius: '10px',
      fontFamily: "'IBM Plex Sans', sans-serif",
      fontSize: '14px',
    },
    elements: {
      card: 'bg-transparent shadow-none border-none',
      rootBox: 'w-full',
      formButtonPrimary: dark
        ? 'bg-green-500 hover:bg-green-400 text-black font-semibold transition-colors'
        : 'bg-green-600 hover:bg-green-500 text-white font-semibold transition-colors',
      footer: 'hidden',
      footerActionLink: dark ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-500',
      formFieldInput: dark
        ? 'bg-slate-800/80 border-slate-700 text-white focus:border-green-500/50'
        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-green-500/50',
      socialButtonsBlockButton: dark
        ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-white'
        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-900',
      socialButtonsBlockButtonText: 'font-medium',
      dividerLine: dark ? 'bg-slate-700' : 'bg-slate-200',
      dividerText: dark ? 'text-slate-500' : 'text-slate-400',
      identityPreviewText: dark ? 'text-slate-200' : 'text-slate-700',
      userButtonPopoverCard: dark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200',
      userButtonPopoverActionButton: dark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-50 text-slate-700',
    },
  };
}

// Animated dependency graph SVG decoration
function GraphDecoration({ isDark }: { isDark: boolean }) {
  const nodeColor = isDark ? 'rgba(34,197,94,' : 'rgba(22,163,74,';
  const edgeColor = isDark ? 'rgba(100,116,139,0.25)' : 'rgba(100,116,139,0.2)';
  const textColor = isDark ? 'rgba(248,250,252,0.6)' : 'rgba(15,23,42,0.5)';

  const nodes = [
    { x: 60,  y: 55,  r: 28, label: 'app.tsx',     glow: true,  delay: 0 },
    { x: 180, y: 120, r: 22, label: 'router.ts',   glow: false, delay: 0.5 },
    { x: 300, y: 55,  r: 24, label: 'api.ts',      glow: true,  delay: 1 },
    { x: 420, y: 110, r: 20, label: 'types.ts',    glow: false, delay: 0.3 },
    { x: 120, y: 200, r: 20, label: 'utils.ts',    glow: false, delay: 0.8 },
    { x: 260, y: 185, r: 22, label: 'analyzer.ts', glow: true,  delay: 1.2 },
    { x: 380, y: 210, r: 18, label: 'parser.ts',   glow: false, delay: 0.6 },
  ];

  const edges = [
    [0, 1], [0, 2], [1, 3], [1, 4], [2, 3], [2, 5], [4, 5], [5, 6], [3, 6],
  ] as [number, number][];

  return (
    <svg
      viewBox="0 0 480 260"
      className="h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="glow-green">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Edges */}
      {edges.map(([a, b], i) => (
        <line
          key={i}
          x1={nodes[a].x} y1={nodes[a].y}
          x2={nodes[b].x} y2={nodes[b].y}
          stroke={edgeColor}
          strokeWidth="1"
          strokeDasharray="4 3"
        />
      ))}

      {/* Animated traveling dot on one edge */}
      <motion.circle
        r="3"
        fill={isDark ? '#22c55e' : '#16a34a'}
        opacity={0.8}
        animate={{
          cx: [nodes[0].x, nodes[2].x, nodes[5].x, nodes[4].x, nodes[0].x],
          cy: [nodes[0].y, nodes[2].y, nodes[5].y, nodes[4].y, nodes[0].y],
        }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      />

      {/* Nodes */}
      {nodes.map((node, i) => (
        <motion.g
          key={i}
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: node.delay }}
        >
          {/* Glow ring */}
          {node.glow && (
            <circle
              cx={node.x} cy={node.y} r={node.r + 6}
              fill={`${nodeColor}0.06)`}
              stroke={`${nodeColor}0.2)`}
              strokeWidth="1"
            />
          )}
          {/* Node circle */}
          <circle
            cx={node.x} cy={node.y} r={node.r}
            fill={node.glow ? `${nodeColor}0.12)` : (isDark ? 'rgba(30,41,59,0.8)' : 'rgba(241,245,249,0.8)')}
            stroke={node.glow ? `${nodeColor}0.5)` : edgeColor}
            strokeWidth="1"
            filter={node.glow ? 'url(#glow-green)' : undefined}
          />
          {/* Label */}
          <text
            x={node.x} y={node.y + 4}
            textAnchor="middle"
            fill={node.glow ? (isDark ? 'rgba(134,239,172,0.9)' : 'rgba(22,101,52,0.9)') : textColor}
            fontSize="8"
            fontFamily="JetBrains Mono, monospace"
            fontWeight={node.glow ? '600' : '400'}
          >
            {node.label}
          </text>
        </motion.g>
      ))}
    </svg>
  );
}

const features = [
  { icon: GitBranch, label: 'Dependency Graphs' },
  { icon: AlertCircle, label: 'Circular Detection' },
  { icon: Zap, label: 'Dead Code Analysis' },
  { icon: Code2, label: 'Multi-language' },
];

function SignInLayout({ isDark, toggle }: { isDark: boolean; toggle: () => void }) {
  return (
    <div className="relative z-10 w-full flex flex-col lg:flex-row" style={{ minHeight: '100dvh' }}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-8 lg:px-12 h-16">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}
          className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-green-500/10 border border-green-500/25 flex items-center justify-center">
            <GitBranch className="size-4 text-green-500" />
          </div>
          <span className="text-base font-bold font-mono tracking-tight">GraphLens</span>
        </motion.div>
        <ThemeButton isDark={isDark} toggle={toggle} />
      </div>

      {/* LEFT */}
      <div className="flex-1 flex items-center px-8 lg:px-16 pt-24 pb-10 gap-3">

        {/* Text block */}
        <div className="flex-1 min-w-0">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-500/20 bg-green-500/5 text-green-500 text-xs font-mono mb-5 w-fit">
            <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
            Open Beta · Free to use
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.12 }}
            className="text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
            Understand any<br />
            codebase,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400">
              instantly.
            </span>
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.22 }}
            className="text-sm text-muted-foreground leading-relaxed max-w-sm mb-7">
            Point GraphLens at any repository and get a live dependency graph, circular import warnings, and dead code reports — in seconds.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}
            className="flex flex-wrap gap-2">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                isDark ? 'border-slate-700/80 bg-slate-800/50 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}>
                <Icon className="size-3 text-green-500" />
                {label}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Graph — inline beside text, hidden on small screens */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: isDark ? 0.8 : 0.6 }}
          transition={{ duration: 0.9, delay: 0.4 }}
          className="hidden lg:block w-[300px] xl:w-[360px] flex-shrink-0 h-[260px]"
        >
          <GraphDecoration isDark={isDark} />
        </motion.div>

      </div>

      {/* RIGHT */}
      <div className="lg:w-[480px] flex-shrink-0 flex flex-col items-center justify-center px-8 lg:px-14 pt-8 pb-10 lg:pt-0 lg:pb-0 lg:min-h-dvh">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.18 }}
          className="w-full max-w-[400px]">
          <CardSpotlight
            className={`rounded-2xl border p-5 ${
              isDark
                ? 'bg-slate-900/80 border-slate-800/80 shadow-2xl shadow-black/50'
                : 'bg-white border-slate-200/80 shadow-lg shadow-slate-200/80'
            }`}
            radius={320}
            color={isDark ? 'rgba(34,197,94,0.07)' : 'rgba(22,163,74,0.04)'}
          >
            <SignIn />
          </CardSpotlight>
        </motion.div>
      </div>
    </div>
  );
}

function ThemeButton({ isDark, toggle }: { isDark: boolean; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      className="size-9 rounded-lg border border-border bg-card/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer shadow-sm"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color: string;
}) {
  return (
    <CardSpotlight className="rounded-xl border border-border bg-card px-4 py-3.5 shadow-sm">
      <div className={`${color} mb-2`}><Icon className="size-4" /></div>
      <div className="text-2xl font-bold font-mono text-foreground tracking-tight">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5 uppercase tracking-widest font-medium">{label}</div>
    </CardSpotlight>
  );
}

function AnalyzerView({ isDark }: { isDark: boolean }) {
  const [repoPath, setRepoPath] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const { getToken } = useAuth();

  const isGitHub = repoPath.startsWith('https://github.com/');
  const inputType = repoPath.length === 0 ? null : isGitHub ? 'github' : 'local';

  const handleAnalyze = async () => {
    if (!repoPath || analyzing) return;
    setAnalyzing(true);
    try {
      const clerkToken = await getToken();
      const payload = isGitHub
        ? { type: 'github', url: repoPath, token: clerkToken }
        : { type: 'local', path: repoPath, token: clerkToken };
      console.log('Analyze payload:', payload); // replace with real API call
      setTimeout(() => setAnalyzing(false), 2000);
    } catch {
      setAnalyzing(false);
    }
  };

  return (
    <motion.div
      key="analyzer"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
      className="max-w-3xl mx-auto pt-8 px-4 pb-12 relative"
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-green-500/10 blur-[120px] rounded-full z-0" />

      <div className="relative z-10 mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-500/20 bg-green-500/5 text-green-500 text-xs font-mono mb-4 shadow-sm shadow-green-500/5">
          <span className="size-1.5 rounded-full bg-green-500 animate-pulse" />
          Ready to analyze
        </div>
        <h2 className="text-4xl font-bold tracking-tight mb-3 leading-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground to-muted-foreground">Repository Analyzer</span>
        </h2>
        <p className="text-muted-foreground text-base leading-relaxed max-w-xl">
          Enter a local path or GitHub URL to generate a dependency graph, detect circular imports, and surface dead code.
        </p>
      </div>

      <div className="relative z-10 group mb-6">
        <div className="absolute -inset-px rounded-xl opacity-0 group-focus-within:opacity-100 transition-all duration-500 blur-sm bg-gradient-to-r from-green-500/40 via-cyan-400/20 to-green-500/40" />
        <div className="relative flex items-center p-1.5 rounded-xl border border-border bg-card shadow-sm transition-shadow focus-within:shadow-green-500/10 focus-within:shadow-lg">
          <div className="flex items-center pl-3 pr-2 pointer-events-none">
            <AnimatePresence mode="wait">
              {isGitHub ? (
                <motion.div key="gh" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}>
                  <Github className="size-4 text-foreground/70" />
                </motion.div>
              ) : (
                <motion.div key="local" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}>
                  <FolderOpen className="size-4 text-muted-foreground" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <input
            type="text"
            placeholder="https://github.com/owner/repo or /local/path"
            className="flex-1 min-w-0 bg-transparent border-0 h-11 text-sm font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:ring-0"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
          />

          {inputType && (
            <AnimatePresence>
              <motion.span
                initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 6 }}
                className={`flex-shrink-0 mr-3 text-[10px] font-mono font-medium px-2 py-1 rounded-md border ${
                  isGitHub
                    ? 'border-violet-500/30 bg-violet-500/10 text-violet-400'
                    : 'border-border bg-secondary text-muted-foreground'
                }`}
              >
                {isGitHub ? 'GitHub' : 'Local'}
              </motion.span>
            </AnimatePresence>
          )}

          <button
            onClick={handleAnalyze}
            disabled={!repoPath || analyzing}
            className="flex-shrink-0 flex items-center gap-2 px-6 h-11 rounded-lg bg-green-500 hover:bg-green-400 active:scale-[0.98] text-black text-sm font-semibold transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            {analyzing ? (
              <><span className="size-4 rounded-full border-2 border-black/30 border-t-black animate-spin" />Analyzing…</>
            ) : (
              <><Zap className="size-4" />Analyze</>
            )}
          </button>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-3 gap-4 mb-6">
        <StatCard icon={Box} label="Modules" value="—" color="text-green-500" />
        <StatCard icon={BarChart3} label="Edges" value="—" color="text-cyan-400" />
        <StatCard icon={AlertTriangle} label="Circular" value="—" color="text-orange-400" />
      </div>

      <CardSpotlight 
        className="relative z-10 rounded-2xl border border-dashed border-border bg-card/60 backdrop-blur-xl p-12 text-center shadow-xl"
        radius={400}
        color={isDark ? 'rgba(34,197,94,0.06)' : 'rgba(22,163,74,0.04)'}
      >
        <div className="size-16 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center mx-auto mb-4 shadow-inner">
          <Layers className="size-7 text-muted-foreground" />
        </div>
        <p className="text-foreground text-lg font-semibold mb-1">Graph appears here after analysis</p>
        <p className="text-muted-foreground text-sm font-mono">Node.js · Python · Go · Rust</p>
      </CardSpotlight>
    </motion.div>
  );
}

function HistoryView({ isDark }: { isDark: boolean }) {
  return (
    <motion.div
      key="history"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25 }}
      className="max-w-3xl mx-auto pt-12 px-4 pb-16 relative"
    >
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-cyan-500/10 blur-[100px] rounded-full z-0" />

      <div className="relative z-10 mb-8">
        <h2 className="text-4xl font-bold tracking-tight mb-3">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-foreground to-muted-foreground">History</span>
        </h2>
        <p className="text-muted-foreground text-lg">All your past repository analyses.</p>
      </div>
      
      <CardSpotlight 
        className="relative z-10 rounded-2xl border border-dashed border-border bg-card/60 backdrop-blur-xl px-10 py-16 text-center shadow-2xl"
        radius={400}
        color={isDark ? 'rgba(34,197,94,0.06)' : 'rgba(22,163,74,0.04)'}
      >
        <div className="size-16 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center mx-auto mb-5 shadow-inner">
          <History className="size-7 text-muted-foreground animate-[spin_10s_linear_infinite]" />
        </div>
        <p className="text-foreground text-xl font-semibold mb-2">No analyses yet</p>
        <p className="text-muted-foreground text-sm">Your analysis history will appear here</p>
      </CardSpotlight>
    </motion.div>
  );
}

export default function App() {
  const [view, setView] = useState<'analyzer' | 'history'>('analyzer');
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} appearance={clerkAppearance(theme)}>
      <GridBackground className={`transition-colors duration-300 ${isDark ? '' : 'light'}`}>

        <SignedOut>
          {isDark ? (
            <AuroraBackground className="min-h-dvh" showRadialGradient>
              <SignInLayout isDark={isDark} toggle={toggle} />
            </AuroraBackground>
          ) : (
            <div className="relative min-h-dvh bg-background overflow-hidden">
              <div className="pointer-events-none absolute top-[-5%] left-[10%] w-[700px] h-[500px] rounded-full bg-green-500/6 blur-[130px]" />
              <div className="pointer-events-none absolute bottom-0 right-[10%] w-[500px] h-[400px] rounded-full bg-cyan-500/5 blur-[110px]" />
              <SignInLayout isDark={isDark} toggle={toggle} />
            </div>
          )}
        </SignedOut>

        <SignedIn>
          <div className="flex flex-col min-h-dvh">
            <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
              <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shadow-sm shadow-green-500/5">
                    <GitBranch className="size-4 text-green-500" />
                  </div>
                  <span className="font-bold font-mono text-xl tracking-tight">GraphLens</span>
                </div>

                <div className="flex items-center gap-4">
                  <ThemeButton isDark={isDark} toggle={toggle} />
                  <UserButton appearance={{ elements: { userButtonAvatarBox: 'size-9 shadow-sm' } }} />
                </div>
              </div>
            </header>

            <main className="flex-1 max-w-5xl mx-auto w-full relative pt-10">
              <div className="flex items-center justify-center mb-6 relative z-20">
                <div className="inline-flex p-1.5 bg-secondary/40 backdrop-blur-md rounded-2xl border border-border/50 shadow-sm relative">
                  <button
                    onClick={() => setView('analyzer')}
                    className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 z-10 ${
                      view === 'analyzer' 
                        ? 'text-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {view === 'analyzer' && (
                      <motion.div layoutId="activeTab" className="absolute inset-0 bg-background rounded-xl shadow-sm border border-border/60" />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <Search className="size-4" />Analysis
                    </span>
                  </button>
                  <button
                    onClick={() => setView('history')}
                    className={`relative flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 z-10 ${
                      view === 'history' 
                        ? 'text-foreground' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {view === 'history' && (
                      <motion.div layoutId="activeTab" className="absolute inset-0 bg-background rounded-xl shadow-sm border border-border/60" />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <History className="size-4" />History
                    </span>
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {view === 'analyzer' ? <AnalyzerView isDark={isDark} /> : <HistoryView isDark={isDark} />}
              </AnimatePresence>
            </main>
          </div>
        </SignedIn>

      </GridBackground>
    </ClerkProvider>
  );
}
