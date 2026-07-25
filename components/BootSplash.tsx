import React, { useEffect, useRef, useState } from 'react';
import sicrediLogo from '../assets/sicredi-logo.jpg';
import rondontexLogo from '../assets/rondontex-logo.png';

interface BootSplashProps {
  // Chamado uma única vez, quando o site está pronto (imagens da vinheta
  // pré-carregadas + fontes) e o tempo mínimo de tela passou.
  onReady: () => void;
}

// Tempo mínimo de tela para o carregamento não "piscar", e teto de segurança
// para nunca travar caso um recurso demore/ falhe (rede lenta ou offline).
// MIN_MS casa com a animação da barra estática do index.html (1600ms), para
// a React BootSplash continuar a barra do mesmo ponto sem "voltar ao zero".
const MIN_MS = 1600;
const HARD_CAP_MS = 5000;
const FADE_MS = 520;

// Posição da barra (0–92%) em função do tempo desde o carregamento da página.
// Mesma curva (easeOutCubic) e duração usadas pela barra estática no HTML.
const barTargetAt = (elapsedMs: number) => {
  const f = Math.min(1, Math.max(0, elapsedMs) / MIN_MS);
  return (1 - Math.pow(1 - f, 3)) * 92;
};

// Tempo desde o início da navegação (≈ carregamento da página). performance.now()
// é relativo ao timeOrigin do documento, então serve de âncora comum entre a
// barra estática e esta.
const pageElapsed = () => {
  try {
    return performance.now();
  } catch {
    return MIN_MS;
  }
};

// Pré-carrega uma imagem sem travar em caso de erro (resolve de qualquer forma)
const preload = (src: string) =>
  new Promise<void>((resolve) => {
    const img = new Image();
    const done = () => resolve();
    img.onload = done;
    img.onerror = done;
    img.src = src;
  });

// Tela de carregamento: aparece primeiro, prepara os recursos da vinheta
// (logos Sicredi/RondonTex) e só então libera a introdução.
export const BootSplash: React.FC<BootSplashProps> = ({ onReady }) => {
  // Já inicia na posição em que a barra estática do index.html está (tempo
  // relativo ao load), para o primeiro quadro emendar sem salto.
  const [progress, setProgress] = useState(() => barTargetAt(pageElapsed()));
  const [leaving, setLeaving] = useState(false);
  const onReadyRef = useRef(onReady);
  const finishedRef = useRef(false);

  useEffect(() => {
    onReadyRef.current = onReady;
  });

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    let tasksDone = false;

    const fontsReady =
      typeof document !== 'undefined' && (document as any).fonts?.ready
        ? (document as any).fonts.ready
        : Promise.resolve();

    Promise.all([preload(sicrediLogo), preload(rondontexLogo), fontsReady])
      .then(() => { tasksDone = true; })
      .catch(() => { tasksDone = true; });

    // Teto de segurança: se algo demorar demais, segue mesmo assim
    const hardCap = setTimeout(() => { tasksDone = true; }, HARD_CAP_MS);

    const finish = () => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      setLeaving(true);
      setTimeout(() => { if (!cancelled) onReadyRef.current(); }, FADE_MS);
    };

    const tick = () => {
      if (cancelled) return;
      const elapsed = pageElapsed();
      // Barra sobe suave (ease-out) até ~92% enquanto carrega; fecha em 100%
      // quando os recursos terminam E o tempo mínimo já passou.
      let target = barTargetAt(elapsed);
      if (tasksDone && elapsed >= MIN_MS) target = 100;
      setProgress((p) => (target > p ? target : p));
      if (target >= 100) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(hardCap);
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center overflow-hidden transition-opacity ease-out ${leaving ? 'opacity-0' : 'opacity-100'}`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      aria-label="Carregando"
      role="status"
    >
      {/* Brilhos de fundo — mesma identidade da tela inicial, para a transição
          para a vinheta ficar contínua */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-yellow-500 rounded-full blur-[120px] opacity-20" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-900 rounded-full blur-[100px] opacity-25" />
      </div>

      <div className="relative z-10 flex flex-col items-center px-6">
        {/* Selo do evento (igual ao da vinheta, para dar continuidade) */}
        <div className="text-yellow-400 text-xs md:text-sm font-bold uppercase tracking-widest border border-yellow-400/40 px-4 py-1.5 rounded-full mb-8 animate-fade-in-up">
          2ª Corrida Noturna LSC · 5K
        </div>

        {/* Título */}
        <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter text-white text-center leading-tight mb-1">
          2ª CORRIDA NOTURNA LSC
        </h1>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.25em] mb-9">
          Laranjal Paulista
        </p>

        {/* Barra de progresso com o corredor na ponta */}
        <div className="relative w-64 md:w-80">
          <div
            className="absolute -top-6 -translate-x-1/2 text-lg leading-none transition-[left] duration-150 ease-out"
            style={{ left: `${progress}%` }}
            aria-hidden="true"
          >
            🏃
          </div>
          <div className="h-1.5 rounded-full bg-slate-800/80 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.6)] transition-[width] duration-150 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <p className="mt-5 text-slate-400 text-xs font-bold uppercase tracking-widest">
          Carregando…
        </p>
      </div>
    </div>
  );
};
