import React, { useEffect } from 'react';
import { X } from 'lucide-react';

// A vinheta de largada (RaceIntro) só toca uma vez por carregamento da
// página — este flyer segue a mesma regra, e precisa vir ANTES dela: se o
// visitante já viu o flyer nesta carga, não mostra de novo (nem ao navegar
// de volta para a landing a partir de outra tela).
let alreadyShown = false;

export const shouldShowKitFlyer = (): boolean => !alreadyShown;
export const markKitFlyerShown = (): void => { alreadyShown = true; };

interface KitFlyerOverlayProps {
  imageUrl: string;
  onDismiss: () => void;
}

export const KitFlyerOverlay: React.FC<KitFlyerOverlayProps> = ({ imageUrl, onDismiss }) => {
  useEffect(() => {
    markKitFlyerShown();
  }, []);

  return (
    <div
      className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-sm cursor-pointer select-none p-4 md:p-8 animate-fade-in"
      onClick={onDismiss}
      role="button"
      aria-label="Fechar aviso e continuar para o site"
    >
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(); }}
        className="absolute top-5 right-5 md:top-8 md:right-8 bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 w-10 h-10 rounded-full flex items-center justify-center transition-all"
        aria-label="Fechar aviso"
      >
        <X size={20} aria-hidden="true" />
      </button>

      <img
        src={imageUrl}
        alt="Aviso importante"
        className="max-w-full max-h-[78vh] w-auto object-contain rounded-2xl shadow-2xl"
      />

      <span className="mt-6 text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">
        Toque para continuar
      </span>
    </div>
  );
};
