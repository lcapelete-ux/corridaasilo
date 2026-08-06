import React from 'react';
import { User, Users } from 'lucide-react';

interface PayerSelectorProps {
  // '' = pagou da própria conta; qualquer texto = nome de quem pagou
  payerName: string;
  onChange: (payerName: string) => void;
  // Controla o modo escolhido separadamente do nome, para o campo poder ficar
  // vazio enquanto a pessoa digita sem voltar sozinho para "própria conta"
  isThirdParty: boolean;
  onChangeIsThirdParty: (isThirdParty: boolean) => void;
  variant?: 'dark' | 'light';
}

export const PayerSelector: React.FC<PayerSelectorProps> = ({
  payerName, onChange, isThirdParty, onChangeIsThirdParty, variant = 'dark',
}) => {
  const isDark = variant === 'dark';

  const optionCls = (selected: boolean) => {
    if (isDark) {
      return selected
        ? 'border-yellow-400 bg-yellow-400/10 text-white'
        : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-slate-300';
    }
    return selected
      ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
      : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700';
  };

  return (
    <div className={isDark ? 'mb-4' : 'mt-3'}>
      <p className={`text-xs font-bold uppercase mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
        Quem fez o pagamento?
      </p>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => { onChangeIsThirdParty(false); onChange(''); }}
          className={`flex items-center justify-center gap-2 border-2 rounded-lg px-3 py-2.5 text-xs font-bold transition-all ${optionCls(!isThirdParty)}`}
        >
          <User size={14} className="shrink-0" aria-hidden="true" />
          Minha própria conta
        </button>
        <button
          type="button"
          onClick={() => onChangeIsThirdParty(true)}
          className={`flex items-center justify-center gap-2 border-2 rounded-lg px-3 py-2.5 text-xs font-bold transition-all ${optionCls(isThirdParty)}`}
        >
          <Users size={14} className="shrink-0" aria-hidden="true" />
          Conta de outra pessoa
        </button>
      </div>

      {isThirdParty && (
        <div className="mt-2.5">
          <input
            type="text"
            value={payerName}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Nome de quem fez o pagamento"
            className={
              isDark
                ? 'w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 outline-none transition-all'
                : 'w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 outline-none transition-all [color-scheme:light]'
            }
          />
          <p className={`text-[11px] mt-1.5 ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
            Assim a organização consegue localizar o pagamento, já que o PIX chega em outro nome.
          </p>
        </div>
      )}
    </div>
  );
};
