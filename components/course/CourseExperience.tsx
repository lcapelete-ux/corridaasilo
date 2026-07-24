import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Play, X, Map as MapIcon, AlertTriangleIcon, Download } from 'lucide-react';
import { COURSE } from './courseData';
import { fmtDistance, pointAtProgress } from './courseGeo';
import { useCourseMap } from './useCourseMap';
import { useRouteAnimation } from './useRouteAnimation';
import { CourseHUD } from './CourseHUD';
import { CourseTimeline } from './CourseTimeline';
import { CourseFinish } from './CourseFinish';

interface CourseExperienceProps {
  onClose: () => void;
  onRegister: () => void;
}

type Phase = 'intro' | 'flying' | 'running' | 'finished';

// Experiência em tela cheia do percurso: intro → voo cinematográfico →
// animação da linha com câmera seguindo → medalha e chamada de inscrição.
export const CourseExperience: React.FC<CourseExperienceProps> = ({ onClose, onRegister }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const map = useCourseMap(mapContainerRef);
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

  // --- Mapa não carregou (ex.: sem internet): aviso claro em vez de tela vazia ---
  if (map.failed) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center p-6 animate-fade-in">
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
        <div className="max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-400/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangleIcon size={30} className="text-yellow-400" />
          </div>
          <h2 className="text-2xl font-black italic text-white mb-2">Não foi possível carregar o mapa</h2>
          <p className="text-slate-400 text-sm mb-6">
            Verifique sua conexão e tente de novo. O percurso oficial tem
            {' '}<strong className="text-white">{fmtDistance(COURSE.totalMeters)}</strong> com
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
      {/* Mapa. O tamanho vai por style inline de propósito: o MapLibre adiciona
          a classe .maplibregl-map (position: relative) na mesma div, que
          sobrescreveria um "absolute inset-0" via classe e colapsaria a altura
          para 0. O style inline vence o CSS do MapLibre e garante o preenchimento. */}
      <div ref={mapContainerRef} className="course-map" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />

      {/* Botão fechar (sempre acessível) */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-40 w-10 h-10 rounded-full bg-slate-950/60 backdrop-blur-md border border-white/10 text-white flex items-center justify-center hover:bg-slate-800 transition-colors"
        title="Fechar"
      >
        <X size={20} />
      </button>

      {/* Aviso: as ruas do mapa não carregaram (tiles bloqueados/rede/cache) */}
      {map.tilesFailed && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 max-w-[90%] text-center">
          <div className="inline-block rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-bold px-3 py-2 backdrop-blur-md">
            As ruas do mapa não carregaram (conexão?). O traçado do percurso segue visível.
          </div>
        </div>
      )}

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
            {/* Baixar o arquivo GPX do percurso (abre em Strava, Garmin, Google Earth etc.) */}
            <div className="mt-5">
              <a
                href={`${import.meta.env.BASE_URL}percurso-lsc.gpx`}
                download="percurso-2a-corrida-noturna-lsc.gpx"
                className="inline-flex items-center gap-2 text-slate-300 hover:text-white text-sm font-bold border border-white/15 hover:border-white/40 rounded-xl px-5 py-2.5 transition-all bg-slate-950/40 backdrop-blur-md"
              >
                <Download size={16} className="text-yellow-400" /> Baixar percurso (GPX)
              </a>
              <p className="text-[11px] text-slate-500 mt-2">Abra no Strava, Garmin, Google Earth ou no seu relógio.</p>
            </div>
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
            speed={anim.speed}
            onSpeed={anim.setSpeed}
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
