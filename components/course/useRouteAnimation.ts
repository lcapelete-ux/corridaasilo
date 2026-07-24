import { useCallback, useEffect, useRef, useState } from 'react';

interface Options {
  durationMs?: number;       // tempo total para percorrer 0→100%
  onFinish?: () => void;     // disparado ao chegar em 100%
}

// Controla o progresso (0..1) da animação do percurso via requestAnimationFrame.
// Independente do mapa: quem consome usa `progress` para mover marcador/câmera.
export function useRouteAnimation({ durationMs = 24000, onFinish }: Options = {}) {
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeedState] = useState(1); // multiplicador: 1x, 2x, 4x, 8x

  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const speedRef = useRef(1);
  const finishedRef = useRef(false);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const setSpeed = useCallback((s: number) => {
    speedRef.current = s;
    setSpeedState(s);
  }, []);

  const stopRaf = () => {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    lastTsRef.current = null;
  };

  const tick = useCallback((ts: number) => {
    if (lastTsRef.current == null) lastTsRef.current = ts;
    const dt = ts - lastTsRef.current;
    lastTsRef.current = ts;

    let next = progressRef.current + (dt * speedRef.current) / durationMs;
    if (next >= 1) {
      next = 1;
      progressRef.current = 1;
      setProgress(1);
      setIsPlaying(false);
      stopRaf();
      if (!finishedRef.current) {
        finishedRef.current = true;
        onFinishRef.current?.();
      }
      return;
    }
    progressRef.current = next;
    setProgress(next);
    rafRef.current = requestAnimationFrame(tick);
  }, [durationMs]);

  const play = useCallback(() => {
    if (progressRef.current >= 1) return;
    finishedRef.current = false;
    setIsPlaying(true);
    stopRaf();
    lastTsRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    stopRaf();
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) pause(); else play();
  }, [isPlaying, play, pause]);

  const replay = useCallback(() => {
    stopRaf();
    finishedRef.current = false;
    progressRef.current = 0;
    setProgress(0);
    setIsPlaying(true);
    lastTsRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  // Move para um ponto específico (0..1), pausando a reprodução (scrub na timeline)
  const seek = useCallback((p: number) => {
    const clamped = Math.max(0, Math.min(1, p));
    stopRaf();
    setIsPlaying(false);
    finishedRef.current = clamped >= 1;
    progressRef.current = clamped;
    setProgress(clamped);
  }, []);

  // Limpa o RAF ao desmontar (sem vazamento de memória)
  useEffect(() => () => stopRaf(), []);

  return { progress, isPlaying, speed, setSpeed, play, pause, toggle, replay, seek };
}
