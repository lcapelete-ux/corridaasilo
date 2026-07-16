import React, { useState } from 'react';
import { TeamCoupon } from '../types';
import { REGISTRATION_PRICE, calcCouponDiscount } from '../constants';
import { Plus, Trash2, Ticket, Pencil, Flag, BadgePercent } from 'lucide-react';

interface CouponsManagerProps {
  coupons: TeamCoupon[];
  teams: string[];
  onSave: (coupon: TeamCoupon) => void;
  onUpdate: (coupon: TeamCoupon) => void;
  onDelete: (id: string) => void;
}

const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400 outline-none transition-all text-sm";
const selectCls = "w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400 outline-none transition-all text-sm [color-scheme:dark]";
const labelCls = "block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide";

export const CouponsManager: React.FC<CouponsManagerProps> = ({ coupons, teams, onSave, onUpdate, onDelete }) => {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    teamName: '',
    code: '',
    discountType: 'fixed' as TeamCoupon['discountType'],
    value: ''
  });

  const resetForm = () => {
    setFormData({ teamName: '', code: '', discountType: 'fixed', value: '' });
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
      value: String(coupon.value)
    });
    setEditingId(coupon.id);
    setIsFormVisible(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = formData.code.trim().toUpperCase().replace(/\s+/g, '');
    const value = parseFloat(formData.value);

    if (!formData.teamName || !code || !value) {
      alert("Preencha academia, código e valor do desconto.");
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

    if (editingId) {
      onUpdate({ id: editingId, teamName: formData.teamName, code, discountType: formData.discountType, value });
    } else {
      onSave({ id: crypto.randomUUID(), teamName: formData.teamName, code, discountType: formData.discountType, value });
    }

    resetForm();
    setIsFormVisible(false);
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
      {/* Header */}
      <div className="flex justify-between items-center bg-slate-900 p-6 rounded-xl border border-slate-800/60">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Ticket className="text-yellow-400" size={20} />
            Cupons de Desconto
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Cada academia tem seu cupom. O inscrito informa o código ao se inscrever e o desconto é aplicado no valor final.
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="bg-yellow-400 text-slate-900 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20"
        >
          <Plus size={18} /> Novo Cupom
        </button>
      </div>

      {/* Formulário */}
      {isFormVisible && (
        <form onSubmit={handleSubmit} className="bg-slate-900 p-6 rounded-xl border border-slate-800/60 animate-slide-down">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5 pb-3 border-b border-slate-800">
            {editingId ? 'Editar Cupom' : 'Novo Cupom'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={labelCls}>Academia</label>
              <select
                required
                className={selectCls}
                value={formData.teamName}
                onChange={e => setFormData({ ...formData, teamName: e.target.value })}
              >
                <option value="">Selecione...</option>
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
          <div key={coupon.id} className="bg-slate-900 p-5 rounded-xl border border-slate-800/60 hover:border-yellow-400/30 transition-all">
            <div className="flex justify-between items-start mb-3">
              <div className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-1">
                <Flag size={11} /> {coupon.teamName}
              </div>
              <div className="flex gap-1">
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

            <div className="bg-slate-800/60 border border-dashed border-slate-600 rounded-lg px-4 py-3 text-center mb-3">
              <p className="font-mono font-black text-yellow-400 text-xl tracking-widest">{coupon.code}</p>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <BadgePercent size={15} /> {formatDiscount(coupon)} de desconto
              </span>
              <span className="text-slate-500 text-xs">
                Inscrição: R$ {previewPrice(coupon)}
              </span>
            </div>
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
