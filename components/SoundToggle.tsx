import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { nightMusic } from '../services/nightMusic';

// Botão flutuante de som. Como o toque nele é um gesto do usuário, destrava e
// liga a trilha de forma garantida — é o caminho mais confiável quando o
// autoplay do navegador bloqueia o áudio na abertura.
export const SoundToggle: React.FC = () => {
  const [playing, setPlaying] = useState(() => nightMusic.isPlaying());

  useEffect(() => {
    // Mantém o botão em sincronia com o estado real da trilha
    const unsub = nightMusic.subscribe(() => setPlaying(nightMusic.isPlaying()));
    return unsub;
  }, []);

  const toggle = () => {
    if (nightMusic.isPlaying()) {
      nightMusic.stop();
    } else {
      nightMusic.enableSound();
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={playing ? 'Desligar som' : 'Ativar som'}
      title={playing ? 'Desligar som' : 'Ativar som'}
      className={`fixed bottom-5 right-5 z-40 flex items-center justify-center w-12 h-12 rounded-full border shadow-lg backdrop-blur-md transition-all ${
        playing
          ? 'bg-slate-900/70 border-slate-700 text-slate-300 hover:text-white'
          : 'bg-yellow-400 border-yellow-300 text-slate-900 hover:bg-yellow-300 animate-pulse shadow-yellow-400/40'
      }`}
    >
      {playing ? <Volume2 size={20} aria-hidden="true" /> : <VolumeX size={20} aria-hidden="true" />}
    </button>
  );
};
