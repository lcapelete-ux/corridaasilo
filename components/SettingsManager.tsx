import React, { useState } from 'react';
import { Settings, Save, AlertCircle, Clock, Ban, Tag, CalendarClock, Users, Ticket, Trophy } from 'lucide-react';
import { TransferSettings } from '../types';
import { formatBrDate, MAX_ATHLETES } from '../constants';

interface SettingsManagerProps {
  raceGroupName: string;
  onUpdateRaceGroupName: (name: string) => Promise<void>;
  transferSettings?: TransferSettings | null;
  onUpdateTransferSettings?: (settings: TransferSettings) => Promise<void>;
  promoDeadline?: string;
  onUpdatePromoDeadline?: (date: string) => Promise<void>;
  registrationDeadline?: string;
  onUpdateRegistrationDeadline?: (date: string) => Promise<void>;
  totalRunners?: number;
  couponsBlocked?: boolean;
  onUpdateCouponsBlocked?: (blocked: boolean) => Promise<void>;
  teamRankingEnabled?: boolean;
  onUpdateTeamRankingEnabled?: (enabled: boolean) => Promise<void>;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({ raceGroupName, onUpdateRaceGroupName, transferSettings, onUpdateTransferSettings, promoDeadline, onUpdatePromoDeadline, registrationDeadline, onUpdateRegistrationDeadline, totalRunners = 0, couponsBlocked = false, onUpdateCouponsBlocked, teamRankingEnabled = false, onUpdateTeamRankingEnabled }) => {
  const [name, setName] = useState(raceGroupName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [promoDraft, setPromoDraft] = useState(promoDeadline || '');
  const [savingPromo, setSavingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState(false);

  const [regDraft, setRegDraft] = useState(registrationDeadline || '');
  const [savingReg, setSavingReg] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);

  const [transferDraft, setTransferDraft] = useState<TransferSettings>({
    transferDeadline: transferSettings?.transferDeadline,
    transfersBlocked: transferSettings?.transfersBlocked || false,
  });
  const [savingTransfer, setSavingTransfer] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState(false);

  const [savingCoupons, setSavingCoupons] = useState(false);
  const [couponsError, setCouponsError] = useState('');

  const [savingRanking, setSavingRanking] = useState(false);
  const [rankingError, setRankingError] = useState('');

  const handleToggleTeamRanking = async (enabled: boolean) => {
    if (!onUpdateTeamRankingEnabled) return;
    setSavingRanking(true);
    setRankingError('');
    try {
      await onUpdateTeamRankingEnabled(enabled);
    } catch (err: any) {
      setRankingError(err?.message || 'Erro ao salvar a configuração do ranking.');
    } finally {
      setSavingRanking(false);
    }
  };

  const handleToggleCouponsBlocked = async (blocked: boolean) => {
    if (!onUpdateCouponsBlocked) return;
    setSavingCoupons(true);
    setCouponsError('');
    try {
      await onUpdateCouponsBlocked(blocked);
    } catch (err: any) {
      setCouponsError(err?.message || 'Erro ao salvar o bloqueio de cupons.');
    } finally {
      setSavingCoupons(false);
    }
  };

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

  const handleSaveReg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateRegistrationDeadline) return;

    setSavingReg(true);
    setRegError('');
    setRegSuccess(false);

    try {
      await onUpdateRegistrationDeadline(regDraft);
      setRegSuccess(true);
      setTimeout(() => setRegSuccess(false), 3000);
    } catch (err: any) {
      setRegError(err?.message || 'Erro ao salvar o prazo de inscrição.');
    } finally {
      setSavingReg(false);
    }
  };

  const canTransferNow = () => {
    if (transferSettings?.transfersBlocked) return false;
    if (!transferSettings?.transferDeadline) return true;
    return new Date().toISOString().split('T')[0] <= transferSettings.transferDeadline;
  };

  const todayIso = new Date().toISOString().split('T')[0];
  const registrationsOpen = !registrationDeadline || todayIso <= registrationDeadline;
  const pct = Math.min(100, Math.round((totalRunners / MAX_ATHLETES) * 100));

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

      {/* Inscrições: prazo final + contador de vagas (500) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-3 rounded-lg ${registrationsOpen ? 'bg-emerald-100' : 'bg-red-100'}`}>
            <CalendarClock size={24} className={registrationsOpen ? 'text-emerald-600' : 'text-red-600'} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-800">Inscrições</h2>
            <p className="text-sm text-slate-600 mt-1">
              Status: <span className={`font-bold ${registrationsOpen ? 'text-emerald-600' : 'text-red-600'}`}>
                {registrationsOpen ? '✓ Abertas' : '✗ Encerradas'}
              </span>
            </p>
          </div>
        </div>

        {/* Contador de vagas (só admin vê) */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <Users size={16} className="text-indigo-500" /> Inscritos
            </span>
            <span className="text-sm font-bold text-slate-800">
              {totalRunners} <span className="text-slate-400 font-medium">de {MAX_ATHLETES}</span>
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : pct >= 85 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {totalRunners >= MAX_ATHLETES
              ? 'Limite de 500 atletas atingido.'
              : `Faltam ${MAX_ATHLETES - totalRunners} vagas para o limite de ${MAX_ATHLETES}.`}
          </p>
        </div>

        <form onSubmit={handleSaveReg} className="space-y-6">
          <div className="max-w-xs">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              <CalendarClock size={16} className="inline mr-2" />
              Prazo final das inscrições
            </label>
            <input
              type="date"
              value={regDraft}
              onChange={(e) => {
                setRegDraft(e.target.value);
                setRegError('');
                setRegSuccess(false);
              }}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all [color-scheme:light]"
            />
            <p className="text-xs text-slate-500 mt-2">
              Depois desta data, o formulário público fecha automaticamente. Deixe vazio para não ter prazo. (Admin e líderes continuam podendo cadastrar.)
            </p>
          </div>

          {regError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700 font-medium text-sm">{regError}</p>
            </div>
          )}

