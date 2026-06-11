import React, { useState } from 'react';
import { ExtraRevenue } from '../types';
import { Plus, Trash2, TrendingUp, Calendar, DollarSign } from 'lucide-react';

interface ExtraRevenueManagerProps {
  revenues: ExtraRevenue[];
  onSave: (revenue: ExtraRevenue) => void;
  onDelete: (id: string) => void;
}

export const ExtraRevenueManager: React.FC<ExtraRevenueManagerProps> = ({ revenues, onSave, onDelete }) => {
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
    setFormData({
      description: '',
      amount: '',
      category: 'Venda Extra',
      date: new Date().toISOString().split('T')[0]
    });
    setIsFormVisible(false);
  };

  const totalExtra = revenues.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100 flex items-center justify-between">
        <div>
          <p className="text-emerald-600 font-bold text-sm">Total Receita Extra</p>
          <h2 className="text-3xl font-black text-slate-800">R$ {totalExtra.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
        </div>
        <div className="bg-emerald-100 p-3 rounded-full text-emerald-600">
          <TrendingUp size={24} />
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <DollarSign className="text-emerald-500" />
          Receitas Extras ({revenues.length})
        </h2>
        <button 
          onClick={() => setIsFormVisible(!isFormVisible)}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
        >
          <Plus size={18} /> Nova Entrada
        </button>
      </div>

      {/* Form */}
      {isFormVisible && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md border border-emerald-100 animate-slide-down">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="col-span-1 md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 mb-1">Descrição</label>
              <input 
                required
                type="text" 
                className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-emerald-400 outline-none"
                placeholder="Ex: Venda de Camisetas Extras"
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
                  className="w-full border border-slate-200 rounded-lg p-2 pl-8 focus:ring-2 focus:ring-emerald-400 outline-none"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={e => setFormData({...formData, amount: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Data</label>
               <input 
                  type="date"
                  required
                  className="w-full border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-emerald-400 outline-none"
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
                className="px-6 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm hover:bg-emerald-600 shadow-lg"
              >
                Salvar Entrada
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
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Data</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Valor</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {revenues.length === 0 ? (
               <tr><td colSpan={4} className="p-8 text-center text-slate-400">Nenhuma receita extra registrada.</td></tr>
            ) : (
              revenues.map(rev => (
                <tr key={rev.id} className="hover:bg-slate-50">
                  <td className="p-4 font-medium text-slate-800">{rev.description}</td>
                  <td className="p-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                       <Calendar size={12} className="text-slate-400"/> {new Date(rev.date).toLocaleDateString('pt-BR')}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-bold text-emerald-600">+ R$ {rev.amount.toFixed(2)}</td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => onDelete(rev.id)}
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