import { useEffect, useState, useRef } from 'react';

const CHARS = '01アイウエオカキクケコサシスセソ!@#$%^&*<>?/|\\';

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

function MatrixRain({ width, height }: { width: number; height: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const cols = Math.floor(width / 16);
    const drops = Array.from({ length: cols }, () => Math.random() * -50);
    let raf: number;
    const draw = () => {
      ctx.fillStyle = 'rgba(10, 15, 30, 0.15)';
      ctx.fillRect(0, 0, width, height);
      ctx.font = '12px monospace';
      drops.forEach((y, i) => {
        const a = Math.random();
        ctx.fillStyle = a > 0.9 ? '#fff' : a > 0.6 ? '#4ade80' : '#166534';
        ctx.fillText(randomChar(), i * 16, y * 16);
        if (y * 16 > height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.5;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [width, height]);
  return <canvas ref={canvasRef} width={width} height={height} className="absolute inset-0 opacity-25 pointer-events-none"/>;
}

interface Props {
  step?: string;  // real-time step from backend SSE
}

export function HackerLoader({ step }: Props) {
  const [lines, setLines]   = useState<string[]>([]);
  const [current, setCurrent] = useState('');
  const [charIdx, setCharIdx] = useState(0);
  const [blink, setBlink]   = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize]     = useState({ w: 600, h: 220 });
  const prevStep = useRef('');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // New step from backend → commit previous, start typing new
  useEffect(() => {
    if (!step || step === prevStep.current) return;
    if (prevStep.current) {
      setLines(l => [...l.slice(-20), `> ${prevStep.current}`]);
    }
    prevStep.current = step;
    setCurrent('');
    setCharIdx(0);
  }, [step]);

  // Typewriter for current step
  useEffect(() => {
    if (!step) return;
    if (charIdx >= step.length) return;
    const t = setTimeout(() => {
      setCurrent(step.slice(0, charIdx + 1));
      setCharIdx(c => c + 1);
    }, 22 + Math.random() * 18);
    return () => clearTimeout(t);
  }, [step, charIdx]);

  useEffect(() => {
    const t = setInterval(() => setBlink(b => !b), 530);
    return () => clearInterval(t);
  }, []);

  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: 9999, behavior: 'smooth' });
  }, [lines, current]);

  return (
    <div ref={containerRef} className="relative w-full overflow-hidden rounded-xl border border-green-500/20 bg-[#0a0f1e]" style={{ minHeight: 200 }}>
      <MatrixRain width={size.w} height={size.h}/>
      <div className="relative z-10 flex flex-col h-full p-4" style={{ minHeight: 200 }}>
        <div className="flex items-center gap-1.5 mb-3 flex-shrink-0">
          <div className="size-2.5 rounded-full bg-red-500/70"/>
          <div className="size-2.5 rounded-full bg-yellow-500/70"/>
          <div className="size-2.5 rounded-full bg-green-500/70"/>
          <span className="ml-2 text-[10px] text-green-500/60 font-mono tracking-widest">graphlens — analyzer</span>
        </div>
        <div ref={listRef} className="flex-1 overflow-hidden flex flex-col justify-end gap-0.5">
          {lines.map((line, i) => (
            <div key={i} className="text-[11px] font-mono text-green-500/45 leading-5 truncate">{line}</div>
          ))}
          {step && (
            <div className="text-[11px] font-mono text-green-400 leading-5 flex items-center">
              <span className="text-green-500/60 mr-1">&gt;</span>
              <span>{current}</span>
              <span className={`inline-block w-[7px] h-[13px] bg-green-400 ml-0.5 ${blink ? 'opacity-100' : 'opacity-0'}`}/>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
