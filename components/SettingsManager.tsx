import React, { useState } from 'react';
import { Settings, Save, AlertCircle, Clock, Ban, Tag } from 'lucide-react';
import { TransferSettings } from '../types';
import { formatBrDate } from '../constants';

interface SettingsManagerProps {
  raceGroupName: string;
  onUpdateRaceGroupName: (name: string) => Promise<void>;
  transferSettings?: TransferSettings | null;
  onUpdateTransferSettings?: (settings: TransferSettings) => Promise<void>;
  promoDeadline?: string;
  onUpdatePromoDeadline?: (date: string) => Promise<void>;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({ raceGroupName, onUpdateRaceGroupName, transferSettings, onUpdateTransferSettings, promoDeadline, onUpdatePromoDeadline }) => {
  const [name, setName] = useState(raceGroupName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [promoDraft, setPromoDraft] = useState(promoDeadline || '');
  const [savingPromo, setSavingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState(false);

  const [transferDraft, setTransferDraft] = useState<TransferSettings>({
    transferDeadline: transferSettings?.transferDeadline,
    transfersBlocked: transferSettings?.transfersBlocked || false,
  });
  const [savingTransfer, setSavingTransfer] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('O nome do grupo não pode ser vazio.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      await onUpdateRaceGroupName(trimmedName);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar o nome do grupo.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTransferSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateTransferSettings) return;

    setSavingTransfer(true);
    setTransferError('');
    setTransferSuccess(false);

    try {
      await onUpdateTransferSettings(transferDraft);
      setTransferSuccess(true);
      setTimeout(() => setTransferSuccess(false), 3000);
    } catch (err: any) {
      setTransferError(err?.message || 'Erro ao salvar configurações de transferência.');
    } finally {
      setSavingTransfer(false);
    }
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdatePromoDeadline) return;

    setSavingPromo(true);
    setPromoError('');
    setPromoSuccess(false);

    try {
      await onUpdatePromoDeadline(promoDraft);
      setPromoSuccess(true);
      setTimeout(() => setPromoSuccess(false), 3000);
    } catch (err: any) {
      setPromoError(err?.message || 'Erro ao salvar a data do lote promocional.');
    } finally {
      setSavingPromo(false);
    }
  };

  const canTransferNow = () => {
    if (transferSettings?.transfersBlocked) return false;
    if (!transferSettings?.transferDeadline) return true;
    return new Date().toISOString().split('T')[0] <= transferSettings.transferDeadline;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-indigo-100 p-3 rounded-lg">
            <Settings size={24} className="text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Configurações da Corrida</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Nome do Grupo / Evento
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
                setSuccess(false);
              }}
              placeholder="Ex: 2ª CORRIDA NOTURNA LSC"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg font-semibold [color-scheme:light]"
            />
            <p className="text-xs text-slate-500 mt-2">
              Este nome será exibido em vários locais da página e no painel administrativo.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700 font-medium text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-emerald-700 font-medium text-sm">✓ Nome salvo com sucesso!</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || name.trim() === raceGroupName}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </form>
      </div>

      {/* Lote Promocional */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-emerald-100 p-3 rounded-lg">
            <Tag size={24} className="text-emerald-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-800">Lote Promocional</h2>
            <p className="text-sm text-slate-600 mt-1">
              {promoDraft
                ? <>Desconto válido até <span className="font-bold text-emerald-600">{formatBrDate(promoDraft, true)}</span></>
                : <span className="text-slate-500">Sem data definida</span>}
            </p>
          </div>
        </div>

        <p className="text-slate-600 text-sm mb-6">
          Defina até quando o valor promocional com desconto fica disponível. Esta data aparece na página inicial para os inscritos.
        </p>

        <form onSubmit={handleSavePromo} className="space-y-6">
          <div className="max-w-xs">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              <Tag size={16} className="inline mr-2" />
              Data final do lote promocional
            </label>
            <input
              type="date"
              value={promoDraft}
              onChange={(e) => {
                setPromoDraft(e.target.value);
                setPromoError('');
                setPromoSuccess(false);
              }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all [color-scheme:light]"
            />
            <p className="text-xs text-slate-500 mt-2">
              Deixe vazio para não exibir data de validade do lote.
            </p>
          </div>

          {promoError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700 font-medium text-sm">{promoError}</p>
            </div>
          )}

          {promoSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-emerald-700 font-medium text-sm">✓ Data salva com sucesso! Já aparece na página inicial.</p>
            </div>
          )}

          <button
            type="submit"
            disabled={savingPromo || !onUpdatePromoDeadline || promoDraft === (promoDeadline || '')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            <Save size={18} /> {savingPromo ? 'Salvando...' : 'Salvar Data'}
          </button>
        </form>
      </div>

      {/* Painel de Transferências */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-3 rounded-lg ${canTransferNow() ? 'bg-emerald-100' : 'bg-red-100'}`}>
            <Clock size={24} className={canTransferNow() ? 'text-emerald-600' : 'text-red-600'} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-800">Controle de Transferências</h2>
            <p className="text-sm text-slate-600 mt-1">
              Status: <span className={`font-bold ${canTransferNow() ? 'text-emerald-600' : 'text-red-600'}`}>
                {canTransferNow() ? '✓ Liberado para líderes' : '✗ Bloqueado para líderes'}
              </span>
            </p>
          </div>
        </div>

        <p className="text-slate-600 text-sm mb-6">
          Controle quando os líderes de equipe podem transferir inscrições de seus membros. Admin nunca é afetado por essas regras.
        </p>

        <form onSubmit={handleSaveTransferSettings} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                <Clock size={16} className="inline mr-2" />
                Prazo Final (Opcional)
              </label>
              <input
                type="date"
                value={transferDraft.transferDeadline || ''}
                onChange={(e) => {
                  setTransferDraft(prev => ({ ...prev, transferDeadline: e.target.value || undefined }));
                  setTransferError('');
                  setTransferSuccess(false);
                }}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all [color-scheme:light]"
              />
              <p className="text-xs text-slate-500 mt-2">
                Deixe vazio para permitir transferências indefinidamente
              </p>
            </div>

            <div className="flex flex-col justify-between">
              <label className="flex items-center gap-3 cursor-pointer p-4 rounded-lg border-2 border-slate-200 hover:border-red-300 hover:bg-red-50 transition-all"
                style={transferDraft.transfersBlocked ? { borderColor: '#fee2e2', backgroundColor: '#fef2f2' } : {}}>
                <input
                  type="checkbox"
                  checked={transferDraft.transfersBlocked}
                  onChange={(e) => {
                    setTransferDraft(prev => ({ ...prev, transfersBlocked: e.target.checked }));
                    setTransferError('');
                    setTransferSuccess(false);
                  }}
                  className="w-5 h-5 rounded border-slate-300 accent-red-500 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-sm font-bold text-slate-800 block">Bloquear agora (Imediato)</span>
                  <span className="text-xs text-slate-600">Impede transferências de forma imediata</span>
                </div>
                {transferDraft.transfersBlocked && <Ban size={20} className="text-red-500 shrink-0" />}
              </label>
            </div>
          </div>

          {transferError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700 font-medium text-sm">{transferError}</p>
            </div>
          )}

          {transferSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-emerald-700 font-medium text-sm">✓ Configurações salvas com sucesso!</p>
            </div>
          )}

          <button
            type="submit"
            disabled={savingTransfer || !onUpdateTransferSettings}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            <Save size={18} /> {savingTransfer ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </form>
      </div>
    </div>
  );
};
