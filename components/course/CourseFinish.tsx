import React from 'react';
import { RotateCcw, ChevronRight, X } from 'lucide-react';
import { COURSE } from './courseData';
import { fmtDistance } from './courseGeo';

interface CourseFinishProps {
  onReplay: () => void;
  onRegister: () => void;
  onClose: () => void;
}

// Tela de conclusão: medalha girando em 3D, parabéns e chamada para inscrição
export const CourseFinish: React.FC<CourseFinishProps> = ({ onReplay, onRegister, onClose }) => {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
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
        <button
          onClick={onReplay}
          className="w-full inline-flex items-center justify-center gap-2 text-slate-400 hover:text-white text-sm font-bold py-2 transition-colors"
        >
          <RotateCcw size={15} /> Assistir de novo
        </button>
      </div>
    </div>
  );
};
