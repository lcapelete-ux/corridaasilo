import React, { useMemo, useRef } from 'react';
import { COURSE } from './courseData';

interface CourseTimelineProps {
  progress: number;        // 0..1
  onSeek: (p: number) => void;
}

// Barra inferior: perfil de elevação (SVG leve) + marcos de KM + scrub.
// Clicar/arrastar move o marcador para o ponto correspondente.
export const CourseTimeline: React.FC<CourseTimelineProps> = ({ progress, onSeek }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  // Perfil de elevação como path SVG (reamostrado para ~140 pontos)
  const { areaPath, linePath } = useMemo(() => {
    const N = 140;
    const W = 1000, H = 100;
    const eMin = COURSE.minEle, eMax = COURSE.maxEle;
    const range = Math.max(1, eMax - eMin);
    const pts: [number, number][] = [];
    for (let i = 0; i < N; i++) {
      const frac = i / (N - 1);
      const targetM = frac * COURSE.totalMeters;
      // acha o índice pela distância acumulada
      let lo = 0, hi = COURSE.cumMeters.length - 1;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (COURSE.cumMeters[mid] < targetM) lo = mid + 1; else hi = mid; }
      const ele = COURSE.coords[lo][2];
      const x = frac * W;
      const y = H - ((ele - eMin) / range) * (H - 12) - 6;
      pts.push([x, y]);
    }
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
    const area = `${line} L${W},${H} L0,${H} Z`;
    return { areaPath: area, linePath: line };
  }, []);

  const kmTicks = useMemo(() => {
    const totalKm = Math.floor(COURSE.totalMeters / 1000);
    return Array.from({ length: totalKm }, (_, i) => (i + 1) * 1000 / COURSE.totalMeters);
  }, []);

  const seekFromClientX = (clientX: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    onSeek((clientX - rect.left) / rect.width);
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4 md:p-6">
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-white/10 bg-slate-950/50 backdrop-blur-md shadow-2xl px-4 pt-3 pb-4 md:px-6">
        {/* Perfil de elevação */}
        <div className="relative h-16 mb-1">
          <svg viewBox="0 0 1000 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            <defs>
              <linearGradient id="elevFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22c55e" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#22c55e" stopOpacity="0.03" />
              </linearGradient>
              <clipPath id="elevClip"><rect x="0" y="0" width={1000 * progress} height="100" /></clipPath>
            </defs>
            {/* base apagada */}
            <path d={areaPath} fill="url(#elevFill)" opacity="0.25" />
            <path d={linePath} fill="none" stroke="#475569" strokeWidth="2" />
            {/* trecho percorrido, destacado */}
            <g clipPath="url(#elevClip)">
              <path d={areaPath} fill="url(#elevFill)" />
              <path d={linePath} fill="none" stroke="#4ade80" strokeWidth="2.5" />
            </g>
          </svg>
        </div>

        {/* Trilha de scrub com marcos de KM */}
        <div
          ref={trackRef}
          onPointerDown={e => { draggingRef.current = true; (e.target as HTMLElement).setPointerCapture(e.pointerId); seekFromClientX(e.clientX); }}
          onPointerMove={e => { if (draggingRef.current) seekFromClientX(e.clientX); }}
          onPointerUp={() => { draggingRef.current = false; }}
          className="relative h-6 cursor-pointer flex items-center"
        >
          <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/10" />
          <div className="absolute left-0 h-1.5 rounded-full bg-gradient-to-r from-emerald-500 to-yellow-400" style={{ width: `${progress * 100}%` }} />
          {/* Marcos KM */}
          {kmTicks.map((t, i) => (
            <div key={i} className="absolute -translate-x-1/2 flex flex-col items-center" style={{ left: `${t * 100}%` }}>
              <div className="w-0.5 h-2.5 bg-slate-500" />
              <span className="text-[8px] text-slate-400 font-bold mt-0.5">{i + 1}km</span>
            </div>
          ))}
          {/* Cabeça (marcador na barra) */}
          <div
            className="absolute -translate-x-1/2 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white shadow-[0_0_10px_2px_rgba(34,197,94,0.7)]"
            style={{ left: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};
