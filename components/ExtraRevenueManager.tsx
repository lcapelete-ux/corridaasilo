import React, { useState } from 'react';
import { ExtraRevenue, Runner } from '../types';
import { getRunnerPaidValue, SENIOR_AGE } from '../constants';
import { Plus, Trash2, TrendingUp, Calendar, DollarSign, UserCheck, Tag } from 'lucide-react';

interface ExtraRevenueManagerProps {
  revenues: ExtraRevenue[];
  runners: Runner[];
  onSave: (revenue: ExtraRevenue) => void;
  onDelete: (id: string) => void;
}

const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none transition-all text-sm";
const labelCls = "block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide";

export const ExtraRevenueManager: React.FC<ExtraRevenueManagerProps> = ({ revenues, runners, onSave, onDelete }) => {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'Venda Extra',
    date: new Date().toISOString().split('T')[0]
  });

  const [isFormVisible, setIsFormVisible] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;

    const newRevenue: ExtraRevenue = {
      id: crypto.randomUUID(),
      description: formData.description,
      amount: parseFloat(formData.amount),
      date: formData.date,
      category: formData.category
    };

    onSave(newRevenue);
    setFormData({ description: '', amount: '', category: 'Venda Extra', date: new Date().toISOString().split('T')[0] });
    setIsFormVisible(false);
  };

  // Entradas automáticas: inscrições com pagamento confirmado
  const paidRunners = runners
    .filter(r => r.isPaid)
    .sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());
  const totalRegistrations = paidRunners.reduce((acc, r) => acc + getRunnerPaidValue(r), 0);

  const totalExtra = revenues.reduce((acc, curr) => acc + curr.amount, 0);
  const totalGeral = totalRegistrations + totalExtra;

  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 p-6 rounded-xl border border-indigo-500/20 flex items-center justify-between">
          <div>
            <p className="text-indigo-400 font-bold text-sm">Inscrições Confirmadas ({paidRunners.length})</p>
            <h2 className="text-2xl font-black text-white">R$ {fmt(totalRegistrations)}</h2>
          </div>
          <div className="bg-indigo-500/10 p-3 rounded-full text-indigo-400">
            <UserCheck size={22} />
          </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800/60 flex items-center justify-between">
          <div>
            <p className="text-slate-400 font-bold text-sm">Receitas Extras</p>
            <h2 className="text-2xl font-black text-white">R$ {fmt(totalExtra)}</h2>
          </div>
          <div className="bg-slate-800 p-3 rounded-full text-slate-400">
            <DollarSign size={22} />
          </div>
        </div>
        <div className="bg-slate-900 p-6 rounded-xl border border-emerald-500/20 flex items-center justify-between">
          <div>
            <p className="text-emerald-400 font-bold text-sm">Total de Entradas</p>
            <h2 className="text-2xl font-black text-white">R$ {fmt(totalGeral)}</h2>
          </div>
          <div className="bg-emerald-500/10 p-3 rounded-full text-emerald-400">
            <TrendingUp size={22} />
          </div>
        </div>
      </div>

      {/* Entradas de Inscrições (automático) */}
      <div className="bg-slate-900 rounded-xl border border-slate-800/60 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-1">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <UserCheck className="text-indigo-400" size={18} />
            Entradas de Inscrições
          </h2>
          <span className="text-xs text-slate-500">
            Geradas automaticamente ao confirmar o pagamento do inscrito
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-800">
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Atleta</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Equipe</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Data Inscrição</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paidRunners.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-600">
                    Nenhuma inscrição confirmada ainda. Ao marcar um inscrito como <span className="text-emerald-400 font-bold">PAGO</span> na lista de participantes, a entrada aparece aqui.
                  </td>
                </tr>
              ) : (
                paidRunners.map(runner => (
                  <tr key={runner.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <span className="font-medium text-white">{runner.fullName}</span>
                      {runner.age >= SENIOR_AGE && (
                        <span className="ml-2 inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          <Tag size={9} /> 60+
                        </span>
                      )}
                      {runner.couponCode && (
                        <span
                          className="ml-2 inline-flex items-center gap-1 bg-yellow-400/10 text-yellow-400 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono"
                          title={`Desconto de R$ ${(runner.couponDiscount || 0).toFixed(2)}`}
                        >
                          <Tag size={9} /> {runner.couponCode}
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-slate-400">{runner.teamName}</td>
                    <td className="p-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-500" /> {new Date(runner.registrationDate).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-indigo-400 text-right">+ R$ {fmt(getRunnerPaidValue(runner))}</td>
                  </tr>
                ))
              )}
            </tbody>
            {paidRunners.length > 0 && (
              <tfoot>
                <tr className="bg-indigo-500/10 border-t border-slate-800">
                  <td colSpan={3} className="p-4 text-sm font-bold text-indigo-400 uppercase">Subtotal Inscrições</td>
                  <td className="p-4 font-mono font-black text-indigo-400 text-right">R$ {fmt(totalRegistrations)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <DollarSign className="text-emerald-400" size={20} />
          Receitas Extras ({revenues.length})
        </h2>
        <button
          onClick={() => setIsFormVisible(!isFormVisible)}
          className="bg-slate-800 text-white border border-slate-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-700 transition-all"
        >
          <Plus size={18} /> Nova Entrada
        </button>
      </div>

      {/* Form */}
      {isFormVisible && (
        <form onSubmit={handleSubmit} className="bg-slate-900 p-6 rounded-xl border border-slate-800/60 animate-slide-down">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5 pb-3 border-b border-slate-800">Nova Receita Extra</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            <div className="col-span-1 md:col-span-2">
              <label className={labelCls}>Descrição</label>
              <input
                required type="text"
                className={inputCls}
                placeholder="Ex: Venda de Camisetas Extras"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div>
              <label className={labelCls}>Valor</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                <input
                  required type="number" step="0.01"
                  className={`${inputCls} pl-8`}
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Data</label>
              <input
                type="date" required
                className={`${inputCls} [color-scheme:dark]`}
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>

            <div className="col-span-1 md:col-span-2 lg:col-span-4 pt-3 border-t border-slate-800 flex justify-end gap-3">
              <button type="button" onClick={() => setIsFormVisible(false)} className="px-4 py-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg text-sm font-medium transition-all">
                Cancelar
              </button>
              <button type="submit" className="px-6 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm hover:bg-emerald-600 shadow-lg transition-all">
                Salvar Entrada
              </button>
            </div>
          </div>
        </form>
      )}

      {/* List */}
      <div className="bg-slate-900 rounded-xl border border-slate-800/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-800">
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Descrição</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Data</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Valor</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {revenues.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-slate-600">Nenhuma receita extra registrada.</td></tr>
              ) : (
                revenues.map(rev => (
                  <tr key={rev.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-medium text-white">{rev.description}</td>
                    <td className="p-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-500" /> {new Date(rev.date).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-emerald-400">+ R$ {rev.amount.toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => onDelete(rev.id)} className="text-slate-600 hover:text-red-400 p-2 rounded hover:bg-red-500/10 transition-all">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
