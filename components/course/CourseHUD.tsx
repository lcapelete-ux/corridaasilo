import React from 'react';
import { Play, Pause, RotateCcw, Maximize2, Minimize2, TrendingUp, MapPin, Flag } from 'lucide-react';
import { COURSE } from './courseData';
import { fmtDistance } from './courseGeo';

interface CourseHUDProps {
  distanceMeters: number;
  elevation: number;
  progress: number; // 0..1
  isPlaying: boolean;
  isFullscreen: boolean;
  onToggle: () => void;
  onReplay: () => void;
  onFullscreen: () => void;
}

// Painel de informações (glassmorphism) com stats e controles de reprodução
export const CourseHUD: React.FC<CourseHUDProps> = ({
  distanceMeters, elevation, progress, isPlaying, isFullscreen, onToggle, onReplay, onFullscreen,
}) => {
  const pct = Math.round(progress * 100);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-4 md:p-6">
      <div className="pointer-events-auto mx-auto max-w-3xl rounded-2xl border border-white/10 bg-slate-950/50 backdrop-blur-md shadow-2xl px-4 py-3 md:px-6 md:py-4">
        <div className="flex items-center justify-between gap-3">
          {/* Nome do percurso */}
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-yellow-400 font-bold flex items-center gap-1">
              <Flag size={11} /> Percurso oficial
            </p>
            <p className="text-white font-black italic text-sm md:text-base truncate">2ª Corrida Noturna LSC</p>
          </div>
          {/* Controles */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onToggle}
              className="w-10 h-10 rounded-full bg-yellow-400 text-slate-900 flex items-center justify-center hover:bg-white transition-colors shadow-lg"
              title={isPlaying ? 'Pausar' : 'Reproduzir'}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </button>
            <button
              onClick={onReplay}
              className="w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors border border-white/10"
              title="Recomeçar"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={onFullscreen}
              className="w-10 h-10 rounded-full bg-white/10 text-white items-center justify-center hover:bg-white/20 transition-colors border border-white/10 hidden sm:flex"
              title="Tela cheia"
            >
              {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <Stat icon={<MapPin size={13} />} label="Distância" value={fmtDistance(distanceMeters)} sub={`de ${fmtDistance(COURSE.totalMeters)}`} />
          <Stat icon={<TrendingUp size={13} />} label="Elevação" value={`${Math.round(elevation)} m`} sub={`+${Math.round(COURSE.elevationGain)} m no total`} />
          <Stat icon={<Flag size={13} />} label="Progresso" value={`${pct}%`} sub={pct >= 100 ? 'concluído!' : 'do percurso'} />
        </div>
      </div>
    </div>
  );
};

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: string; sub: string }> = ({ icon, label, value, sub }) => (
  <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-center">
    <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold flex items-center justify-center gap-1">{icon} {label}</p>
    <p className="text-white font-black text-base md:text-lg leading-tight mt-0.5">{value}</p>
    <p className="text-[9px] text-slate-500 truncate">{sub}</p>
  </div>
);
