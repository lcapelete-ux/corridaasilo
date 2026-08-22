import React, { useState } from 'react';
import { Sponsor, SponsorPayment } from '../types';
import { getSponsorPaidAmount, getSponsorBalance, isSponsorSettled, formatBrDate } from '../constants';
import { X, Plus, Trash2, Wallet, CheckCircle, AlertCircle } from 'lucide-react';

// Modal de fundo branco: cores explícitas + color-scheme light para o texto não
// sumir quando o celular está em modo escuro (mesmo padrão dos outros modais)
const inputCls = "w-full p-2 bg-white border border-slate-300 rounded text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 outline-none [color-scheme:light]";

interface SponsorPaymentsModalProps {
  sponsor: Sponsor;
  onClose: () => void;
  onSave: (sponsor: Sponsor) => Promise<void> | void;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
const hoje = () => new Date().toISOString().split('T')[0];

export const SponsorPaymentsModal: React.FC<SponsorPaymentsModalProps> = ({ sponsor, onClose, onSave }) => {
  const [installments, setInstallments] = useState<SponsorPayment[]>(sponsor.installments || []);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(hoje());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Prévia com o que está na tela (ainda não gravado)
  const preview: Sponsor = { ...sponsor, installments };
  const pago = getSponsorPaidAmount(preview);
  const falta = getSponsorBalance(preview);
  const quitado = isSponsorSettled(preview);
  const pct = sponsor.amount > 0 ? Math.min(100, Math.round((pago / sponsor.amount) * 100)) : 0;

  // Grava a lista inteira de uma vez: isPaid passa a ser derivado das parcelas,
  // senão o total de receita do painel discordaria do que foi lançado aqui.
  const persist = async (lista: SponsorPayment[]) => {
    setSaving(true);
    setError('');
    try {
      const atualizado: Sponsor = { ...sponsor, installments: lista };
      await onSave({ ...atualizado, isPaid: isSponsorSettled(atualizado) });
      setInstallments(lista);
      return true;
    } catch (e: any) {
      setError(e?.message || 'Não foi possível salvar. Tente novamente.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async (valor: number, obs: string) => {
    if (!(valor > 0)) {
      setError('Informe um valor maior que zero.');
      return;
    }
    if (!date) {
      setError('Informe a data do pagamento.');
      return;
    }
    const nova: SponsorPayment = {
      id: crypto.randomUUID(),
      amount: Math.round(valor * 100) / 100,
      date,
      note: obs.trim() || undefined,
    };
    const ok = await persist([...installments, nova]);
    if (ok) {
      setAmount('');
      setNote('');
      setDate(hoje());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAdd(parseFloat(amount.replace(',', '.')) || 0, note);
  };

  const handleRemove = async (id: string) => {
    const alvo = installments.find(p => p.id === id);
    if (!alvo) return;
    if (!confirm(`Excluir o pagamento de R$ ${fmt(alvo.amount)} de ${formatBrDate(alvo.date, true)}?`)) return;
    await persist(installments.filter(p => p.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
        <div className="bg-emerald-600 p-6 flex justify-between items-center text-white shrink-0">
          <div className="min-w-0">
            <h3 className="font-bold text-xl flex items-center gap-2">
              <Wallet size={20} /> Pagamentos
            </h3>
            <p className="text-emerald-100 text-sm truncate mt-0.5">{sponsor.name}</p>
          </div>
          <button onClick={onClose} className="hover:text-emerald-200 shrink-0" disabled={saving}>
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Resumo do combinado x recebido */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600">Patrocínio combinado</span>
              <span className="font-mono font-bold text-slate-800">R$ {fmt(sponsor.amount)}</span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600">Já recebido</span>
              <span className="font-mono font-bold text-emerald-600">R$ {fmt(pago)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Falta receber</span>
              <span className={`font-mono font-bold ${falta > 0 ? 'text-amber-600' : 'text-slate-400'}`}>R$ {fmt(falta)}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden mt-3">
              <div className={`h-full rounded-full transition-all ${quitado ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
            </div>
            {quitado && (
              <p className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs mt-2">
                <CheckCircle size={13} /> Patrocínio quitado
              </p>
            )}
          </div>

          {/* Parcelas já lançadas */}
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              Parcelas lançadas ({installments.length})
            </p>
            {installments.length === 0 ? (
              <p className="text-sm text-slate-400 italic bg-slate-50 border border-dashed border-slate-200 rounded-lg p-3 text-center">
                {sponsor.isPaid
                  ? 'Este patrocínio está marcado como pago à vista. Lance uma parcela abaixo para passar a controlar o recebimento em partes.'
                  : 'Nenhum pagamento lançado ainda.'}
              </p>
            ) : (
              <ul className="space-y-2">
                {installments.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg p-3">
                    <span className="w-7 h-7 shrink-0 rounded-full bg-emerald-50 text-emerald-600 text-xs font-black flex items-center justify-center">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-mono font-bold text-slate-800">R$ {fmt(p.amount)}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {formatBrDate(p.date, true)}{p.note ? ` · ${p.note}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemove(p.id)}
                      disabled={saving}
                      className="text-slate-400 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition-all disabled:opacity-50 shrink-0"
                      title="Excluir este pagamento"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Lançar novo pagamento */}
          <form onSubmit={handleSubmit} className="pt-4 border-t border-slate-100 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Lançar pagamento</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Valor (R$)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={e => { setAmount(e.target.value); setError(''); }}
                  placeholder={falta > 0 ? fmt(falta) : '0,00'}
                  disabled={saving}
                  className={`${inputCls} font-mono`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Data</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => { setDate(e.target.value); setError(''); }}
                  disabled={saving}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Observação (opcional)</label>
              <input
                type="text"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Ex: 1ª parcela, PIX, cheque"
                disabled={saving}
                className={inputCls}
              />
            </div>

            {error && (
              <p className="text-red-600 text-xs font-bold flex items-start gap-1.5">
                <AlertCircle size={13} className="shrink-0 mt-0.5" /> {error}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving || !amount.trim()}
                className="flex-1 px-4 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Plus size={17} /> {saving ? 'Salvando...' : 'Lançar'}
              </button>
              {falta > 0 && (
                <button
                  type="button"
                  onClick={() => handleAdd(falta, note)}
                  disabled={saving}
                  className="px-4 py-2.5 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 text-sm disabled:opacity-60"
                  title={`Lançar o restante (R$ ${fmt(falta)}) de uma vez`}
                >
                  Quitar R$ {fmt(falta)}
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="p-6 pt-4 border-t border-slate-100 flex justify-end shrink-0">
          <button onClick={onClose} disabled={saving} className="px-5 py-2 bg-slate-800 text-white font-bold rounded-lg hover:bg-slate-700 disabled:opacity-60">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
