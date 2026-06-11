import React, { useEffect, useState } from 'react';
import {
  Timer, MapPin, Trophy, ChevronRight, ChevronDown, Star, LogIn, Upload,
  Shirt, Medal, Moon, UserPlus, QrCode, FileCheck, BadgePercent
} from 'lucide-react';

interface LandingPageProps {
  onStartRegistration: () => void;
  onAdminLogin: () => void;
  onOpenProofUpload: () => void;
}

// Largada: 26/09/2026 às 19h (horário de Brasília)
const RACE_DATE = new Date('2026-09-26T19:00:00-03:00');

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const getTimeLeft = (): TimeLeft | null => {
  const diff = RACE_DATE.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor(diff / 3_600_000) % 24,
    minutes: Math.floor(diff / 60_000) % 60,
    seconds: Math.floor(diff / 1_000) % 60,
  };
};

const Countdown: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(getTimeLeft);

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!timeLeft) {
    return (
      <div className="bg-yellow-400 text-slate-900 px-8 py-3 rounded-xl font-black italic text-2xl uppercase tracking-wider animate-pulse">
        É hoje! Boa prova! 🏁
      </div>
    );
  }

  const cells = [
    { value: timeLeft.days, label: 'Dias' },
    { value: timeLeft.hours, label: 'Horas' },
    { value: timeLeft.minutes, label: 'Min' },
    { value: timeLeft.seconds, label: 'Seg' },
  ];

  return (
    <div className="flex items-center gap-2 md:gap-3" role="timer" aria-label="Contagem regressiva para a largada">
      {cells.map((cell, i) => (
        <React.Fragment key={cell.label}>
          {i > 0 && <span className="text-yellow-400/60 font-black text-2xl md:text-3xl -mt-4" aria-hidden="true">:</span>}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 md:px-5 md:py-3 min-w-[64px] md:min-w-[84px] text-center shadow-lg">
            <div className="text-3xl md:text-4xl font-black text-white tabular-nums leading-none">
              {String(cell.value).padStart(2, '0')}
            </div>
            <div className="text-[10px] md:text-xs text-yellow-400 font-bold uppercase tracking-widest mt-1">
              {cell.label}
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};

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

  const scrollToDetails = () => {
    document.getElementById('detalhes')?.scrollIntoView({ behavior: 'smooth' });
  };

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

      {/* Hero */}
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
          <span className="block text-[4.5rem] md:text-[8rem] leading-[0.85] font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-2xl">
            LSC
          </span>
          <span className="block text-[4.5rem] md:text-[8rem] leading-[0.85] font-black italic tracking-tighter text-yellow-400 neon-text">
            NIGHT
          </span>
          <span className="block text-[4.5rem] md:text-[8rem] leading-[0.85] font-black italic tracking-tighter text-white">
            RUN
          </span>
        </h1>

        {/* Date & Time Badge */}
        <div className="flex flex-col md:flex-row items-center gap-4 mb-6 animate-fade-in-up animation-delay-100">
           <div className="bg-yellow-400 text-slate-900 px-6 py-2 rounded-tl-2xl rounded-br-2xl font-black text-2xl md:text-3xl italic transform skew-x-[-10deg] shadow-[0_0_20px_rgba(250,204,21,0.4)] hover:shadow-[0_0_30px_rgba(250,204,21,0.6)] transition-shadow duration-500">
             26 / SET / 2026
           </div>
           <div className="flex items-center gap-2 text-xl font-bold italic drop-shadow-md">
             <Timer className="text-yellow-400" aria-hidden="true" /> 19H LARGADA
           </div>
        </div>

        {/* Contagem Regressiva */}
        <div className="mb-10 animate-fade-in-up animation-delay-200">
          <Countdown />
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
             <span className="flex items-center gap-1 text-[11px] text-slate-400 mt-2 font-medium">
               <BadgePercent size={12} className="text-emerald-400" aria-hidden="true" />
               60+ paga R$ 35,00
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

        {/* Location */}
        <div className="mt-12 flex items-center justify-center gap-2 text-slate-400 text-sm font-medium animate-fade-in-up animation-delay-300">
          <MapPin size={16} className="text-yellow-400" aria-hidden="true" />
          <span>PRAÇA ARMANDO SALES DE OLIVEIRA - LARANJAL PAULISTA/SP</span>
        </div>

        {/* Indicador de scroll */}
        <button
          onClick={scrollToDetails}
          className="mt-10 mb-4 flex flex-col items-center gap-1 text-slate-500 hover:text-yellow-400 transition-colors animate-fade-in-up animation-delay-500"
          aria-label="Ver detalhes do evento"
        >
          <span className="text-[10px] font-bold uppercase tracking-widest">Detalhes do evento</span>
          <ChevronDown size={20} className="animate-bounce" aria-hidden="true" />
        </button>
      </main>

      {/* --- Seção: O Evento --- */}
      <section id="detalhes" className="relative z-10 py-20 px-4 border-t border-slate-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-yellow-400 text-xs font-bold uppercase tracking-[0.3em]">A Prova</span>
            <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter mt-2">
              CORRA A NOITE MAIS <span className="text-yellow-400">ILUMINADA</span> DO ANO
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-yellow-400/40 transition-all duration-300 group">
              <div className="bg-yellow-400/10 border border-yellow-400/20 w-14 h-14 rounded-xl flex items-center justify-center mb-5 group-hover:bg-yellow-400 group-hover:text-slate-900 text-yellow-400 transition-all">
                <Shirt size={28} aria-hidden="true" />
              </div>
              <h3 className="text-xl font-black italic uppercase mb-2">Kit do Atleta</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Camiseta oficial do evento e número de peito. Retire seu kit apresentando o comprovante de pagamento.
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-yellow-400/40 transition-all duration-300 group">
              <div className="bg-yellow-400/10 border border-yellow-400/20 w-14 h-14 rounded-xl flex items-center justify-center mb-5 group-hover:bg-yellow-400 group-hover:text-slate-900 text-yellow-400 transition-all">
                <Moon size={28} aria-hidden="true" />
              </div>
              <h3 className="text-xl font-black italic uppercase mb-2">Percurso Noturno</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                5K de corrida ou 3K de caminhada pelas ruas de Laranjal Paulista, com largada e chegada na Praça Armando Sales de Oliveira.
              </p>
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 hover:border-yellow-400/40 transition-all duration-300 group">
              <div className="bg-yellow-400/10 border border-yellow-400/20 w-14 h-14 rounded-xl flex items-center justify-center mb-5 group-hover:bg-yellow-400 group-hover:text-slate-900 text-yellow-400 transition-all">
                <Medal size={28} aria-hidden="true" />
              </div>
              <h3 className="text-xl font-black italic uppercase mb-2">Medalha Finisher</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Medalha exclusiva para quem cruzar a linha de chegada e premiação para os primeiros colocados.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- Seção: Como Participar --- */}
      <section className="relative z-10 py-20 px-4 border-t border-slate-900">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <span className="text-yellow-400 text-xs font-bold uppercase tracking-[0.3em]">Passo a Passo</span>
            <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter mt-2">
              COMO <span className="text-yellow-400">PARTICIPAR</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="relative bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-slate-900 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-lg shadow-yellow-400/30">1</div>
              <UserPlus size={32} className="mx-auto text-yellow-400 mb-4 mt-2" aria-hidden="true" />
              <h3 className="font-black italic uppercase mb-2">Inscreva-se</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Preencha o formulário com seus dados, escolha sua equipe e o tamanho da camiseta.
              </p>
            </div>

            <div className="relative bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-slate-900 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-lg shadow-yellow-400/30">2</div>
              <QrCode size={32} className="mx-auto text-yellow-400 mb-4 mt-2" aria-hidden="true" />
              <h3 className="font-black italic uppercase mb-2">Pague via PIX</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Ao finalizar a inscrição você recebe a chave PIX. R$ 69,90 (ou R$ 35,00 para 60+).
              </p>
            </div>

            <div className="relative bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-slate-900 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-lg shadow-yellow-400/30">3</div>
              <FileCheck size={32} className="mx-auto text-yellow-400 mb-4 mt-2" aria-hidden="true" />
              <h3 className="font-black italic uppercase mb-2">Envie o Comprovante</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Confirme seu pagamento enviando o comprovante pelo site usando seu CPF.
              </p>
            </div>
          </div>

          {/* CTA Final */}
          <div className="text-center flex flex-col items-center gap-4">
            <button
              onClick={onStartRegistration}
              className="inline-flex items-center justify-center gap-3 bg-yellow-400 text-slate-900 px-10 py-5 rounded-xl font-black italic text-xl uppercase tracking-wider hover:bg-white hover:scale-105 transition-all duration-300 shadow-[0_0_40px_rgba(250,204,21,0.3)]"
            >
              Garantir Minha Vaga
              <ChevronRight strokeWidth={3} aria-hidden="true" />
            </button>
            <button
              onClick={onOpenProofUpload}
              className="text-slate-500 hover:text-yellow-400 text-sm font-bold uppercase tracking-wider transition-colors"
            >
              Já me inscrevi, enviar comprovante
            </button>
          </div>
        </div>
      </section>

      {/* Logos/Footer */}
      <footer className="relative z-10 py-6 border-t border-slate-900 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center px-6 gap-4">
           <div className="text-slate-600 text-xs font-bold uppercase tracking-widest">
             Realização: Equipe Luso
           </div>
           <div className="text-slate-700 text-xs font-medium">
             &copy; 2026 LSC Night Run · Laranjal Paulista/SP
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
