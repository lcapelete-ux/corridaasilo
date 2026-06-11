import React, { useMemo } from 'react';
import { Runner } from '../types';
import { ArrowLeft, Users, CheckCircle, Clock, Shirt } from 'lucide-react';

interface TeamDetailViewProps {
  teamName: string;
  runners: Runner[];
  onBack: () => void;
}

export const TeamDetailView: React.FC<TeamDetailViewProps> = ({ teamName, runners, onBack }) => {
  
  const stats = useMemo(() => {
    const total = runners.length;
    const paid = runners.filter(r => r.isPaid).length;
    const pending = total - paid;
    
    // Sort alphabetically
    const sortedRunners = [...runners].sort((a, b) => a.fullName.localeCompare(b.fullName));

    return { total, paid, pending, sortedRunners };
  }, [runners]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{teamName}</h2>
          <p className="text-slate-500 text-sm">Detalhamento de membros</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-bold">Total de Membros</p>
            <h3 className="text-3xl font-black text-slate-800">{stats.total}</h3>
          </div>
          <div className="bg-slate-100 p-3 rounded-full text-slate-600">
            <Users size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-emerald-100 flex items-center justify-between">
          <div>
            <p className="text-emerald-600 text-sm font-bold">Inscrições Pagas</p>
            <h3 className="text-3xl font-black text-slate-800">{stats.paid}</h3>
          </div>
          <div className="bg-emerald-100 p-3 rounded-full text-emerald-600">
            <CheckCircle size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-amber-100 flex items-center justify-between">
          <div>
            <p className="text-amber-600 text-sm font-bold">Pagamento Pendente</p>
            <h3 className="text-3xl font-black text-slate-800">{stats.pending}</h3>
          </div>
          <div className="bg-amber-100 p-3 rounded-full text-amber-600">
            <Clock size={24} />
          </div>
        </div>
      </div>

      {/* Members List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-bold text-slate-700">Lista de Atletas</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Nome Completo</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Idade/CPF</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Camiseta</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Status Pagamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.sortedRunners.map((runner) => (
                <tr key={runner.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-slate-800">{runner.fullName}</div>
                    <div className="text-xs text-slate-400">{runner.email}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-sm text-slate-600">{runner.age} anos</div>
                    <div className="text-xs text-slate-400 font-mono">{runner.cpf}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Shirt size={16} className="text-slate-400" />
                      <span className="font-bold text-slate-700">{runner.shirtSize}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    {runner.isPaid ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-xs font-bold">
                        <CheckCircle size={14} /> PAGO
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-md text-xs font-bold">
                        <Clock size={14} /> PENDENTE
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};