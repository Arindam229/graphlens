import { useEffect, useRef, useState, useCallback } from 'react';

const W = 800;
const H = 180;
const GROUND = H - 30;
const DINO_X = 80;
const DINO_W = 40;
const DINO_H = 50;
const GRAVITY = 0.7;
const JUMP_FORCE = -14;
const INIT_SPEED = 5;

type Obs = { x: number; w: number; h: number };
type Cloud = { x: number; y: number; w: number };

function drawDino(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number) {
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(x + 10, y + 10, 24, 28);
  ctx.fillRect(x + 20, y, 20, 16);
  ctx.fillStyle = '#0a0f1e';
  ctx.fillRect(x + 34, y + 4, 4, 4);
  ctx.fillStyle = '#4ade80';
  ctx.fillRect(x + 10, y + 16, 8, 6);
  if (frame % 2 === 0) {
    ctx.fillRect(x + 14, y + 36, 8, 14);
    ctx.fillRect(x + 26, y + 36, 8, 8);
  } else {
    ctx.fillRect(x + 14, y + 36, 8, 8);
    ctx.fillRect(x + 26, y + 36, 8, 14);
  }
  ctx.fillRect(x + 2, y + 14, 10, 8);
}

function drawCactus(ctx: CanvasRenderingContext2D, o: Obs) {
  ctx.fillStyle = '#22c55e';
  ctx.fillRect(o.x + o.w / 2 - 6, GROUND - o.h, 12, o.h);
  ctx.fillRect(o.x, GROUND - o.h * 0.65, o.w / 2 - 2, 8);
  ctx.fillRect(o.x, GROUND - o.h * 0.8, 10, o.h * 0.2);
  ctx.fillRect(o.x + o.w / 2 + 2, GROUND - o.h * 0.55, o.w / 2 - 2, 8);
  ctx.fillRect(o.x + o.w - 10, GROUND - o.h * 0.7, 10, o.h * 0.16);
}

function makeState() {
  return {
    started: false, dead: false,
    dinoY: GROUND - DINO_H, velY: 0, onGround: true,
    obstacles: [] as Obs[],
    clouds: [
      { x: 200, y: 30, w: 80 }, { x: 500, y: 20, w: 60 }, { x: 700, y: 40, w: 70 },
    ] as Cloud[],
    speed: INIT_SPEED, score: 0, frame: 0, nextObs: 80,
    raf: 0,
  };
}

export function DinoGame({ isDark }: { isDark?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const s = useRef(makeState());
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'playing' | 'dead'>('idle');

  const startLoop = useCallback(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const BG = '#0a0f1e';

    const loop = () => {
      const st = s.current;

      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, GROUND, W, 2);

      st.clouds.forEach(c => {
        ctx.fillStyle = 'rgba(34,197,94,0.07)';
        ctx.fillRect(c.x, c.y, c.w, 18);
        ctx.fillRect(c.x + 10, c.y - 10, c.w - 20, 10);
        c.x -= st.speed * 0.3;
        if (c.x + c.w < 0) c.x = W + Math.random() * 200;
      });

      st.frame++;
      st.score += 0.05;
      setScore(Math.floor(st.score));
      st.speed = INIT_SPEED + st.score * 0.004;

      if (!st.onGround) {
        st.velY += GRAVITY;
        st.dinoY += st.velY;
      }
      if (st.dinoY >= GROUND - DINO_H) {
        st.dinoY = GROUND - DINO_H; st.velY = 0; st.onGround = true;
      }

      st.nextObs--;
      if (st.nextObs <= 0) {
        st.obstacles.push({ x: W + 20, w: 28 + Math.random() * 24, h: 40 + Math.random() * 40 });
        st.nextObs = Math.max(30, 55 + Math.random() * 70 - st.score * 0.05);
      }
      st.obstacles.forEach(o => { o.x -= st.speed; });
      st.obstacles = st.obstacles.filter(o => o.x + o.w > 0);

      for (const o of st.obstacles) {
        if (
          DINO_X + DINO_W - 4 > o.x + 4 &&
          DINO_X + 8 < o.x + o.w - 4 &&
          st.dinoY + DINO_H - 2 > GROUND - o.h &&
          st.dinoY + 6 < GROUND
        ) {
          // DEAD — draw final frame then stop
          st.obstacles.forEach(ob => drawCactus(ctx, ob));
          drawDino(ctx, DINO_X, st.dinoY, 0);

          ctx.fillStyle = '#4ade80';
          ctx.font = 'bold 18px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('GAME OVER', W / 2, H / 2 - 10);
          ctx.font = '11px monospace';
          ctx.fillStyle = 'rgba(74,222,128,0.55)';
          ctx.fillText('[ SPACE / CLICK ] to restart', W / 2, H / 2 + 12);
          ctx.textAlign = 'left';

          ctx.fillStyle = 'rgba(74,222,128,0.45)';
          ctx.font = '11px monospace';
          ctx.fillText(`SCORE ${String(Math.floor(st.score)).padStart(5, '0')}`, W - 120, 20);

          // Freeze — do NOT request next frame
          setPhase('dead');
          return;
        }
      }

      st.obstacles.forEach(o => drawCactus(ctx, o));
      drawDino(ctx, DINO_X, st.dinoY, Math.floor(st.frame / 6));

      ctx.fillStyle = 'rgba(74,222,128,0.45)';
      ctx.font = '11px monospace';
      ctx.fillText(`SCORE ${String(Math.floor(st.score)).padStart(5, '0')}`, W - 120, 20);
      const spd = Math.min(Math.floor((st.speed / INIT_SPEED - 1) * 10), 10);
      ctx.fillText(`SPD ${'█'.repeat(spd)}${'░'.repeat(10 - spd)}`, W - 120, 35);

      st.raf = requestAnimationFrame(loop);
    };

    s.current.raf = requestAnimationFrame(loop);
  }, []);

  // Draw idle screen
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0a0f1e';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, GROUND, W, 2);
    drawDino(ctx, DINO_X, GROUND - DINO_H, 0);
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('[ SPACE / CLICK ] to start', W / 2, H / 2 + 10);
    ctx.textAlign = 'left';
  }, []);

  const handleInput = useCallback(() => {
    const st = s.current;

    if (phase === 'dead') {
      // Restart
      cancelAnimationFrame(st.raf);
      s.current = makeState();
      s.current.started = true;
      setScore(0);
      setPhase('playing');
      startLoop();
      return;
    }

    if (phase === 'idle') {
      st.started = true;
      setPhase('playing');
      startLoop();
    }

    // Jump
    if (st.onGround) {
      st.velY = JUMP_FORCE;
      st.onGround = false;
    }
  }, [phase, startLoop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); handleInput(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleInput]);

  useEffect(() => {
    return () => cancelAnimationFrame(s.current.raf);
  }, []);

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 text-[10px] font-mono text-green-500/50 self-start">
        <span className="animate-pulse">▶</span>
        <span>PLAY WHILE YOU WAIT</span>
        {phase === 'playing' && <span className="text-green-400/70">score: {score}</span>}
        {phase === 'dead' && <span className="text-red-400/70">score: {score} — press space to retry</span>}
      </div>
      <div className="w-full rounded-xl overflow-hidden border border-green-500/15 cursor-pointer" style={{ maxWidth: W }} onClick={handleInput}>
        <canvas ref={canvasRef} width={W} height={H} className="w-full block" style={{ imageRendering: 'pixelated' }}/>
      </div>
    </div>
  );
}
