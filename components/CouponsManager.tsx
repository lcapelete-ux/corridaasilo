import React, { useState } from 'react';
import { TeamCoupon } from '../types';
import { REGISTRATION_PRICE, calcCouponDiscount } from '../constants';
import { Plus, Trash2, Ticket, Pencil, Flag, BadgePercent, Lock, Unlock, Globe, Ban, Layers, AlertCircle, Save, X } from 'lucide-react';

interface CouponsManagerProps {
  coupons: TeamCoupon[];
  teams: string[];
  onSave: (coupon: TeamCoupon) => void;
  onUpdate: (coupon: TeamCoupon) => Promise<void> | void;
  onDelete: (id: string) => void;
  onToggleBlock?: (coupon: TeamCoupon) => void;
  couponsBlocked?: boolean; // Bloqueio geral (Configurações): todos desativados
}

const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400 outline-none transition-all text-sm";
const selectCls = "w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400 outline-none transition-all text-sm [color-scheme:dark]";
const labelCls = "block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide";

export const CouponsManager: React.FC<CouponsManagerProps> = ({ coupons, teams, onSave, onUpdate, onDelete, onToggleBlock, couponsBlocked = false }) => {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    teamName: '',
    code: '',
    discountType: 'fixed' as TeamCoupon['discountType'],
    value: '',
    isGlobal: false,
  });

  const resetForm = () => {
    setFormData({ teamName: '', code: '', discountType: 'fixed', value: '', isGlobal: false });
    setEditingId(null);
  };

  const handleCreateNew = () => {
    resetForm();
    setIsFormVisible(!isFormVisible);
  };

  const handleEdit = (coupon: TeamCoupon) => {
    setFormData({
      teamName: coupon.teamName,
      code: coupon.code,
      discountType: coupon.discountType,
      value: String(coupon.value),
      isGlobal: !!coupon.isGlobal,
    });
    setEditingId(coupon.id);
    setIsFormVisible(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = formData.code.trim().toUpperCase().replace(/\s+/g, '');
    const value = parseFloat(formData.value);

    if (!formData.isGlobal && !formData.teamName) {
      alert("Selecione a academia ou marque \"Cupom geral (vale para todos)\".");
      return;
    }
    if (!code || !value) {
      alert("Preencha código e valor do desconto.");
      return;
    }
    if (value <= 0) {
      alert("O valor do desconto deve ser maior que zero.");
      return;
    }
    if (formData.discountType === 'percent' && value > 100) {
      alert("Desconto em porcentagem não pode passar de 100%.");
      return;
    }
    if (formData.discountType === 'fixed' && value > REGISTRATION_PRICE) {
      alert(`Desconto em R$ não pode ser maior que o valor da inscrição (R$ ${REGISTRATION_PRICE.toFixed(2)}).`);
      return;
    }

    // Código deve ser único (independente da academia) para a validação não ter ambiguidade
    const duplicate = coupons.find(c => c.code.toUpperCase() === code && c.id !== editingId);
    if (duplicate) {
      alert(`Já existe o cupom "${code}" (academia ${duplicate.teamName}). Use outro código.`);
      return;
    }

    // Cupom geral guarda "Geral" como equipe (o vínculo é ignorado na aplicação)
    const teamName = formData.isGlobal ? 'Geral' : formData.teamName;
    const payload = { teamName, code, discountType: formData.discountType, value, isGlobal: formData.isGlobal };

    if (editingId) {
      // Só fecha se gravou: fechar mesmo com erro dá a impressão de que salvou
      Promise.resolve(onUpdate({ id: editingId, ...payload }))
        .then(() => { resetForm(); setIsFormVisible(false); })
        .catch((err: any) => alert(err?.message || 'Erro ao atualizar cupom.'));
      return;
    }

    onSave({ id: crypto.randomUUID(), ...payload });
    resetForm();
    setIsFormVisible(false);
  };

  // --- Mudar o desconto de todos os cupons de uma vez ---
  // Na virada de lote o desconto combinado com as academias muda por igual;
  // editar cupom por cupom é onde aparece o erro de digitação.
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkType, setBulkType] = useState<TeamCoupon['discountType']>('fixed');
  const [bulkValue, setBulkValue] = useState('');
  const [bulkIncludeGlobal, setBulkIncludeGlobal] = useState(true);
  const [bulkError, setBulkError] = useState('');
  const [bulkProgress, setBulkProgress] = useState<{ feitos: number; total: number } | null>(null);

  const bulkTargets = coupons.filter(c => bulkIncludeGlobal || !c.isGlobal);

  const openBulk = () => {
    setBulkType('fixed');
    setBulkValue('');
    setBulkIncludeGlobal(true);
    setBulkError('');
    setBulkProgress(null);
    setBulkOpen(true);
  };

  const handleBulkApply = async () => {
    const value = Math.round((parseFloat(bulkValue.replace(',', '.')) || 0) * 100) / 100;
    if (!bulkValue.trim() || Number.isNaN(value) || value <= 0) {
      setBulkError('Informe um desconto maior que zero.');
      return;
    }
    // Mesmos limites da edição individual
    if (bulkType === 'percent' && value > 100) {
      setBulkError('Desconto em porcentagem não pode passar de 100%.');
      return;
    }
    if (bulkType === 'fixed' && value > REGISTRATION_PRICE) {
      setBulkError(`Desconto em R$ não pode ser maior que o valor da inscrição (R$ ${REGISTRATION_PRICE.toFixed(2)}).`);
      return;
    }

    const alvos = bulkTargets;
    if (!alvos.length) {
      setBulkError('Nenhum cupom para alterar.');
      return;
    }

    setBulkError('');
    setBulkProgress({ feitos: 0, total: alvos.length });

    const falhas: string[] = [];
    for (const c of alvos) {
      try {
        await onUpdate({ ...c, discountType: bulkType, value });
      } catch (err: any) {
        falhas.push(`${c.code}: ${err?.message || 'erro ao salvar'}`);
      }
      setBulkProgress(p => (p ? { ...p, feitos: p.feitos + 1 } : p));
    }

    setBulkProgress(null);
    if (falhas.length) {
      // Sucesso parcial: mantém aberto e diz quais ficaram para trás
      setBulkError(`${falhas.length} de ${alvos.length} não foram salvos:\n${falhas.join('\n')}`);
      return;
    }
    setBulkOpen(false);
  };

  const formatDiscount = (c: TeamCoupon) =>
    c.discountType === 'percent'
      ? `${c.value}%`
      : `R$ ${c.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  // Exemplo de preço final para inscrição normal
  const previewPrice = (c: TeamCoupon) =>
    (REGISTRATION_PRICE - calcCouponDiscount(REGISTRATION_PRICE, c)).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Aviso de bloqueio geral (ligado em Configurações) */}
      {couponsBlocked && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <Ban size={20} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-400 text-sm">Todos os cupons estão bloqueados</p>
            <p className="text-xs text-red-300/80 mt-0.5">
              O bloqueio geral está ligado em <strong>Configurações → Cupons de Desconto</strong>. Nenhum cupom é aceito na inscrição, mesmo os liberados abaixo. Desligue lá para voltar a aceitar.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap gap-4 justify-between items-center bg-slate-900 p-6 rounded-xl border border-slate-800/60">
        <div className="min-w-[240px] flex-1">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Ticket className="text-yellow-400" size={20} />
            Cupons de Desconto
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Cada academia tem seu cupom. O inscrito informa o código ao se inscrever e o desconto é aplicado no valor final.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {coupons.length > 0 && (
            <button
              onClick={openBulk}
              className="bg-slate-800 text-slate-200 border border-slate-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:border-yellow-400/50 hover:text-yellow-400 transition-all"
              title="Aplicar o mesmo desconto a todos os cupons"
            >
              <Layers size={18} /> Mudar Desconto de Todos
            </button>
          )}
          <button
            onClick={handleCreateNew}
            className="bg-yellow-400 text-slate-900 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20"
          >
            <Plus size={18} /> Novo Cupom
          </button>
        </div>
      </div>

      {/* Mudança de desconto em massa */}
      {bulkOpen && (() => {
        const valorNum = Math.round((parseFloat(bulkValue.replace(',', '.')) || 0) * 100) / 100;
        const previa = valorNum > 0
          ? REGISTRATION_PRICE - calcCouponDiscount(REGISTRATION_PRICE, { discountType: bulkType, value: valorNum } as TeamCoupon)
          : null;
        const globais = coupons.filter(c => c.isGlobal).length;
        return (
          <div className="bg-slate-900 p-6 rounded-xl border border-yellow-400/30 animate-slide-down">
            <div className="flex justify-between items-start mb-5 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers size={16} className="text-yellow-400" /> Mudar o desconto de todas as equipes
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  O desconto abaixo substitui o de <strong className="text-slate-400">todos os cupons</strong> listados. Útil na virada de lote. O código e a equipe de cada cupom não mudam.
                </p>
              </div>
              <button
                onClick={() => setBulkOpen(false)}
                disabled={!!bulkProgress}
                className="text-slate-600 hover:text-slate-300 transition-colors disabled:opacity-40"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Tipo de Desconto</label>
                <select
                  className={selectCls}
                  value={bulkType}
                  disabled={!!bulkProgress}
                  onChange={e => { setBulkType(e.target.value as TeamCoupon['discountType']); setBulkError(''); }}
                >
                  <option value="fixed">Valor fixo (R$)</option>
                  <option value="percent">Porcentagem (%)</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>{bulkType === 'percent' ? 'Novo desconto (%)' : 'Novo desconto (R$)'}</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                    {bulkType === 'percent' ? '%' : 'R$'}
                  </span>
                  <input
                    type="number" step="0.01" min="0.01"
                    max={bulkType === 'percent' ? 100 : REGISTRATION_PRICE}
                    className={`${inputCls} pl-9 font-mono`}
                    placeholder={bulkType === 'percent' ? '15' : '15.00'}
                    value={bulkValue}
                    disabled={!!bulkProgress}
                    onChange={e => { setBulkValue(e.target.value); setBulkError(''); }}
                  />
                </div>
              </div>

              <div className="flex items-end">
                <div className="w-full bg-slate-800/60 border border-slate-700 rounded-lg p-2.5">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">Inscrição ficaria</span>
                  <span className="font-mono font-black text-lg text-emerald-400">
                    {previa != null ? `R$ ${previa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                  </span>
                </div>
              </div>
            </div>

            {globais > 0 && (
              <label className="flex items-center gap-3 cursor-pointer bg-slate-800/60 border border-slate-700 rounded-lg p-3 mt-4">
                <input
                  type="checkbox"
                  checked={bulkIncludeGlobal}
                  disabled={!!bulkProgress}
                  onChange={e => setBulkIncludeGlobal(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-600 accent-yellow-400"
                />
                <div>
                  <span className="text-sm font-bold text-white block">
                    Incluir também {globais === 1 ? 'o cupom geral' : `os ${globais} cupons gerais`}
                  </span>
                  <span className="text-xs text-slate-400">
                    Cupom geral não pertence a nenhuma equipe. Desmarque para mexer só nos cupons das academias.
                  </span>
                </div>
              </label>
            )}

            {bulkProgress && (
              <p className="text-sm text-yellow-400 font-bold mt-4">
                Salvando… {bulkProgress.feitos} de {bulkProgress.total}
              </p>
            )}

            {bulkError && (
              <p className="text-red-400 text-xs font-bold mt-4 whitespace-pre-line flex items-start gap-1.5">
                <AlertCircle size={13} className="shrink-0 mt-0.5" /> {bulkError}
              </p>
            )}

            <div className="pt-4 mt-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setBulkOpen(false)}
                disabled={!!bulkProgress}
                className="px-4 py-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleBulkApply}
                disabled={!!bulkProgress || !bulkValue.trim() || bulkTargets.length === 0}
                className="px-6 py-2 bg-yellow-400 text-slate-900 rounded-lg font-bold text-sm hover:bg-yellow-300 shadow-lg shadow-yellow-400/10 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Save size={16} />
                {bulkProgress ? 'Salvando...' : `Aplicar a ${bulkTargets.length} ${bulkTargets.length === 1 ? 'cupom' : 'cupons'}`}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Formulário */}
      {isFormVisible && (
        <form onSubmit={handleSubmit} className="bg-slate-900 p-6 rounded-xl border border-slate-800/60 animate-slide-down">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5 pb-3 border-b border-slate-800">
            {editingId ? 'Editar Cupom' : 'Novo Cupom'}
          </h3>
          {/* Cupom geral: vale para todos, sem precisar de equipe */}
          <label className="flex items-center gap-3 cursor-pointer bg-slate-800/60 border border-slate-700 rounded-lg p-3 mb-4">
            <input
              type="checkbox"
              checked={formData.isGlobal}
              onChange={e => setFormData({ ...formData, isGlobal: e.target.checked })}
              className="w-5 h-5 rounded border-slate-600 accent-yellow-400"
            />
            <div>
              <span className="text-sm font-bold text-white block">Cupom geral (vale para todos)</span>
              <span className="text-xs text-slate-400">Qualquer pessoa que digitar o código ganha o desconto, sem precisar de equipe.</span>
            </div>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>Academia {formData.isGlobal && <span className="text-slate-600 normal-case font-normal">(não usada no cupom geral)</span>}</label>
              <select
                required={!formData.isGlobal}
                disabled={formData.isGlobal}
                className={`${selectCls} ${formData.isGlobal ? 'opacity-50 cursor-not-allowed' : ''}`}
                value={formData.isGlobal ? '' : formData.teamName}
                onChange={e => setFormData({ ...formData, teamName: e.target.value })}
              >
                <option value="">{formData.isGlobal ? 'Todas as equipes' : 'Selecione...'}</option>
                {teams.map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Código do Cupom</label>
              <input
                required
                className={`${inputCls} uppercase font-mono`}
                placeholder="Ex: LUSO10"
                value={formData.code}
                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              />
            </div>

            <div>
              <label className={labelCls}>Tipo de Desconto</label>
              <select
                className={selectCls}
                value={formData.discountType}
                onChange={e => setFormData({ ...formData, discountType: e.target.value as TeamCoupon['discountType'] })}
              >
                <option value="fixed">Valor fixo (R$)</option>
                <option value="percent">Porcentagem (%)</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>{formData.discountType === 'percent' ? 'Desconto (%)' : 'Desconto (R$)'}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  {formData.discountType === 'percent' ? '%' : 'R$'}
                </span>
                <input
                  required type="number" step="0.01" min="0.01"
                  max={formData.discountType === 'percent' ? 100 : REGISTRATION_PRICE}
                  className={`${inputCls} pl-9`}
                  placeholder={formData.discountType === 'percent' ? '10' : '10.00'}
                  value={formData.value}
                  onChange={e => setFormData({ ...formData, value: e.target.value })}
                />
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 lg:col-span-4 pt-3 border-t border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setIsFormVisible(false); resetForm(); }}
                className="px-4 py-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg text-sm font-medium transition-all"
              >
                Cancelar
              </button>
              <button type="submit" className="px-6 py-2 bg-yellow-400 text-slate-900 rounded-lg font-bold text-sm hover:bg-yellow-300 shadow-lg shadow-yellow-400/10 transition-all">
                {editingId ? 'Atualizar Cupom' : 'Salvar Cupom'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Cards de cupons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map(coupon => (
          <div key={coupon.id} className={`bg-slate-900 p-5 rounded-xl border transition-all ${
            coupon.blocked ? 'border-red-500/40 opacity-75' : 'border-slate-800/60 hover:border-yellow-400/30'
          }`}>
            <div className="flex justify-between items-start mb-3">
              {coupon.isGlobal ? (
                <div className="bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                  <Globe size={11} /> Geral · Todos
                </div>
              ) : (
                <div className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                  <Flag size={11} /> {coupon.teamName}
                </div>
              )}
              <div className="flex gap-1">
                {onToggleBlock && (
                  <button
                    onClick={() => onToggleBlock(coupon)}
                    className={`transition-colors p-1 ${coupon.blocked ? 'text-red-400 hover:text-emerald-400' : 'text-slate-600 hover:text-red-400'}`}
                    title={coupon.blocked ? 'Desbloquear cupom' : 'Bloquear cupom'}
                  >
                    {coupon.blocked ? <Lock size={16} /> : <Unlock size={16} />}
                  </button>
                )}
                <button
                  onClick={() => handleEdit(coupon)}
                  className="text-slate-600 hover:text-yellow-400 transition-colors p-1"
                  title="Editar Cupom"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => { if (confirm(`Excluir o cupom ${coupon.code}?`)) onDelete(coupon.id); }}
                  className="text-slate-600 hover:text-red-400 transition-colors p-1"
                  title="Excluir Cupom"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className={`border border-dashed rounded-lg px-4 py-3 text-center mb-3 ${
              coupon.blocked ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-800/60 border-slate-600'
            }`}>
              <p className={`font-mono font-black text-xl tracking-widest ${coupon.blocked ? 'text-slate-500 line-through' : 'text-yellow-400'}`}>{coupon.code}</p>
            </div>

            {coupon.blocked ? (
              <div className="flex items-center gap-1.5 text-red-400 font-bold text-sm">
                <Lock size={14} /> Cupom bloqueado (inativo)
              </div>
            ) : (
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <BadgePercent size={15} /> {formatDiscount(coupon)} de desconto
                </span>
                <span className="text-slate-500 text-xs">
                  Inscrição: R$ {previewPrice(coupon)}
                </span>
              </div>
            )}
          </div>
        ))}

        {coupons.length === 0 && (
          <div className="col-span-full p-10 text-center text-slate-600 italic">
            Nenhum cupom cadastrado. Clique em "Novo Cupom" para criar o primeiro.
          </div>
        )}
      </div>
    </div>
  );
};
