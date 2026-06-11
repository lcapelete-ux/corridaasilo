import React, { useState } from 'react';
import { Expense } from '../types';
import { Plus, Trash2, TrendingDown, Calendar, Tag } from 'lucide-react';

interface ExpensesManagerProps {
  expenses: Expense[];
  onSave: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

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
    setFormData({
      description: '',
      amount: '',
      category: 'Estrutura',
      date: new Date().toISOString().split('T')[0]
    });
    setIsFormVisible(false);
  };

  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-red-100 flex items-center justify-between">
        <div>
          <p className="text-red-500 font-bold text-sm">Total de Despesas</p>
          <h2 className="text-3xl font-black text-slate-800">R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
        </div>
        <div className="bg-red-100 p-3 rounded-full text-red-500">
          <TrendingDown size={24} />
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <TrendingDown className="text-red-500" />
          Despesas ({expenses.length})
        </h2>
        <button 
          onClick={() => setIsFormVisible(!isFormVisible)}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
        >
          <Plus size={18} /> Nova Despesa
        </button>
      </div>

      {/* Form */}
      {isFormVisible && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md border border-slate-200 animate-slide-down">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1">Descrição do Gasto</label>
              <input 
                required
                type="text" 
                className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-red-400 outline-none"
                placeholder="Ex: Aluguel de Tenda"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Valor</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">R$</span>
                <input 
                  required
                  type="number" 
                  step="0.01"
                  className="w-full border border-slate-200 rounded-lg p-2 pl-8 focus:ring-2 focus:ring-red-400 outline-none"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Categoria</label>
              <select 
                className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-red-400 outline-none bg-white"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value as any})}
              >
                <option value="Estrutura">Estrutura</option>
                <option value="Kit">Kit Atleta</option>
                <option value="Marketing">Marketing</option>
                <option value="Premiação">Premiação</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div>
               <label className="block text-xs font-bold text-slate-500 mb-1">Data</label>
               <input 
                  type="date"
                  required
                  className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-red-400 outline-none"
                  value={formData.date}
                  onChange={e => setFormData({...formData, date: e.target.value})}
               />
            </div>

            <div className="col-span-1 md:col-span-2 lg:col-span-4 pt-2 border-t border-slate-100 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => setIsFormVisible(false)}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm font-medium"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="px-6 py-2 bg-red-500 text-white rounded-lg font-bold text-sm hover:bg-red-600 shadow-lg"
              >
                Salvar Despesa
              </button>
            </div>

          </div>
        </form>
      )}

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Descrição</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Categoria</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Data</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Valor</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.length === 0 ? (
               <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhuma despesa registrada.</td></tr>
            ) : (
              expenses.map(expense => (
                <tr key={expense.id} className="hover:bg-slate-50">
                  <td className="p-4 font-medium text-slate-800">{expense.description}</td>
                  <td className="p-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                       <Tag size={12} className="text-slate-400"/> {expense.category}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                       <Calendar size={12} className="text-slate-400"/> {new Date(expense.date).toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-red-500">- R$ {expense.amount.toFixed(2)}</td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => onDelete(expense.id)}
                      className="text-slate-400 hover:text-red-500 p-2 rounded hover:bg-red-50"
                    >
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
  );
};