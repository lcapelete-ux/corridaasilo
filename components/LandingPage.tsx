import React, { useEffect, useState } from 'react';
import { Timer, MapPin, Trophy, ChevronRight, Star, LogIn, Upload, Utensils, Music, ExternalLink, Route } from 'lucide-react';
import { nightMusic } from '../services/nightMusic';
import sicrediLogo from '../assets/sicredi-logo.jpg';
import rondontexLogo from '../assets/rondontex-logo.png';
import { RaceIntro, shouldPlayRaceIntro } from './RaceIntro';
import { SoundToggle } from './SoundToggle';
import { RafflePromo } from './RafflePromo';
import { formatBrDate } from '../constants';
import { cloudinaryLogoUrl } from '../services/imageUtils';
import { SponsorLogo, RaffleSettings, TeamRankingEntry } from '../types';

interface LandingPageProps {
  onStartRegistration: () => void;
  onAdminLogin: () => void;
  onOpenProofUpload: () => void;
  onOpenCourse: () => void;
  raceGroupName?: string;
  promoDeadline?: string;
  sponsorLogos?: SponsorLogo[];
  raffleSettings?: RaffleSettings;
  teamRankingEnabled?: boolean;
  teamRanking?: TeamRankingEntry[];
  // A vinheta só começa quando o loader inicial libera (crossfade sem gap).
  // Default true para funcionar caso a landing seja usada fora do fluxo de boot.
  startIntro?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStartRegistration, onAdminLogin, onOpenProofUpload, onOpenCourse, raceGroupName = '2ª CORRIDA NOTURNA LSC', promoDeadline, sponsorLogos = [], raffleSettings, teamRankingEnabled, teamRanking = [], startIntro = true }) => {
  const [flashes, setFlashes] = useState<{id: number, top: number, left: number, delay: number}[]>([]);
  // Vinheta de largada: o conteúdo aparece durante o fade do overlay (crossfade)
  const [introDone, setIntroDone] = useState(() => !shouldPlayRaceIntro());
  const [contentVisible, setContentVisible] = useState(introDone);

  // --- Trilha sonora (synthwave noturno gerado no navegador) ---
  // Com a vinheta, quem dispara a música é o "LARGADA!". Sem vinheta
  // (revisita/reduced motion), toca direto — se o navegador bloquear,
  // o requestStart aguarda o primeiro toque e começa sozinho.
  useEffect(() => {
    if (introDone) nightMusic.requestStart();
    // Saiu da página inicial: para a música e cancela toque pendente
    return () => nightMusic.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      {/* Vinheta de Largada (Sicredi → RondonTex → Apresentam → Largada).
          Só monta quando o loader inicial libera (startIntro), para emendar
          com o fim do carregamento num crossfade — sem tela preta no meio. */}
      {!introDone && startIntro && (
        <RaceIntro
          onReveal={() => setContentVisible(true)}
          onFinish={() => {
            setIntroDone(true);
            nightMusic.requestStart();
          }}
        />
      )}

      {contentVisible && (<>

      {/* Botão de som (flutuante): garante ligar o áudio com um toque */}
      <SoundToggle />

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

        {/* Sponsor Header — patrocinadores master (Sicredi + RondonTex) em cards
            brancos: o logo do RondonTex tem letras escuras, então precisa de
            fundo claro para ficar legível no hero escuro. */}
        <div className="mb-6 animate-fade-in-up flex flex-col items-center gap-3">
           <p className="text-yellow-400/90 text-[10px] md:text-xs uppercase tracking-[0.3em] font-bold">Patrocínio Master</p>
           <div className="flex items-center justify-center gap-3 md:gap-4">
             <div className="bg-white rounded-xl h-16 md:h-20 px-5 md:px-6 flex items-center justify-center shadow-lg">
               <img src={sicrediLogo} alt="Sicredi" className="max-h-9 md:max-h-11 w-auto object-contain" />
             </div>
             <div className="bg-white rounded-xl h-16 md:h-20 px-5 md:px-6 flex items-center justify-center shadow-lg">
               <img src={rondontexLogo} alt="RondonTex" className="max-h-9 md:max-h-11 w-auto object-contain" />
             </div>
           </div>
           <span className="text-yellow-400 text-[10px] md:text-xs uppercase tracking-[0.25em] font-bold border border-yellow-400/60 px-3 py-1 rounded-full shadow-[0_0_10px_rgba(250,204,21,0.3)]">Apresentam</span>
        </div>

        {/* Big Typography Logo */}
        <h1 className="relative mb-8 transform -rotate-2 md:-rotate-3 animate-zoom-in">
          <span className="block text-[2.75rem] md:text-[5rem] leading-[0.9] font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-2xl">
            {raceGroupName}
          </span>
        </h1>

        {/* Date & Time Badge */}
        <div className="flex flex-col md:flex-row items-center gap-4 mb-8 animate-fade-in-up animation-delay-100">
           <div className="bg-yellow-400 text-slate-900 px-6 py-2 rounded-tl-2xl rounded-br-2xl font-black text-2xl md:text-3xl italic transform skew-x-[-10deg] shadow-[0_0_20px_rgba(250,204,21,0.4)] hover:shadow-[0_0_30px_rgba(250,204,21,0.6)] transition-shadow duration-500">
             19 / SET / 2026
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
               <span className="text-5xl font-black text-white group-hover:text-emerald-400 transition-colors">74,90</span>
             </div>
             <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded mt-2 uppercase font-bold tracking-wide border border-emerald-500/20">
               Lote Promocional
             </span>
             {promoDeadline && (
               <span className="text-[11px] text-slate-400 mt-1.5 font-medium">
                 Desconto até <span className="text-emerald-400 font-bold">{formatBrDate(promoDeadline)}</span>
               </span>
             )}
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

          {/* Ver o mapa 3D do percurso */}
          <button
            onClick={onOpenCourse}
            className="group inline-flex items-center gap-2.5 bg-slate-900/60 backdrop-blur-md border border-yellow-400/30 text-white px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider hover:border-yellow-400/70 hover:bg-slate-900/80 transition-all"
          >
            <Route size={18} className="text-yellow-400 group-hover:scale-110 transition-transform" aria-hidden="true" />
            Ver mapa do percurso
            <span className="text-[10px] text-slate-500 font-bold normal-case tracking-normal">5 km</span>
          </button>

          <button
            onClick={onOpenProofUpload}
            className="group flex items-center gap-2 text-slate-500 hover:text-white text-sm font-bold uppercase tracking-wider px-6 py-2 rounded-lg border border-transparent hover:border-slate-700 hover:bg-slate-900/50 transition-all"
          >
            <Upload size={16} className="text-yellow-500 group-hover:text-yellow-400 group-hover:animate-bounce" aria-hidden="true"/>
            Já me inscrevi, enviar comprovante
          </button>
        </div>

        {/* Atrações do evento */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3 animate-fade-in-up animation-delay-300">
          <div className="flex items-center gap-2 bg-slate-900/40 backdrop-blur-md border border-slate-800 px-4 py-2 rounded-full text-slate-300 text-sm font-bold">
            <Utensils size={16} className="text-yellow-400" aria-hidden="true" />
            Praça de Alimentação
          </div>
          <div className="flex items-center gap-2 bg-slate-900/40 backdrop-blur-md border border-slate-800 px-4 py-2 rounded-full text-slate-300 text-sm font-bold">
            <Music size={16} className="text-yellow-400" aria-hidden="true" />
            Shows ao Vivo
          </div>
        </div>

        {/* Local (clique abre o mapa) */}
        <a
          href="https://maps.app.goo.gl/6ewu6ySUqkhBb1J87"
          target="_blank"
          rel="noopener noreferrer"
          className="group mt-4 inline-flex items-center justify-center gap-2 text-slate-400 hover:text-yellow-400 text-sm font-medium animate-fade-in-up animation-delay-300 transition-colors text-center px-4"
          title="Abrir no Google Maps"
        >
          <MapPin size={16} className="text-yellow-400 shrink-0" aria-hidden="true" />
          <span className="group-hover:underline underline-offset-2">PRAÇA ARMANDO SALES DE OLIVEIRA - LARANJAL PAULISTA/SP</span>
          <ExternalLink size={13} className="shrink-0 opacity-60 group-hover:opacity-100" aria-hidden="true" />
        </a>
        <p className="mt-1 text-[11px] text-slate-600 uppercase tracking-widest font-bold animate-fade-in-up animation-delay-300">
          Toque para ver o local no mapa
        </p>

        {/* Ranking de Equipes: top 5 por número de inscritos */}
        {teamRankingEnabled && teamRanking.length > 0 && (
          <div className="mt-12 w-full max-w-2xl animate-fade-in-up animation-delay-300">
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 md:p-8 shadow-lg">
              <span className="inline-flex items-center gap-1.5 text-yellow-400 text-[10px] md:text-xs uppercase tracking-[0.25em] font-bold border border-yellow-400/60 px-3 py-1 rounded-full mb-5">
                <Trophy size={12} aria-hidden="true" /> Ranking de Equipes
              </span>
              <h3 className="text-xl font-black italic text-white mb-5">Quem mais inscreveu até agora</h3>

              <div className="space-y-3">
                {teamRanking.map((entry, i) => {
                  const maxCount = teamRanking[0]?.count || 1;
                  const pct = Math.max(8, Math.round((entry.count / maxCount) * 100));
                  const medalColor = i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-600';
                  const barColor = i === 0 ? 'bg-yellow-400' : 'bg-slate-600';
                  return (
                    <div key={entry.teamName} className="flex items-center gap-3">
                      <span className={`w-6 shrink-0 text-center font-black italic text-lg ${medalColor}`}>{i + 1}º</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <span className="text-white font-bold text-sm truncate">{entry.teamName}</span>
                          <span className="text-slate-400 text-xs font-bold shrink-0">{entry.count} {entry.count === 1 ? 'inscrito' : 'inscritos'}</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Rifa Solidária: prêmio sorteado à parte da inscrição, ajuda extra ao Lar São Cristóvão */}
        {raffleSettings?.enabled && raffleSettings.imageUrl && raffleSettings.link && (
          <div className="mt-12 w-full max-w-2xl animate-fade-in-up animation-delay-300">
            <RafflePromo settings={raffleSettings} variant="dark" />
          </div>
        )}

      </main>

      {/* Logos/Footer */}
      <footer className="relative z-10 py-6 border-t border-slate-900 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center px-6 gap-4">
           {/* Sicredi + logos dos patrocinadores (quebram em 2-3 linhas se houver muitos).
               Chips de altura fixa; os logos são aparados (e_trim no Cloudinary) e
               centralizados, para ficarem no mesmo tamanho visual, sem "moldura branca". */}
           <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <div className="bg-white rounded-lg h-12 md:h-14 px-4 flex items-center justify-center">
                <img src={sicrediLogo} alt="Sicredi" className="max-h-8 md:max-h-10 w-auto object-contain" />
              </div>
              {sponsorLogos.map(logo => (
                <div key={logo.id} className="bg-white rounded-lg h-12 md:h-14 px-4 flex items-center justify-center">
                  <img src={cloudinaryLogoUrl(logo.imageData)} alt={logo.name || 'Patrocinador'} className="max-h-8 md:max-h-10 w-auto object-contain" />
                </div>
              ))}
           </div>
           <div className="text-slate-600 text-xs font-bold uppercase tracking-widest shrink-0">
             Realização: Lar São Cristóvão
           </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 mt-4 pt-4 border-t border-slate-900 text-center">
          <p className="text-slate-600 text-[11px]">
            Desenvolvido por{' '}
            <a
              href="https://wa.me/5515991334809"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-yellow-400 font-bold transition-colors"
            >
              Marcelo Capelete
            </a>
          </p>
        </div>
      </footer>

      </>)}

    </div>
  );
};
