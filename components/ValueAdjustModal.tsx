import React, { useState } from 'react';
import { Runner, Sponsor } from '../types';
import { getRegistrationFee, FREE_REASONS } from '../constants';
import { Pencil, X, Save, Gift, Briefcase } from 'lucide-react';

// Modal tem fundo branco: cores explícitas + color-scheme light para o texto
// não sumir quando o celular está em modo escuro (mesmo padrão do modal de transferência)
const inputCls = "w-full p-2 bg-white border border-slate-300 rounded text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400 outline-none [color-scheme:light]";

interface ValueAdjustModalProps {
  runner: Runner;
  onClose: () => void;
  onSave: (updated: Runner) => Promise<void> | void;
  sponsors?: Sponsor[];   // para vincular a vaga a um patrocinador
}

export const ValueAdjustModal: React.FC<ValueAdjustModalProps> = ({ runner, onClose, onSave, sponsors = [] }) => {
  const [discount, setDiscount] = useState(String(runner.couponDiscount || 0));
  const [extra, setExtra] = useState(String(runner.extraDonation || 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Isenção: por que a inscrição ficou zerada
  const [freeReason, setFreeReason] = useState<'' | 'patrocinio' | 'cortesia'>(runner.freeReason || '');
  const [sponsorId, setSponsorId] = useState(runner.sponsorId || '');

  const fee = getRegistrationFee(runner.age, runner.seniorFullPrice);
  const discountNum = Math.max(0, parseFloat(discount.replace(',', '.')) || 0);
  const extraNum = Math.max(0, parseFloat(extra.replace(',', '.')) || 0);
  const finalValue = Math.max(0, fee - discountNum) + extraNum;
  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const isFree = finalValue <= 0;

  const handleSave = async () => {
    // Inscrição zerada precisa de motivo: senão vira um buraco sem explicação
    // na contabilidade, que é justamente o que se quer evitar.
    if (isFree && !freeReason) {
      setError('Inscrição zerada: escolha se é patrocínio ou cortesia.');
      return;
    }
    if (isFree && freeReason === 'patrocinio' && !sponsorId) {
      setError('Escolha qual patrocinador cobre esta vaga.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      // valueAdjusted: o valor passa a ser o que o organizador definiu — não é
      // mais desconto de cupom, então não vence junto com o lote promocional.
      await onSave({
        ...runner,
        couponDiscount: discountNum,
        extraDonation: extraNum,
        valueAdjusted: true,
        // Deixou de ser zerada: limpa o motivo, para não sobrar rastro errado
        freeReason: isFree ? (freeReason as 'patrocinio' | 'cortesia') : undefined,
        sponsorId: isFree && freeReason === 'patrocinio' ? sponsorId : undefined,
      });
      onClose();
    } catch (e: any) {
      // Sem isto o modal ficava aberto e mudo quando a gravação falhava
      setError(e?.message || 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        <div className="bg-indigo-600 p-6 flex justify-between items-center text-white">
          <h3 className="font-bold text-xl flex items-center gap-2">
            <Pencil size={20} /> Ajustar Valor
          </h3>
          <button onClick={onClose} className="hover:text-indigo-200">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-indigo-50 p-3 rounded-lg text-sm text-indigo-900">
            <strong>{runner.fullName}</strong>
            <div className="text-indigo-700/80 text-xs mt-0.5">
              Use quando o atleta pagou com desconto (ou algo a mais) sem ter aplicado um cupom na inscrição.
            </div>
          </div>

          <div className="text-sm text-slate-600 flex justify-between">
            <span>Valor da inscrição</span>
            <span className="font-mono font-bold text-slate-800">R$ {fmt(fee)}</span>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Desconto (R$)</label>
            <input type="text" inputMode="decimal" value={discount} onChange={(e) => setDiscount(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Contribuição extra (R$)</label>
            <input type="text" inputMode="decimal" value={extra} onChange={(e) => setExtra(e.target.value)} className={inputCls} />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
            <span className="font-bold text-slate-700">Valor Final</span>
            <span className="font-mono font-black text-lg text-indigo-600">R$ {fmt(finalValue)}</span>
          </div>
          {/* Zerou: precisa dizer por quê */}
          {isFree && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <p className="text-sm font-bold text-slate-700">Por que a inscrição está zerada?</p>
              <div className="grid grid-cols-2 gap-2">
                {FREE_REASONS.map(r => {
                  const on = freeReason === r.key;
                  const Icone = r.key === 'patrocinio' ? Briefcase : Gift;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => { setFreeReason(r.key); setError(''); }}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        on ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Icone size={16} className={on ? 'text-indigo-600' : 'text-slate-400'} />
                      <span className={`block text-sm font-bold mt-1 ${on ? 'text-slate-900' : 'text-slate-600'}`}>
                        {r.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {freeReason === 'patrocinio' && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 mt-2">Qual patrocinador</label>
                  <select
                    value={sponsorId}
                    onChange={e => { setSponsorId(e.target.value); setError(''); }}
                    className={`${inputCls} [color-scheme:light]`}
                  >
                    <option value="">Selecione...</option>
                    {sponsors.map(sp => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                  </select>
                  {sponsors.length === 0 && (
                    <p className="text-xs text-amber-700 mt-1">
                      Nenhum patrocinador cadastrado ainda. Cadastre em Patrocinadores para poder vincular.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-red-600 text-xs font-bold pt-1">{error}</p>
          )}
        </div>

        <div className="p-6 pt-0 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-60"
          >
            <Save size={18} /> {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};
