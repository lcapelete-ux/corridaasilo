import React, { useEffect, useRef } from 'react';
import { RotateCcw, ChevronRight, X, Download } from 'lucide-react';
import { COURSE } from './courseData';
import { fmtDistance } from './courseGeo';

interface CourseFinishProps {
  onReplay: () => void;
  onRegister: () => void;
  onClose: () => void;
}

// Confetes/fogos leves em canvas: partículas caindo + alguns estouros. Usa
// requestAnimationFrame, para sozinho após ~5,5s e limpa tudo ao desmontar.
function useConfetti(canvasRef: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let running = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = canvas.clientWidth * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    window.addEventListener('resize', resize);

    const colors = ['#facc15', '#22c55e', '#38bdf8', '#ffffff', '#f59e0b'];
    interface P { x: number; y: number; vx: number; vy: number; r: number; c: string; rot: number; vr: number; life: number; }
    const parts: P[] = [];
    const W = () => canvas.width, H = () => canvas.height;

    // Confetes caindo do topo
    for (let i = 0; i < 90; i++) {
      parts.push({
        x: Math.random() * W(), y: -Math.random() * H() * 0.4,
        vx: (Math.random() - 0.5) * 1.5 * dpr, vy: (1 + Math.random() * 2) * dpr,
        r: (3 + Math.random() * 4) * dpr, c: colors[(Math.random() * colors.length) | 0],
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.2, life: 1,
      });
    }
    // Dois estouros discretos de "fogos"
    const burst = (cx: number, cy: number) => {
      for (let i = 0; i < 40; i++) {
        const a = (Math.PI * 2 * i) / 40;
        const sp = (2 + Math.random() * 2.5) * dpr;
        parts.push({
          x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          r: (1.5 + Math.random() * 2) * dpr, c: colors[(Math.random() * colors.length) | 0],
          rot: 0, vr: 0, life: 1,
        });
      }
    };
    setTimeout(() => running && burst(W() * 0.3, H() * 0.35), 250);
    setTimeout(() => running && burst(W() * 0.7, H() * 0.3), 900);

    const start = performance.now();
    const tick = (now: number) => {
      if (!running) return;
      const t = now - start;
      ctx.clearRect(0, 0, W(), H());
      for (const p of parts) {
        p.vy += 0.02 * dpr;      // gravidade leve
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        if (t > 3500) p.life -= 0.015; // fade nos últimos segundos
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.c;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (t < 5500) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W(), H());
    };
    raf = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [canvasRef]);
}

// Tela de conclusão: medalha girando em 3D, parabéns e chamada para inscrição
export const CourseFinish: React.FC<CourseFinishProps> = ({ onReplay, onRegister, onClose }) => {
  const confettiRef = useRef<HTMLCanvasElement>(null);
  useConfetti(confettiRef);
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <canvas ref={confettiRef} className="pointer-events-none absolute inset-0 w-full h-full" />
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 shadow-2xl p-8 text-center overflow-hidden">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors" title="Fechar">
          <X size={20} />
        </button>

        {/* Medalha 3D */}
        <div className="mx-auto mb-6" style={{ perspective: '600px' }}>
          <div className="animate-medal-spin mx-auto w-28 h-28 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(250,204,21,0.5)]"
               style={{ background: 'radial-gradient(circle at 35% 30%, #fde68a, #f59e0b 55%, #b45309)' }}>
            <div className="w-20 h-20 rounded-full border-4 border-yellow-200/60 flex items-center justify-center bg-yellow-500/20">
              <span className="text-4xl">🏅</span>
            </div>
          </div>
        </div>

        <h2 className="text-3xl font-black italic text-white mb-1">Parabéns!</h2>
        <p className="text-slate-400 mb-1">Você concluiu o percurso.</p>
        <p className="text-emerald-400 font-bold text-sm mb-6">
          {fmtDistance(COURSE.totalMeters)} · +{Math.round(COURSE.elevationGain)} m de elevação
        </p>

        <button
          onClick={onRegister}
          className="group w-full inline-flex items-center justify-center gap-2 bg-yellow-400 text-slate-900 px-6 py-4 rounded-xl font-black italic uppercase tracking-wider hover:bg-white transition-all shadow-[0_0_30px_rgba(250,204,21,0.4)] mb-3"
        >
          Faça sua inscrição
          <ChevronRight size={20} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
        </button>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={onReplay}
            className="inline-flex items-center justify-center gap-2 text-slate-400 hover:text-white text-sm font-bold py-2 transition-colors"
          >
            <RotateCcw size={15} /> Assistir de novo
          </button>
          <a
            href={`${import.meta.env.BASE_URL}percurso-lsc.gpx`}
            download="percurso-2a-corrida-noturna-lsc.gpx"
            className="inline-flex items-center justify-center gap-2 text-slate-400 hover:text-white text-sm font-bold py-2 transition-colors"
          >
            <Download size={15} /> Baixar GPX
          </a>
        </div>
      </div>
    </div>
  );
};
