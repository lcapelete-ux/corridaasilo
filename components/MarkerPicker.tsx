import React, { useState } from 'react';
import { MARKERS, markerLabel } from '../constants';
import { Palette, X, Check, Pencil, Eraser, AlertCircle } from 'lucide-react';

interface MarkerPickerProps {
  quantos: number;                                   // quantos atletas selecionados
  labels: Record<string, string>;                    // nomes dados pelo organizador
  onClose: () => void;
  onApply: (marker: string | null) => Promise<void>; // null = tirar a marcação
  onRenameLabels?: (labels: Record<string, string>) => Promise<void>;
}

export const MarkerPicker: React.FC<MarkerPickerProps> = ({ quantos, labels, onClose, onApply, onRenameLabels }) => {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState<Record<string, string>>(
    Object.fromEntries(MARKERS.map(m => [m.key, markerLabel(m.key, labels)]))
  );

  const aplicar = async (marker: string | null) => {
    setSalvando(true);
    setErro('');
    try {
      await onApply(marker);
      onClose();
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível marcar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const salvarNomes = async () => {
    if (!onRenameLabels) return;
    setSalvando(true);
    setErro('');
    try {
      await onRenameLabels(rascunho);
      setEditando(false);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível salvar os nomes.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        <div className="bg-slate-800 p-6 flex justify-between items-center text-white">
          <div>
            <h3 className="font-bold text-xl flex items-center gap-2">
              <Palette size={20} /> Marcar com cor
            </h3>
            <p className="text-slate-300 text-sm mt-0.5">
              {quantos} {quantos === 1 ? 'atleta selecionado' : 'atletas selecionados'}
            </p>
          </div>
          <button onClick={onClose} className="hover:text-slate-300" disabled={salvando}>
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {!editando && (
            <p className="text-sm text-slate-600">
              Escolha uma cor para separar esse grupo na lista. Você decide o que cada cor significa —
              dá para renomear abaixo.
            </p>
          )}

          {MARKERS.map(m => (
            <div key={m.key} className="flex items-center gap-3">
              {editando ? (
                <>
                  <span className={`w-5 h-5 rounded-full shrink-0 ${m.dot}`} />
                  <input
                    value={rascunho[m.key] || ''}
                    onChange={e => setRascunho(p => ({ ...p, [m.key]: e.target.value }))}
                    placeholder={m.label}
                    className="flex-1 p-2 bg-white border border-slate-300 rounded text-slate-900 text-sm outline-none focus:border-slate-500 [color-scheme:light]"
                  />
                </>
              ) : (
                <button
                  onClick={() => aplicar(m.key)}
                  disabled={salvando}
                  className="flex-1 flex items-center gap-3 p-3 rounded-lg border-2 border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all text-left disabled:opacity-50"
                >
                  <span className={`w-5 h-5 rounded-full shrink-0 ${m.dot}`} />
                  <span className="text-sm font-bold text-slate-800">{markerLabel(m.key, labels)}</span>
                </button>
              )}
            </div>
          ))}

          {erro && (
            <p className="text-red-700 text-xs font-bold flex items-start gap-1.5 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle size={13} className="shrink-0 mt-0.5" /> {erro}
            </p>
          )}
        </div>

        <div className="p-6 pt-0 flex flex-wrap justify-between gap-3">
          {editando ? (
            <>
              <button
                onClick={() => { setEditando(false); setErro(''); }}
                disabled={salvando}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={salvarNomes}
                disabled={salvando}
                className="px-5 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 flex items-center gap-2 disabled:opacity-60"
              >
                <Check size={16} /> {salvando ? 'Salvando...' : 'Salvar nomes'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => aplicar(null)}
                disabled={salvando}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                title="Remover a marcação dos selecionados"
              >
                <Eraser size={15} /> Tirar marcação
              </button>
              {onRenameLabels && (
                <button
                  onClick={() => setEditando(true)}
                  disabled={salvando}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Pencil size={14} /> Renomear cores
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
