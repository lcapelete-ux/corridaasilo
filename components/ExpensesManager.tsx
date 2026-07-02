import React, { useState } from 'react';
import { Expense } from '../types';
import { Plus, Trash2, TrendingDown, Calendar, Tag } from 'lucide-react';

interface ExpensesManagerProps {
  expenses: Expense[];
  onSave: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-red-500/40 focus:border-red-500 outline-none transition-all text-sm";
const selectCls = "w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-red-500/40 focus:border-red-500 outline-none transition-all text-sm [color-scheme:dark]";
const labelCls = "block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide";

export const ExpensesManager: React.FC<ExpensesManagerProps> = ({ expenses, onSave, onDelete }) => {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'Estrutura' as Expense['category'],
    date: new Date().toISOString().split('T')[0]
  });

  const [isFormVisible, setIsFormVisible] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;

    const newExpense: Expense = {
      id: crypto.randomUUID(),
      description: formData.description,
      amount: parseFloat(formData.amount),
      category: formData.category,
      date: formData.date
    };

    onSave(newExpense);
    setFormData({ description: '', amount: '', category: 'Estrutura', date: new Date().toISOString().split('T')[0] });
    setIsFormVisible(false);
  };

  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="bg-slate-900 p-6 rounded-xl border border-red-500/20 flex items-center justify-between">
        <div>
          <p className="text-red-400 font-bold text-sm">Total de Despesas</p>
          <h2 className="text-3xl font-black text-white">R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
        </div>
        <div className="bg-red-500/10 p-3 rounded-full text-red-400">
          <TrendingDown size={24} />
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <TrendingDown className="text-red-400" size={20} />
          Despesas ({expenses.length})
        </h2>
        <button
          onClick={() => setIsFormVisible(!isFormVisible)}
          className="bg-slate-800 text-white border border-slate-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-700 transition-all"
        >
          <Plus size={18} /> Nova Despesa
        </button>
      </div>

      {/* Form */}
      {isFormVisible && (
        <form onSubmit={handleSubmit} className="bg-slate-900 p-6 rounded-xl border border-slate-800/60 animate-slide-down">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5 pb-3 border-b border-slate-800">Nova Despesa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            <div className="col-span-1 md:col-span-2">
              <label className={labelCls}>Descrição do Gasto</label>
              <input
                required type="text"
                className={inputCls}
                placeholder="Ex: Aluguel de Tenda"
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
              <label className={labelCls}>Categoria</label>
              <select className={selectCls} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})}>
                <option value="Estrutura">Estrutura</option>
                <option value="Kit">Kit Atleta</option>
                <option value="Marketing">Marketing</option>
                <option value="Premiação">Premiação</option>
                <option value="Outros">Outros</option>
              </select>
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
              <button type="submit" className="px-6 py-2 bg-red-500 text-white rounded-lg font-bold text-sm hover:bg-red-600 shadow-lg transition-all">
                Salvar Despesa
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
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Categoria</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Data</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Valor</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {expenses.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-600">Nenhuma despesa registrada.</td></tr>
              ) : (
                expenses.map(expense => (
                  <tr key={expense.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-medium text-white">{expense.description}</td>
                    <td className="p-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Tag size={12} className="text-slate-500" /> {expense.category}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} className="text-slate-500" /> {new Date(expense.date).toLocaleDateString('pt-BR')}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-red-400">- R$ {expense.amount.toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => onDelete(expense.id)} className="text-slate-600 hover:text-red-400 p-2 rounded hover:bg-red-500/10 transition-all">
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
