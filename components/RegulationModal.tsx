import React from 'react';
import { X, FileText, CheckCircle } from 'lucide-react';

// ============================================================================
// REGULAMENTO OFICIAL — 2ª CORRIDA NOTURNA LSC
// Cole o texto oficial abaixo quando ele for enviado, substituindo os itens
// do array. Cada item vira um parágrafo; comece com "##" para virar um
// título de seção (ex: "## 1. Da Prova").
// ============================================================================
const REGULATION_TEXT: string[] = [
  '## Regulamento em elaboração',
  'O regulamento oficial da 2ª Corrida Noturna LSC será publicado aqui em breve.',
  'Ao marcar a caixa "Estou de acordo com o regulamento", o atleta declara estar ciente das regras da prova, das condições de participação e do uso de imagem, conforme o regulamento oficial divulgado pela organização.',
  'Em caso de dúvidas, procure a organização do evento (Lar São Cristóvão).',
];

interface RegulationModalProps {
  onClose: () => void;
  onAgree?: () => void; // marca a caixinha e fecha
}

export const RegulationModal: React.FC<RegulationModalProps> = ({ onClose, onAgree }) => {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="bg-slate-950 p-5 flex justify-between items-center border-b border-slate-800 shrink-0">
          <h3 className="text-yellow-400 font-black italic text-lg uppercase tracking-wider flex items-center gap-2">
            <FileText size={20} /> Regulamento da Prova
          </h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors p-1"
            aria-label="Fechar regulamento"
          >
            <X size={22} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 overflow-y-auto text-slate-300 space-y-3 text-sm leading-relaxed">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
            2ª Corrida Noturna LSC · Laranjal Paulista/SP
          </p>
          {REGULATION_TEXT.map((block, i) =>
            block.startsWith('## ') ? (
              <h4 key={i} className="text-white font-bold text-base pt-2">{block.slice(3)}</h4>
            ) : (
              <p key={i}>{block}</p>
            )
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-sm font-medium transition-all"
          >
            Fechar
          </button>
          {onAgree && (
            <button
              onClick={onAgree}
              className="px-6 py-2.5 bg-yellow-400 text-slate-900 rounded-lg font-bold text-sm hover:bg-yellow-300 transition-all flex items-center justify-center gap-2 shadow-lg shadow-yellow-400/10"
            >
              <CheckCircle size={16} /> Li e estou de acordo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
