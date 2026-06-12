import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Flag } from 'lucide-react';

// A vinheta roda uma única vez por carregamento da página (voltar de outra tela não repete)
let alreadyPlayed = false;

export const shouldPlayRaceIntro = (): boolean => {
  if (alreadyPlayed) return false;
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  return true;
};

type IntroStep = 'ready' | '3' | '2' | '1' | 'go' | 'exit';

const RunnerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
    <g stroke="#facc15" strokeWidth="8" strokeLinecap="round" fill="none">
      {/* Tronco inclinado para frente */}
      <path d="M60 30 L47 56" />
      {/* Braço da frente */}
      <path d="M58 34 L70 42 L82 34" />
      {/* Braço de trás */}
      <path d="M58 34 L46 40 L38 30" />
      {/* Perna da frente (joelho elevado) */}
      <path d="M47 56 L64 64 L60 82" />
      {/* Perna de trás (impulso) */}
      <path d="M47 56 L36 70 L20 74" />
    </g>
    <circle cx="66" cy="20" r="9" fill="#facc15" />
  </svg>
);

interface RaceIntroProps {
  onReveal: () => void;  // conteúdo da página pode aparecer (início do fade)
  onFinish: () => void;  // overlay pode ser desmontado
}

export const RaceIntro: React.FC<RaceIntroProps> = ({ onReveal, onFinish }) => {
  const [step, setStep] = useState<IntroStep>('ready');
  const onRevealRef = useRef(onReveal);
  const onFinishRef = useRef(onFinish);
  const finishedRef = useRef(false);

  useEffect(() => {
    onRevealRef.current = onReveal;
    onFinishRef.current = onFinish;
  });

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onRevealRef.current();
    onFinishRef.current();
  }, []);

  useEffect(() => {
    alreadyPlayed = true;
    const timers = [
      setTimeout(() => setStep('3'), 400),
      setTimeout(() => setStep('2'), 1150),
      setTimeout(() => setStep('1'), 1900),
      setTimeout(() => setStep('go'), 2650),
      setTimeout(() => { setStep('exit'); onRevealRef.current(); }, 3850),
      setTimeout(() => {
        if (!finishedRef.current) {
          finishedRef.current = true;
          onFinishRef.current();
        }
      }, 4350),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const isCounting = step === '3' || step === '2' || step === '1';

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm cursor-pointer select-none ${step === 'exit' ? 'animate-intro-exit' : ''}`}
      onClick={finish}
      aria-hidden="true"
    >
      {/* Badge do evento */}
      <div className="text-yellow-400 text-xs md:text-sm font-bold uppercase tracking-widest border border-yellow-400/40 px-4 py-1.5 rounded-full mb-10 animate-fade-in-up">
        2ª Corrida Noturna LSC · 5K
      </div>

      {/* Contagem regressiva / Largada */}
      <div className="relative h-36 md:h-48 w-full flex items-center justify-center">
        {isCounting && (
          <>
            <span
              key={`ring-${step}`}
              className="absolute w-36 h-36 md:w-48 md:h-48 rounded-full border-2 border-yellow-400/50 animate-shockwave"
            />
            <span
              key={`num-${step}`}
              className="text-[7rem] md:text-[10rem] leading-none font-black italic text-yellow-400 animate-count-stamp [text-shadow:0_0_20px_rgba(250,204,21,0.8),0_0_60px_rgba(250,204,21,0.45)]"
            >
              {step}
            </span>
          </>
        )}
        {(step === 'go' || step === 'exit') && (
          <span className="text-5xl md:text-8xl font-black italic text-white animate-go-burst [text-shadow:0_0_25px_rgba(250,204,21,0.9),0_0_70px_rgba(250,204,21,0.5)]">
            LARGADA!
          </span>
        )}
      </div>

      {/* Pista com o corredor */}
      <div className="absolute bottom-14 left-0 right-0 h-20" aria-hidden="true">
        <div className="absolute bottom-0 left-0 right-0 border-t-2 border-dashed border-slate-700"></div>
        <div className="absolute right-6 bottom-3 flex items-center gap-1 text-yellow-400 font-black italic text-lg [text-shadow:0_0_12px_rgba(250,204,21,0.6)]">
          <Flag size={18} aria-hidden="true" /> 5K
        </div>
        {(step === 'go' || step === 'exit') && (
          <div className="absolute bottom-1 left-0 animate-sprint-across will-change-transform">
            <div className="relative [filter:drop-shadow(0_0_8px_rgba(250,204,21,0.7))]">
              {/* Rastro de luz */}
              <div className="absolute right-full top-1/2 -translate-y-1/2 w-[45vw] h-1 bg-gradient-to-l from-yellow-400/80 via-yellow-400/25 to-transparent rounded-full"></div>
              <div className="absolute right-full top-1/3 w-[30vw] h-0.5 bg-gradient-to-l from-white/60 to-transparent rounded-full"></div>
              <div className="animate-runner-bob">
                <RunnerIcon className="h-14 w-14 md:h-16 md:w-16" />
              </div>
            </div>
          </div>
        )}
      </div>

      <span className="absolute bottom-5 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
        Toque para pular
      </span>
    </div>
  );
};
