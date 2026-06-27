import { motion } from 'framer-motion';
import { GitBranch, Sun, Moon, AlertCircle, Code2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { CardSpotlight } from '@/components/aceternity/card-spotlight';

function Github({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className={className}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.02c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A4.37 4.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

function GraphDecoration({ isDark }: { isDark: boolean }) {
  const nodeColor = isDark ? 'rgba(34,197,94,' : 'rgba(22,163,74,';
  const edgeColor = isDark ? 'rgba(100,116,139,0.25)' : 'rgba(100,116,139,0.2)';
  const textColor = isDark ? 'rgba(248,250,252,0.6)' : 'rgba(15,23,42,0.5)';
  const nodes = [
    { x:60,  y:55,  r:28, label:'app.tsx',     glow:true,  delay:0   },
    { x:180, y:120, r:22, label:'router.ts',   glow:false, delay:0.5 },
    { x:300, y:55,  r:24, label:'api.ts',      glow:true,  delay:1   },
    { x:420, y:110, r:20, label:'types.ts',    glow:false, delay:0.3 },
    { x:120, y:200, r:20, label:'utils.ts',    glow:false, delay:0.8 },
    { x:260, y:185, r:22, label:'analyzer.ts', glow:true,  delay:1.2 },
    { x:380, y:210, r:18, label:'parser.ts',   glow:false, delay:0.6 },
  ];
  const edges = [[0,1],[0,2],[1,3],[1,4],[2,3],[2,5],[4,5],[5,6],[3,6]] as [number,number][];
  return (
    <svg viewBox="0 0 480 260" className="h-full" xmlns="http://www.w3.org/2000/svg">
      <defs><filter id="glow-green"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      {edges.map(([a,b],i) => <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} stroke={edgeColor} strokeWidth="1" strokeDasharray="4 3"/>)}
      {nodes.map((n,i) => (
        <motion.g key={i} animate={{y:[0,-4,0]}} transition={{duration:3+i*0.4,repeat:Infinity,ease:'easeInOut',delay:n.delay}}>
          {n.glow && <circle cx={n.x} cy={n.y} r={n.r+6} fill={`${nodeColor}0.06)`} stroke={`${nodeColor}0.2)`} strokeWidth="1"/>}
          <circle cx={n.x} cy={n.y} r={n.r} fill={n.glow?`${nodeColor}0.12)`:(isDark?'rgba(30,41,59,0.8)':'rgba(241,245,249,0.8)')} stroke={n.glow?`${nodeColor}0.5)`:edgeColor} strokeWidth="1" filter={n.glow?'url(#glow-green)':undefined}/>
          <text x={n.x} y={n.y+4} textAnchor="middle" fill={n.glow?(isDark?'rgba(134,239,172,0.9)':'rgba(22,101,52,0.9)'):textColor} fontSize="8" fontFamily="JetBrains Mono, monospace" fontWeight={n.glow?'600':'400'}>{n.label}</text>
        </motion.g>
      ))}
    </svg>
  );
}

const features = [
  { icon: GitBranch, label: 'Dependency Graphs' },
  { icon: AlertCircle, label: 'Circular Detection' },
  { icon: Code2,      label: 'Multi-language'    },
];

interface Props { isDark: boolean; toggle: () => void; }

export function SignInLayout({ isDark, toggle }: Props) {
  const { login } = useAuth();

  return (
    <div className="relative z-10 w-full flex flex-col lg:flex-row" style={{ minHeight: '100dvh' }}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-8 lg:px-12 h-16">
        <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.4}} className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-green-500/10 border border-green-500/25 flex items-center justify-center">
            <GitBranch className="size-4 text-green-500"/>
          </div>
          <span className="text-base font-bold font-mono tracking-tight">GraphLens</span>
        </motion.div>
        <button onClick={toggle} className="size-9 rounded-lg border border-border bg-card/80 backdrop-blur-sm flex items-center justify-center text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-sm">
          {isDark ? <Sun className="size-4"/> : <Moon className="size-4"/>}
        </button>
      </div>

      {/* LEFT — hero */}
      <div className="flex-1 flex items-center px-8 lg:px-16 pt-24 pb-10 gap-3">
        <div className="flex-1 min-w-0">
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.4,delay:0.05}}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-green-500/20 bg-green-500/5 text-green-500 text-xs font-mono mb-5 w-fit">
            <span className="size-1.5 rounded-full bg-green-500 animate-pulse"/>Open Beta · Free to use
          </motion.div>
          <motion.h1 initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.55,delay:0.12}}
            className="text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
            Understand any<br/>codebase,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400">instantly.</span>
          </motion.h1>
          <motion.p initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.45,delay:0.22}}
            className="text-sm text-muted-foreground leading-relaxed max-w-sm mb-7">
            Point GraphLens at any repository and get a live dependency graph, circular import warnings, and AI explanations – in seconds.
          </motion.p>
          <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.4,delay:0.3}} className="flex flex-wrap gap-2">
            {features.map(({icon:Icon,label}) => (
              <div key={label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${isDark?'border-slate-700/80 bg-slate-800/50 text-slate-300':'border-slate-200 bg-slate-50 text-slate-600'}`}>
                <Icon className="size-3 text-green-500"/>{label}
              </div>
            ))}
          </motion.div>
        </div>
        <motion.div initial={{opacity:0,x:20}} animate={{opacity:isDark?0.8:0.6}} transition={{duration:0.9,delay:0.4}}
          className="hidden lg:block w-[300px] xl:w-[360px] flex-shrink-0 h-[260px]">
          <GraphDecoration isDark={isDark}/>
        </motion.div>
      </div>

      {/* RIGHT — sign in */}
      <div className="lg:w-[420px] flex-shrink-0 flex flex-col items-center justify-center px-8 lg:px-14 pt-8 pb-10 lg:min-h-dvh">
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:0.55,delay:0.18}} className="w-full max-w-[360px]">
          <CardSpotlight
            className={`rounded-2xl border p-8 ${isDark?'bg-slate-900/80 border-slate-800/80 shadow-2xl shadow-black/50':'bg-white border-slate-200/80 shadow-lg'}`}
            radius={320} color={isDark?'rgba(34,197,94,0.07)':'rgba(22,163,74,0.04)'}>
            <div className="text-center mb-6">
              <div className="size-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                <GitBranch className="size-6 text-green-500"/>
              </div>
              <h2 className="text-xl font-bold text-foreground mb-1">Welcome to GraphLens</h2>
              <p className="text-sm text-muted-foreground">Sign in with GitHub to analyze public and private repositories.</p>
            </div>
            <button onClick={login}
              className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl bg-foreground hover:opacity-90 text-background text-sm font-semibold transition-all active:scale-[0.98] cursor-pointer">
              <Github/>
              Continue with GitHub
            </button>
            <p className="text-[11px] text-muted-foreground/60 text-center mt-4">
              Requests <code className="font-mono">repo</code> and <code className="font-mono">user:email</code> scopes.
            </p>
          </CardSpotlight>
        </motion.div>
      </div>
    </div>
  );
}
