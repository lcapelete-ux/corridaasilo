import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, Clock, Ban, Tag, CalendarClock, Users, Ticket, Trophy, MessageCircle, ExternalLink, Key, RefreshCw, Copy, Check } from 'lucide-react';
import { TransferSettings, ClosedNoticeSettings } from '../types';
import { formatBrDate, MAX_ATHLETES, whatsappLink } from '../constants';

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
  maxAthletes?: number;                                     // limite de vagas definido pelo admin
  onUpdateMaxAthletes?: (limite: number) => Promise<void>;
  closedNoticeMessage?: string;                             // aviso manual quando as inscrições estão encerradas
  closedNoticeWhatsapp?: string;                            // WhatsApp opcional exibido junto do aviso
  onUpdateClosedNotice?: (settings: ClosedNoticeSettings) => Promise<void>;
  vipToken?: string;                                        // código do link VIP (?vip=CODIGO), vazio = sem link ativo
  onUpdateVipToken?: (token: string) => Promise<void>;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({ raceGroupName, onUpdateRaceGroupName, transferSettings, onUpdateTransferSettings, promoDeadline, onUpdatePromoDeadline, registrationDeadline, onUpdateRegistrationDeadline, totalRunners = 0, couponsBlocked = false, onUpdateCouponsBlocked, teamRankingEnabled = false, onUpdateTeamRankingEnabled, maxAthletes = MAX_ATHLETES, onUpdateMaxAthletes, closedNoticeMessage = '', closedNoticeWhatsapp = '', onUpdateClosedNotice, vipToken = '', onUpdateVipToken }) => {
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

  // Limite de vagas: alvo do painel, ajustável quando o admin abre mais
  const [limiteDraft, setLimiteDraft] = useState(String(maxAthletes));
  const [savingLimite, setSavingLimite] = useState(false);
  const [limiteError, setLimiteError] = useState('');
  const [limiteOk, setLimiteOk] = useState(false);

  // O limite vem do banco depois da montagem: sem isto o campo ficaria
  // mostrando o padrão enquanto o valor real já era outro.
  useEffect(() => { setLimiteDraft(String(maxAthletes)); }, [maxAthletes]);

  // Aviso manual mostrado quando as inscrições estão encerradas
  const [closedMsgDraft, setClosedMsgDraft] = useState(closedNoticeMessage);
  const [closedWhatsDraft, setClosedWhatsDraft] = useState(closedNoticeWhatsapp);
  const [savingClosedNotice, setSavingClosedNotice] = useState(false);
  const [closedNoticeError, setClosedNoticeError] = useState('');
  const [closedNoticeSuccess, setClosedNoticeSuccess] = useState(false);

  useEffect(() => {
    setClosedMsgDraft(closedNoticeMessage);
    setClosedWhatsDraft(closedNoticeWhatsapp);
  }, [closedNoticeMessage, closedNoticeWhatsapp]);

  const salvarAvisoEncerramento = async () => {
    setSavingClosedNotice(true);
    setClosedNoticeError('');
    setClosedNoticeSuccess(false);
    try {
      await onUpdateClosedNotice?.({ message: closedMsgDraft.trim(), whatsapp: closedWhatsDraft.trim() });
      setClosedNoticeSuccess(true);
      setTimeout(() => setClosedNoticeSuccess(false), 3000);
    } catch (e: any) {
      setClosedNoticeError(e?.message || 'Não foi possível salvar o aviso.');
    } finally {
      setSavingClosedNotice(false);
    }
  };

  const closedNoticeTestLink = whatsappLink(closedWhatsDraft);
  const closedNoticeUnchanged = closedMsgDraft === closedNoticeMessage && closedWhatsDraft === closedNoticeWhatsapp;

  // Link VIP: libera o formulário mesmo com as inscrições encerradas
  const [vipDraft, setVipDraft] = useState(vipToken);
  const [savingVip, setSavingVip] = useState(false);
  const [vipError, setVipError] = useState('');
  const [vipSuccess, setVipSuccess] = useState(false);
  const [vipCopied, setVipCopied] = useState(false);

  useEffect(() => { setVipDraft(vipToken); }, [vipToken]);

  const gerarTokenVip = () => {
    const codigo = Math.random().toString(36).slice(2, 10).toUpperCase();
    setVipDraft(codigo);
    setVipError('');
    setVipSuccess(false);
  };

  const salvarVip = async () => {
    setSavingVip(true);
    setVipError('');
    setVipSuccess(false);
    try {
      await onUpdateVipToken?.(vipDraft.trim());
      setVipSuccess(true);
      setTimeout(() => setVipSuccess(false), 3000);
    } catch (e: any) {
      setVipError(e?.message || 'Não foi possível salvar o link VIP.');
    } finally {
      setSavingVip(false);
    }
  };

  // Só mostra o link para copiar quando o rascunho bate com o que está
  // salvo — copiar antes de salvar daria um link que ainda não funciona.
  const vipLink = vipToken ? `${window.location.origin}${window.location.pathname}?vip=${encodeURIComponent(vipToken)}` : '';
  const vipLinkReady = vipLink && vipDraft.trim() === vipToken;

  const copiarVipLink = () => {
    if (!vipLink) return;
    navigator.clipboard.writeText(vipLink);
    setVipCopied(true);
    setTimeout(() => setVipCopied(false), 2000);
  };

  const salvarLimite = async () => {
    const n = parseInt(limiteDraft, 10);
    if (!n || n < 1) { setLimiteError('Informe um número maior que zero.'); return; }
    if (n < totalRunners) {
      setLimiteError(`Já há ${totalRunners} inscritos. O limite não pode ser menor que isso.`);
      return;
    }
    setSavingLimite(true);
    setLimiteError('');
    setLimiteOk(false);
    try {
      await onUpdateMaxAthletes?.(n);
      setLimiteOk(true);
      setTimeout(() => setLimiteOk(false), 3000);
    } catch (e: any) {
      setLimiteError(e?.message || 'Não foi possível salvar o limite.');
    } finally {
      setSavingLimite(false);
    }
  };

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
  const pct = Math.min(100, Math.round((totalRunners / (maxAthletes || MAX_ATHLETES)) * 100));

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
              {totalRunners} <span className="text-slate-400 font-medium">de {maxAthletes}</span>
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : pct >= 85 ? 'bg-amber-500' : 'bg-emerald-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {totalRunners >= maxAthletes
              ? `Limite de ${maxAthletes} atletas atingido.`
              : `Faltam ${maxAthletes - totalRunners} vagas para o limite de ${maxAthletes}.`}
          </p>

          {/* Abrir mais vagas */}
          {onUpdateMaxAthletes && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">
                Limite de vagas
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={1}
                  value={limiteDraft}
                  onChange={e => { setLimiteDraft(e.target.value); setLimiteError(''); setLimiteOk(false); }}
                  className="w-32 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500 [color-scheme:light]"
                />
                <button
                  type="button"
                  onClick={salvarLimite}
                  disabled={savingLimite || limiteDraft === String(maxAthletes)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <Save size={15} /> {savingLimite ? 'Salvando...' : 'Salvar limite'}
                </button>
                {limiteOk && <span className="text-emerald-600 text-sm font-bold">✓ Salvo</span>}
              </div>
              {limiteError && (
                <p className="text-red-700 text-xs font-bold mt-2 flex items-start gap-1.5">
                  <AlertCircle size={12} className="shrink-0 mt-0.5" /> {limiteError}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-2">
                Aumente se decidir abrir mais inscrições. Este número é o <strong>alvo mostrado aqui</strong>:
                ele não fecha o formulário sozinho ao ser atingido — quem fecha as inscrições é o prazo acima.
              </p>
            </div>
          )}
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

        {/* Aviso manual mostrado no lugar do formulário quando as inscrições encerram */}
        <div className="mt-8 pt-8 border-t border-slate-200">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle size={18} className="text-slate-500" />
            <h3 className="text-base font-bold text-slate-800">Aviso de inscrições encerradas</h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Recado exibido no lugar do formulário depois do prazo acima (ex.: quando reabrem, para onde ligar).
            Deixe vazio para usar o texto padrão. Informando um WhatsApp, um botão para chamar aparece junto do aviso.
          </p>

          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Mensagem do aviso</label>
              <textarea
                value={closedMsgDraft}
                onChange={(e) => { setClosedMsgDraft(e.target.value); setClosedNoticeError(''); setClosedNoticeSuccess(false); }}
                placeholder={`O prazo de inscrição para a ${raceGroupName} foi encerrado. Para mais informações, procure a organização do evento.`}
                rows={3}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm [color-scheme:light]"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">WhatsApp para contato (opcional)</label>
              <input
                type="text"
                value={closedWhatsDraft}
                onChange={(e) => { setClosedWhatsDraft(e.target.value); setClosedNoticeError(''); setClosedNoticeSuccess(false); }}
                placeholder="(15) 99133-4809"
                className="w-full max-w-xs px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all [color-scheme:light]"
              />
              <p className="text-xs text-slate-500 mt-2">
                Deixe vazio para não mostrar botão de WhatsApp no aviso.
              </p>
              {closedNoticeTestLink && (
                <a
                  href={closedNoticeTestLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700 mt-2"
                >
                  <ExternalLink size={14} /> Testar link do WhatsApp
                </a>
              )}
            </div>

            {closedNoticeError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
                <p className="text-red-700 font-medium text-sm">{closedNoticeError}</p>
              </div>
            )}

            {closedNoticeSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-emerald-700 font-medium text-sm">✓ Aviso salvo com sucesso!</p>
              </div>
            )}

            <button
              type="button"
              onClick={salvarAvisoEncerramento}
              disabled={savingClosedNotice || !onUpdateClosedNotice || closedNoticeUnchanged}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
            >
              <Save size={18} /> {savingClosedNotice ? 'Salvando...' : 'Salvar Aviso'}
            </button>
          </div>
        </div>
      </div>

      {/* Link VIP — libera inscrição mesmo com o prazo encerrado */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className={`p-3 rounded-lg ${vipToken ? 'bg-emerald-100' : 'bg-slate-100'}`}>
            <Key size={24} className={vipToken ? 'text-emerald-600' : 'text-slate-500'} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-800">Link VIP</h2>
            <p className="text-sm text-slate-600 mt-1">
              Status: <span className={`font-bold ${vipToken ? 'text-emerald-600' : 'text-slate-500'}`}>
                {vipToken ? '✓ Link ativo' : '✗ Nenhum link gerado'}
              </span>
            </p>
          </div>
        </div>

        <p className="text-slate-600 text-sm mb-6">
          Gera um link especial que ignora o prazo de inscrição — quem abrir esse link consegue se inscrever
          normalmente mesmo com as inscrições encerradas para o público. Envie só para quem você quiser abrir
          exceção (convidados, patrocinadores, atletas de última hora). <strong>Qualquer pessoa com o link
          consegue usá-lo</strong> — para revogar o acesso, gere um novo código: o link anterior para de funcionar.
        </p>

        <div className="max-w-xl space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Código do link</label>
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={vipDraft}
                onChange={(e) => { setVipDraft(e.target.value); setVipError(''); setVipSuccess(false); }}
                placeholder="Ex: AMIGOS2026"
                className="flex-1 min-w-[180px] px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono [color-scheme:light]"
              />
              <button
                type="button"
                onClick={gerarTokenVip}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-200 transition-all flex items-center gap-2"
              >
                <RefreshCw size={15} /> Gerar novo
              </button>
            </div>
          </div>

          {vipError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700 font-medium text-sm">{vipError}</p>
            </div>
          )}

          {vipSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-emerald-700 font-medium text-sm">✓ Link VIP salvo com sucesso!</p>
            </div>
          )}

          <button
            type="button"
            onClick={salvarVip}
            disabled={savingVip || !onUpdateVipToken || vipDraft.trim() === vipToken}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            <Save size={18} /> {savingVip ? 'Salvando...' : 'Salvar'}
          </button>

          {vipLinkReady ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-xs font-bold text-slate-500 uppercase mb-2">Link para enviar aos VIPs</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="flex-1 min-w-[200px] text-xs text-slate-700 break-all">{vipLink}</code>
                <button
                  type="button"
                  onClick={copiarVipLink}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${vipCopied ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-white hover:bg-slate-700'}`}
                >
                  {vipCopied ? <Check size={13} /> : <Copy size={13} />} {vipCopied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>
          ) : vipToken ? (
            <p className="text-xs text-amber-600 font-bold">Salve a alteração para atualizar o link.</p>
          ) : null}
        </div>
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
