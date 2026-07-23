
import React, { useState } from 'react';
import { Copy, Check, Timer, QrCode, Tag, AlertCircle } from 'lucide-react';
import { REGISTRATION_PRICE, REGISTRATION_PRICE_SENIOR } from '../constants';

interface RegistrationSuccessProps {
  onBack: () => void;
  isSenior: boolean;
  discount?: number; // Desconto do cupom da academia (R$) ou de apoiador (60+)
  seniorFullPrice?: boolean; // 60+ que optou por não usar a meia-inscrição (ajuda o Lar São Cristóvão)
  extraDonation?: number; // Contribuição extra opcional somada à inscrição
}

export const RegistrationSuccess: React.FC<RegistrationSuccessProps> = ({ onBack, isSenior, discount = 0, seniorFullPrice = false, extraDonation = 0 }) => {
  const [copied, setCopied] = useState(false);
  const pixKey = "corridaasilo@gmail.com";
  const basePrice = isSenior && !seniorFullPrice ? REGISTRATION_PRICE_SENIOR : REGISTRATION_PRICE;
  const finalPrice = Math.max(0, basePrice - discount) + extraDonation;
  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const price = fmt(finalPrice);

  const handleCopy = () => {
    navigator.clipboard.writeText(pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 relative">
        
        {/* Header Visual */}
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400"></div>
          <div className="bg-yellow-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-yellow-400/20 z-10 relative">
            <Check size={40} className="text-slate-900" strokeWidth={3} />
          </div>
          <h1 className="text-2xl font-black text-white uppercase italic tracking-wider relative z-10">Inscrição Confirmada!</h1>
          <p className="text-slate-400 text-sm mt-2 font-medium relative z-10">Garanta sua vaga finalizando o pagamento.</p>
          
          {/* Decorative Circle */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-slate-800 rounded-full opacity-50"></div>
          <div className="absolute top-10 -left-10 w-20 h-20 bg-slate-800 rounded-full opacity-50"></div>
        </div>

        {/* Payment Card Body */}
        <div className="p-8">
          <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-6 text-center mb-6 relative overflow-hidden">
            {isSenior && (
              <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg flex items-center gap-1">
                 <Tag size={10} /> 60+
              </div>
            )}
            
            <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mb-2">
              {seniorFullPrice ? "Inscrição de Apoiador (60+)" : isSenior ? "Valor com Desconto (60+)" : "Valor da Inscrição"}
            </p>
            <div className="flex items-center justify-center gap-1 text-slate-900">
              <span className="text-xl font-medium">R$</span>
              <span className="text-5xl font-black tracking-tighter">{price}</span>
            </div>
            {discount > 0 && (
              <p className="mt-2 text-xs font-bold text-emerald-600 flex items-center justify-center gap-1">
                <Tag size={11} /> {seniorFullPrice ? 'Desconto de apoiador' : 'Cupom aplicado'}: R$ {fmt(basePrice)} − R$ {fmt(discount)} de desconto
              </p>
            )}
            {extraDonation > 0 && (
              <p className="mt-2 text-xs font-bold text-indigo-600 flex items-center justify-center gap-1">
                <Tag size={11} /> Contribuição extra: + R$ {fmt(extraDonation)}
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <QrCode className="text-yellow-500" />
              <span className="font-bold text-slate-700">Pagamento via PIX</span>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex flex-col gap-2 relative">
              <span className="text-xs text-yellow-700 font-bold uppercase">Chave PIX (E-mail)</span>
              <p className="font-mono text-slate-900 font-bold text-lg break-all">{pixKey}</p>
              
              <button 
                onClick={handleCopy}
                className={`absolute right-3 top-3 p-2 rounded-lg transition-all ${copied ? 'bg-green-500 text-white' : 'bg-white text-slate-500 hover:text-slate-900 shadow-sm'}`}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>

            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-start gap-3">
               <AlertCircle className="text-indigo-600 shrink-0 mt-0.5" size={20} />
               <div className="text-sm">
                 <p className="font-bold text-indigo-900 leading-tight mb-1">
                   Envie o comprovante para o organizador responsável da sua equipe.
                 </p>
                 <p className="text-xs text-indigo-600/80 leading-relaxed">
                   Se sua inscrição for avulsa, guarde o comprovante para apresentar na retirada do kit.
                 </p>
               </div>
            </div>
          </div>
        </div>

        {/* Footer Action */}
        <div className="bg-slate-50 p-6 border-t border-slate-100">
          <button 
            onClick={onBack}
            className="w-full bg-slate-900 text-yellow-400 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"
          >
            <Timer size={20} /> Voltar ao Início
          </button>
        </div>
      </div>
    </div>
  );
};
