import React from 'react';
import { Gift, ChevronRight, MessageCircle } from 'lucide-react';
import { RaffleSettings } from '../types';

interface RafflePromoProps {
  settings?: RaffleSettings;
  // 'dark' combina com a página inicial; 'light' combina com telas de cartão branco (ex: confirmação de inscrição)
  variant?: 'dark' | 'light';
}

export const RafflePromo: React.FC<RafflePromoProps> = ({ settings, variant = 'dark' }) => {
  if (!settings?.enabled || !settings.imageUrl || !settings.link) return null;
  const isDark = variant === 'dark';

  return (
    <div
      className={
        isDark
          ? 'bg-gradient-to-br from-amber-500/10 via-slate-900/60 to-slate-900/60 backdrop-blur-md border border-yellow-400/30 rounded-2xl p-6 md:p-8 shadow-lg'
          : 'bg-amber-50 border border-amber-200 rounded-2xl p-6 md:p-8 shadow-sm'
      }
    >
      <span
        className={
          isDark
            ? 'inline-flex items-center gap-1.5 text-yellow-400 text-[10px] md:text-xs uppercase tracking-[0.25em] font-bold border border-yellow-400/60 px-3 py-1 rounded-full mb-5'
            : 'inline-flex items-center gap-1.5 text-amber-700 text-[10px] md:text-xs uppercase tracking-[0.25em] font-bold border border-amber-400 bg-white px-3 py-1 rounded-full mb-5'
        }
      >
        <Gift size={12} aria-hidden="true" /> Rifa Solidária
      </span>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className={isDark ? 'bg-white rounded-xl p-3 shrink-0' : 'bg-white rounded-xl p-3 shrink-0 border border-amber-100'}>
          <img
            src={settings.imageUrl}
            alt={settings.prizeName || 'Prêmio da rifa'}
            style={{ height: settings.imageHeight || 160 }}
            className="w-auto max-w-full object-contain rounded-lg"
          />
        </div>
        <div className="text-center sm:text-left">
          <p className={isDark ? 'text-slate-400 text-xs font-bold uppercase mb-1' : 'text-amber-700/70 text-xs font-bold uppercase mb-1'}>
            Concorra a
          </p>
          <h3 className={isDark ? 'text-2xl font-black italic text-white mb-2' : 'text-2xl font-black italic text-slate-900 mb-2'}>
            {settings.prizeName}
          </h3>
          <p className={isDark ? 'text-slate-400 text-sm mb-4' : 'text-slate-600 text-sm mb-4'}>
            A renda ajuda o Lar São Cristóvão. Participe pela plataforma oficial da rifa.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <a
              href={settings.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 bg-yellow-400 text-slate-900 px-6 py-3 rounded-xl font-black italic uppercase tracking-wider hover:bg-white hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(250,204,21,0.3)]"
            >
              Participar da Rifa
              <ChevronRight className="group-hover:translate-x-1 transition-transform" strokeWidth={3} size={18} aria-hidden="true" />
            </a>
            {settings.whatsappLink && (
              <a
                href={settings.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  isDark
                    ? 'group inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-sm hover:bg-emerald-500/20 hover:border-emerald-400 transition-all duration-300'
                    : 'group inline-flex items-center gap-2 bg-emerald-50 border border-emerald-300 text-emerald-700 px-6 py-3 rounded-xl font-bold uppercase tracking-wider text-sm hover:bg-emerald-100 hover:border-emerald-400 transition-all duration-300'
                }
              >
                <MessageCircle size={16} aria-hidden="true" />
                Grupo do WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