          {regSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-emerald-700 font-medium text-sm">✓ Prazo salvo com sucesso!</p>
            </div>
          )}

          <button
            type="submit"
            disabled={savingReg || !onUpdateRegistrationDeadline || regDraft === (registrationDeadline || '')}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            <Save size={18} /> {savingReg ? 'Salvando...' : 'Salvar Prazo'}
          </button>
        </form>
      </div>

      {/* Cupons de Desconto — bloqueio geral */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-3 rounded-lg ${couponsBlocked ? 'bg-red-100' : 'bg-emerald-100'}`}>
            <Ticket size={24} className={couponsBlocked ? 'text-red-600' : 'text-emerald-600'} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-800">Cupons de Desconto</h2>
            <p className="text-sm text-slate-600 mt-1">
              Status: <span className={`font-bold ${couponsBlocked ? 'text-red-600' : 'text-emerald-600'}`}>
                {couponsBlocked ? '✗ Todos bloqueados' : '✓ Liberados'}
              </span>
            </p>
          </div>
        </div>

        <p className="text-slate-600 text-sm mb-6">
          Este interruptor desliga <strong>todos os cupons de uma vez</strong> — inclusive os que forem criados depois.
          Com ele ligado, nenhum cupom é aceito na inscrição (nem no site público, nem no cadastro manual).
        </p>

        <label
          className="flex items-center gap-3 cursor-pointer p-4 rounded-lg border-2 border-slate-200 hover:border-red-300 hover:bg-red-50 transition-all"
          style={couponsBlocked ? { borderColor: '#fee2e2', backgroundColor: '#fef2f2' } : {}}
        >
          <input
            type="checkbox"
            checked={couponsBlocked}
            disabled={savingCoupons || !onUpdateCouponsBlocked}
            onChange={(e) => handleToggleCouponsBlocked(e.target.checked)}
            className="w-5 h-5 rounded border-slate-300 accent-red-500 cursor-pointer disabled:opacity-50"
          />
          <div className="flex-1">
            <span className="text-sm font-bold text-slate-800 block">Bloquear todos os cupons de desconto</span>
            <span className="text-xs text-slate-600">
              {savingCoupons ? 'Salvando...' : couponsBlocked ? 'Nenhum cupom está sendo aceito.' : 'Marque para desativar todos os cupons imediatamente.'}
            </span>
          </div>
          {couponsBlocked && <Ban size={20} className="text-red-500 shrink-0" />}
        </label>

        {couponsError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mt-4">
            <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-700 font-medium text-sm">{couponsError}</p>
          </div>
        )}
      </div>

      {/* Ranking de Equipes */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-3 rounded-lg ${teamRankingEnabled ? 'bg-emerald-100' : 'bg-slate-100'}`}>
            <Trophy size={24} className={teamRankingEnabled ? 'text-emerald-600' : 'text-slate-500'} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-800">Ranking de Equipes</h2>
            <p className="text-sm text-slate-600 mt-1">
              Status: <span className={`font-bold ${teamRankingEnabled ? 'text-emerald-600' : 'text-slate-500'}`}>
                {teamRankingEnabled ? '✓ Visível na página inicial' : '✗ Oculto'}
              </span>
            </p>
          </div>
        </div>

        <p className="text-slate-600 text-sm mb-6">
          Mostra na página inicial as <strong>5 equipes com mais inscritos</strong>, atualizado automaticamente
          conforme novas inscrições chegam.
        </p>

        <label className="flex items-center gap-3 cursor-pointer p-4 rounded-lg border-2 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all">
          <input
            type="checkbox"
            checked={teamRankingEnabled}
            disabled={savingRanking || !onUpdateTeamRankingEnabled}
            onChange={(e) => handleToggleTeamRanking(e.target.checked)}
            className="w-5 h-5 rounded border-slate-300 accent-emerald-500 cursor-pointer disabled:opacity-50"
          />
          <div className="flex-1">
            <span className="text-sm font-bold text-slate-800 block">Mostrar ranking das equipes no site</span>
            <span className="text-xs text-slate-600">
              {savingRanking ? 'Salvando...' : teamRankingEnabled ? 'O ranking está visível para todos.' : 'Marque para exibir o top 5 na página inicial.'}
            </span>
          </div>
        </label>

        {rankingError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mt-4">
            <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-700 font-medium text-sm">{rankingError}</p>
          </div>
        )}
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
