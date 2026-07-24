import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, X, Map as MapIcon, AlertTriangleIcon } from 'lucide-react';
import { COURSE } from './courseData';
import { fmtDistance, pointAtProgress } from './courseGeo';
import { useMapboxCourse } from './useMapboxCourse';
import { useRouteAnimation } from './useRouteAnimation';
import { CourseHUD } from './CourseHUD';
import { CourseTimeline } from './CourseTimeline';
import { CourseFinish } from './CourseFinish';

interface CourseExperienceProps {
  onClose: () => void;
  onRegister: () => void;
}

type Phase = 'intro' | 'flying' | 'running' | 'finished';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

// Experiência em tela cheia do percurso: intro → voo cinematográfico →
// animação da linha com câmera seguindo → medalha e chamada de inscrição.
export const CourseExperience: React.FC<CourseExperienceProps> = ({ onClose, onRegister }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const map = useMapboxCourse(mapContainerRef, MAPBOX_TOKEN);
  const anim = useRouteAnimation({
    durationMs: 26000,
    onFinish: () => {
      setPhase('finished');
      map.zoomOutFinish();
    },
  });

  // Enquadra o percurso inteiro no fundo enquanto a intro está visível
  useEffect(() => {
    if (map.ready && phase === 'intro') map.showOverview();
  }, [map.ready, phase]);

  // Move marcador/linha (e segue com a câmera durante a corrida)
  useEffect(() => {
    if (!map.ready) return;
    map.setProgress(anim.progress, phase === 'running');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim.progress, map.ready, phase]);

  const handleStart = useCallback(() => {
    setPhase('flying');
    map.flyToStart(() => {
      setPhase('running');
      anim.play();
    });
  }, [map, anim]);

  const handleReplay = useCallback(() => {
    setPhase('running');
    anim.replay();
  }, [anim]);

  const handleSeek = useCallback((p: number) => {
    if (phase === 'intro' || phase === 'flying') setPhase('running');
    if (phase === 'finished' && p < 1) setPhase('running');
    anim.seek(p);
  }, [anim, phase]);

  // Tela cheia
  const toggleFullscreen = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.().catch(() => {});
    else document.exitFullscreen?.().catch(() => {});
  }, []);
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const distanceMeters = anim.progress * COURSE.totalMeters;
  const currentEle = pointAtProgress(anim.progress).ele;

  // --- Sem token do Mapbox: mostra aviso claro em vez de mapa quebrado ---
  if (!MAPBOX_TOKEN) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center p-6 animate-fade-in">
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-400/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangleIcon size={30} className="text-yellow-400" />
          </div>
          <h2 className="text-2xl font-black italic text-white mb-2">Mapa em configuração</h2>
          <p className="text-slate-400 text-sm mb-6">
            O mapa 3D do percurso precisa de uma chave do Mapbox (variável <code className="text-yellow-400">VITE_MAPBOX_TOKEN</code>).
            Enquanto isso, o percurso oficial tem <strong className="text-white">{fmtDistance(COURSE.totalMeters)}</strong> com
            +{Math.round(COURSE.elevationGain)} m de elevação.
          </p>
          <button onClick={onRegister} className="w-full bg-yellow-400 text-slate-900 px-6 py-3.5 rounded-xl font-black italic uppercase tracking-wider hover:bg-white transition-all">
            Fazer inscrição
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="fixed inset-0 z-[100] bg-slate-950 animate-fade-in">
      {/* Mapa */}
      <div ref={mapContainerRef} className="course-map absolute inset-0" />

      {/* Botão fechar (sempre acessível) */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-40 w-10 h-10 rounded-full bg-slate-950/60 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-slate-800 transition-colors"
        title="Fechar"
      >
        <X size={20} />
      </button>

      {/* Carregando o mapa */}
      {!map.ready && phase !== 'finished' && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <MapIcon size={32} className="text-yellow-400 animate-pulse" />
            <p className="text-sm font-bold">Carregando o mapa do percurso...</p>
          </div>
        </div>
      )}

      {/* Tela inicial: botão Iniciar percurso */}
      {phase === 'intro' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-950/60 via-slate-950/20 to-slate-950/80">
          <div className="text-center max-w-lg animate-fade-in-up">
            <p className="text-yellow-400 text-xs font-bold uppercase tracking-[0.3em] mb-3">Percurso Oficial · 5 km</p>
            <h1 className="text-4xl md:text-5xl font-black italic text-white mb-3 drop-shadow-2xl">CONHEÇA O TRAJETO</h1>
            <p className="text-slate-300 mb-2">2ª Corrida Noturna LSC · Laranjal Paulista/SP</p>
            <p className="text-slate-400 text-sm mb-8">
              {fmtDistance(COURSE.totalMeters)} · +{Math.round(COURSE.elevationGain)} m de elevação · {COURSE.minEle.toFixed(0)}–{COURSE.maxEle.toFixed(0)} m
            </p>
            <button
              onClick={handleStart}
              disabled={!map.ready}
              className="group inline-flex items-center justify-center gap-3 bg-yellow-400 text-slate-900 px-10 py-5 rounded-2xl font-black italic text-xl uppercase tracking-wider hover:bg-white hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(250,204,21,0.4)] disabled:opacity-60 disabled:hover:scale-100"
            >
              <Play size={24} className="fill-slate-900" /> Iniciar percurso
            </button>
          </div>
        </div>
      )}

      {/* HUD + timeline aparecem depois que a experiência começa */}
      {(phase === 'running' || phase === 'finished') && (
        <>
          <CourseHUD
            distanceMeters={distanceMeters}
            elevation={currentEle}
            progress={anim.progress}
            isPlaying={anim.isPlaying}
            isFullscreen={isFullscreen}
            onToggle={anim.toggle}
            onReplay={handleReplay}
            onFullscreen={toggleFullscreen}
          />
          <CourseTimeline progress={anim.progress} onSeek={handleSeek} />
        </>
      )}

      {/* Voo cinematográfico: dica sutil */}
      {phase === 'flying' && (
        <div className="absolute inset-x-0 bottom-10 z-20 text-center animate-fade-in">
          <p className="text-white/80 text-sm font-bold tracking-wider">Sobrevoando até a largada...</p>
        </div>
      )}

      {/* Conclusão */}
      {phase === 'finished' && (
        <CourseFinish onReplay={handleReplay} onRegister={onRegister} onClose={onClose} />
      )}
    </div>
  );
};

export default CourseExperience;
