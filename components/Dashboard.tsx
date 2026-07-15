
import React, { useMemo } from 'react';
import { Runner, ShirtSize } from '../types';
import { Users, Trophy, DollarSign, TrendingDown, Wallet } from 'lucide-react';
import { StatsCard } from './StatsCard';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface DashboardProps {
  runners: Runner[];
  totalRevenue?: number; // Soma de Inscrições pagas + Patrocínios + Extras
  totalExpenses?: number;
}

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];

export const Dashboard: React.FC<DashboardProps> = ({ runners, totalRevenue = 0, totalExpenses = 0 }) => {
  
  const stats = useMemo(() => {
    const totalRunners = runners.length;
    
    // Shirt Sizes Breakdown
    const sizeCounts: Record<string, number> = {
      [ShirtSize.S]: 0,   // P
      [ShirtSize.M]: 0,   // M
      [ShirtSize.L]: 0,   // G
      [ShirtSize.XL]: 0,  // GG
      [ShirtSize.XXL]: 0, // EXG
    };
    
    // Teams Breakdown
    const teamCounts: Record<string, number> = {};

    runners.forEach(r => {
      // Shirts - Verifica se o tamanho existe no contador (para evitar erros com dados legados)
      if (sizeCounts[r.shirtSize] !== undefined) {
        sizeCounts[r.shirtSize]++;
      } else {
        // Fallback para tamanhos antigos ou desconhecidos
        // Se houver necessidade, poderíamos criar uma categoria 'Outros'
      }
      
      // Teams
      const team = r.teamName || 'Avulso';
      teamCounts[team] = (teamCounts[team] || 0) + 1;
    });

    // Convert Teams to array and sort
    const sortedTeams = Object.entries(teamCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5

    const uniqueTeams = Object.keys(teamCounts).filter(t => t !== 'Avulso').length;

    // Gender data for chart
    const genderData = Object.entries(
      runners.reduce((acc, curr) => {
        acc[curr.gender] = (acc[curr.gender] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }));

    // Age groups
    const ageGroups = {
      '18-29': 0,
      '30-39': 0,
      '40-49': 0,
      '50+': 0
    };
    runners.forEach(r => {
      if (r.age < 30) ageGroups['18-29']++;
      else if (r.age < 40) ageGroups['30-39']++;
      else if (r.age < 50) ageGroups['40-49']++;
      else ageGroups['50+']++;
    });
    const ageData = Object.entries(ageGroups).map(([name, value]) => ({ name, value }));

    return { totalRunners, uniqueTeams, sizeCounts, genderData, ageData, sortedTeams };
  }, [runners]);

  const balance = totalRevenue - totalExpenses;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Total de Inscritos" 
          value={stats.totalRunners} 
          icon={Users} 
          color="bg-indigo-500" 
          description="Atletas cadastrados"
        />
        <StatsCard 
          title="Receita Total"
          value={`R$ ${totalRevenue.toLocaleString('pt-BR', { notation: 'compact' })}`}
          icon={DollarSign}
          color="bg-emerald-500"
          description="Inscrições + Patrocínios + Extras"
        />
        <StatsCard 
          title="Despesas" 
          value={`R$ ${totalExpenses.toLocaleString('pt-BR', { notation: 'compact' })}`} 
          icon={TrendingDown} 
          color="bg-red-500" 
          description="Gastos totais"
        />
        <StatsCard 
          title="Balanço Final" 
          value={`R$ ${balance.toLocaleString('pt-BR', { notation: 'compact' })}`} 
          icon={Wallet} 
          color={balance >= 0 ? "bg-blue-500" : "bg-red-600"}
          description="Lucro líquido"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Resumo de Camisetas */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800/60">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            👕 Resumo de Camisetas
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase">
                <tr className="bg-slate-800/50">
                  <th className="px-4 py-3 rounded-l-lg">Tamanho</th>
                  <th className="px-4 py-3 text-right rounded-r-lg">Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.sizeCounts).map(([size, count]) => (
                  <tr key={size} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-300">{size}</td>
                    <td className="px-4 py-3 text-right font-bold text-white">{count}</td>
                  </tr>
                ))}
                <tr className="bg-yellow-400/10 font-bold border-t border-yellow-400/20">
                  <td className="px-4 py-3 text-yellow-400">TOTAL</td>
                  <td className="px-4 py-3 text-right text-yellow-400">{stats.totalRunners}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumo de Equipes */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800/60">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            🏆 Top Equipes (Inscritos)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase">
                <tr className="bg-slate-800/50">
                  <th className="px-4 py-3 rounded-l-lg">Equipe</th>
                  <th className="px-4 py-3 text-right rounded-r-lg">Atletas</th>
                </tr>
              </thead>
              <tbody>
                {stats.sortedTeams.map((team, idx) => (
                  <tr key={team.name} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-300 flex items-center gap-2">
                      {idx < 3 && <span className="text-xs">{['🥇', '🥈', '🥉'][idx]}</span>}
                      {team.name}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-white">{team.count}</td>
                  </tr>
                ))}
                {stats.sortedTeams.length === 0 && (
                  <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-600">Nenhuma equipe registrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gender Chart */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800/60">
          <h3 className="text-base font-bold text-white mb-4">Distribuição por Gênero</h3>
          <div className="h-64">
            {stats.totalRunners > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stats.genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600">Sem dados ainda</div>
            )}
          </div>
        </div>

        {/* Age Chart */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800/60">
          <h3 className="text-base font-bold text-white mb-4">Faixa Etária</h3>
          <div className="h-64">
            {stats.totalRunners > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.ageData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' }} />
                  <Bar dataKey="value" fill="#facc15" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600">Sem dados ainda</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};