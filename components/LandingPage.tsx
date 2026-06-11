import React, { useEffect, useState } from 'react';
import { Timer, MapPin, Trophy, ChevronRight, Star, LogIn, Upload } from 'lucide-react';

interface LandingPageProps {
  onStartRegistration: () => void;
  onAdminLogin: () => void;
  onOpenProofUpload: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartRegistration, onAdminLogin, onOpenProofUpload }) => {
  const [flashes, setFlashes] = useState<{id: number, top: number, left: number, delay: number}[]>([]);

  useEffect(() => {
    // Gerar posições aleatórias para os "flashes" de câmera/luz
    const newFlashes = Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      delay: Math.random() * 5
    }));
    setFlashes(newFlashes);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col relative overflow-hidden font-sans">

      {/* --- Background Effects (Luzes e Holofotes) --- */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none" aria-hidden="true">

        {/* Glows Estáticos */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-yellow-500 rounded-full blur-[120px] opacity-20"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-900 rounded-full blur-[100px] opacity-30"></div>

        {/* Holofote 1 (Azul/Roxo) */}
        <div className="absolute top-[-50%] left-[20%] w-[200px] h-[150vh] bg-gradient-to-b from-indigo-500/0 via-indigo-500/10 to-transparent blur-xl origin-bottom transform rotate-45 animate-beam-slow"></div>

        {/* Holofote 2 (Amarelo) */}
        <div className="absolute top-[-50%] right-[20%] w-[200px] h-[150vh] bg-gradient-to-b from-yellow-500/0 via-yellow-500/10 to-transparent blur-xl origin-bottom transform -rotate-45 animate-beam-fast"></div>

        {/* Flashes de Câmera/Estrobo */}
        {flashes.map((flash) => (
          <div
            key={flash.id}
            className="absolute w-2 h-2 bg-white rounded-full animate-flash z-0"
            style={{
              top: `${flash.top}%`,
              left: `${flash.left}%`,
              animationDelay: `${flash.delay}s`
            }}
          />
        ))}
      </div>

      {/* Navbar Minimalista */}
      <nav className="relative z-20 flex justify-between items-center p-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2 text-yellow-400">
          <Star className="fill-yellow-400 animate-pulse" size={20} aria-hidden="true" />
          <span className="font-bold tracking-widest text-sm">LARANJAL PAULISTA</span>
        </div>
        <button
          onClick={onAdminLogin}
          className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 border border-slate-800 px-3 py-1.5 rounded-full hover:bg-slate-900 transition-all backdrop-blur-md"
        >
          <LogIn size={14} aria-hidden="true" /> Área Restrita
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center text-center p-4 relative z-10 w-full max-w-4xl mx-auto mt-4 md:mt-0">

        {/* Sponsor Header */}
        <div className="mb-6 animate-fade-in-up">
           <div className="flex items-center justify-center gap-2 text-white font-bold text-lg md:text-xl tracking-tighter">
             <span className="opacity-80">Sicredi</span>
             <span className="text-yellow-400 text-xs uppercase tracking-widest border border-yellow-400 px-1 rounded shadow-[0_0_10px_rgba(250,204,21,0.3)]">Apresenta</span>
           </div>
        </div>

        {/* Big Typography Logo */}
        <h1 className="relative mb-8 transform -rotate-2 md:-rotate-3 animate-zoom-in">
          <span className="block text-[2.75rem] md:text-[5rem] leading-[0.9] font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-2xl">
            2ª CORRIDA
          </span>
          <span className="block text-[3.5rem] md:text-[6.5rem] leading-[0.85] font-black italic tracking-tighter text-yellow-400 neon-text">
            NOTURNA
          </span>
          <span className="block text-[3.5rem] md:text-[6.5rem] leading-[0.85] font-black italic tracking-tighter text-white">
            LSC
          </span>
        </h1>

        {/* Date & Time Badge */}
        <div className="flex flex-col md:flex-row items-center gap-4 mb-8 animate-fade-in-up animation-delay-100">
           <div className="bg-yellow-400 text-slate-900 px-6 py-2 rounded-tl-2xl rounded-br-2xl font-black text-2xl md:text-3xl italic transform skew-x-[-10deg] shadow-[0_0_20px_rgba(250,204,21,0.4)] hover:shadow-[0_0_30px_rgba(250,204,21,0.6)] transition-shadow duration-500">
             26 / SET / 2026
           </div>
           <div className="flex items-center gap-2 text-xl font-bold italic drop-shadow-md">
             <Timer className="text-yellow-400" aria-hidden="true" /> 19H LARGADA
           </div>
        </div>

        {/* Distances & Price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl mb-10 animate-fade-in-up animation-delay-200">
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 p-6 rounded-2xl flex items-center justify-between group hover:border-yellow-400/50 hover:bg-slate-900/60 transition-all duration-300 shadow-lg">
             <div className="text-left">
               <span className="block text-slate-400 text-xs font-bold uppercase mb-1">Categorias</span>
               <div className="text-3xl font-black italic text-white group-hover:text-yellow-400 transition-colors">
                 3K <span className="text-lg text-slate-500 not-italic font-medium">CAMINHADA</span>
               </div>
               <div className="text-3xl font-black italic text-white group-hover:text-yellow-400 transition-colors">
                 5K <span className="text-lg text-slate-500 not-italic font-medium">CORRIDA</span>
               </div>
             </div>
             <Trophy size={40} className="text-slate-700 group-hover:text-yellow-400 transition-colors opacity-50 group-hover:opacity-100 group-hover:scale-110 duration-300" aria-hidden="true" />
          </div>

          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 p-6 rounded-2xl flex flex-col justify-center items-center group hover:border-yellow-400/50 hover:bg-slate-900/60 transition-all duration-300 shadow-lg">
             <span className="text-slate-400 text-xs font-bold uppercase mb-1">Inscrição Individual</span>
             <div className="flex items-start gap-1">
               <span className="text-sm font-bold mt-2">R$</span>
               <span className="text-5xl font-black text-white group-hover:text-emerald-400 transition-colors">69,90</span>
             </div>
             <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded mt-2 uppercase font-bold tracking-wide border border-emerald-500/20">
               Lote Promocional
             </span>
          </div>
        </div>

        {/* CTA Section */}
        <div className="flex flex-col items-center gap-6 animate-fade-in-up animation-delay-300 w-full">
          <button
            onClick={onStartRegistration}
            className="group relative inline-flex items-center justify-center gap-3 bg-yellow-400 text-slate-900 px-8 py-5 md:px-12 md:py-6 rounded-xl font-black italic text-xl md:text-2xl uppercase tracking-wider hover:bg-white hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(250,204,21,0.4)] hover:shadow-[0_0_60px_rgba(250,204,21,0.6)] w-full md:w-auto overflow-hidden"
          >
            {/* Efeito de brilho passando no botão */}
            <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-25deg] group-hover:animate-shimmer" aria-hidden="true"></div>

            <span className="relative z-10">Fazer Inscrição Agora</span>
            <ChevronRight className="group-hover:translate-x-1 transition-transform relative z-10" strokeWidth={3} aria-hidden="true" />
          </button>

          <button
            onClick={onOpenProofUpload}
            className="group flex items-center gap-2 text-slate-500 hover:text-white text-sm font-bold uppercase tracking-wider px-6 py-2 rounded-lg border border-transparent hover:border-slate-700 hover:bg-slate-900/50 transition-all"
          >
            <Upload size={16} className="text-yellow-500 group-hover:text-yellow-400 group-hover:animate-bounce" aria-hidden="true"/>
            Já me inscrevi, enviar comprovante
          </button>
        </div>

        {/* Location Footer */}
        <div className="mt-12 flex items-center justify-center gap-2 text-slate-400 text-sm font-medium animate-fade-in-up animation-delay-300">
          <MapPin size={16} className="text-yellow-400" aria-hidden="true" />
          <span>PRAÇA ARMANDO SALES DE OLIVEIRA - LARANJAL PAULISTA/SP</span>
        </div>

      </main>

      {/* Logos/Footer */}
      <footer className="relative z-10 py-6 border-t border-slate-900 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center px-6 gap-4">
           <div className="text-slate-600 text-xs font-bold uppercase tracking-widest">
             Realização: Equipe Luso
           </div>
           <div className="flex gap-6 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
              {/* Placeholders for Sponsor Logos */}
              <div className="h-8 w-24 bg-slate-800 rounded flex items-center justify-center text-[10px] font-bold text-slate-600 border border-slate-700">SICREDI</div>
              <div className="h-8 w-24 bg-slate-800 rounded flex items-center justify-center text-[10px] font-bold text-slate-600 border border-slate-700">RUNNER BRASIL</div>
           </div>
        </div>
      </footer>

    </div>
  );
};
