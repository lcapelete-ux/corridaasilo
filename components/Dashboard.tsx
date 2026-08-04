
import React, { useMemo } from 'react';
import { Runner, ShirtSize, Expense } from '../types';
import { Users, DollarSign, TrendingDown, Wallet, CheckCircle, Activity, Footprints, Calendar, FileDown } from 'lucide-react';
import { SENIOR_AGE, EVENT_DATE, formatBrDate } from '../constants';
import { StatsCard } from './StatsCard';
import { escapeHtml as esc, printHtml, svgDonut, donutLegend, svgBars } from '../services/printReport';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface DashboardProps {
  runners: Runner[];
  totalRevenue?: number; // Soma de Inscrições pagas + Patrocínios + Extras
  totalExpenses?: number;
  totalRegistrationRevenue?: number;
  totalSponsorRevenue?: number;
  totalExtraRevenue?: number;
  expenses?: Expense[];
  raceGroupName?: string;
}

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];
const tooltipStyle = { backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f1f5f9' } as const;

// CSS extra do relatório em PDF (colorido, cards e gráficos) — somado ao
// estilo base de printHtml, que cobre só tabelas simples.
const REPORT_STYLE = `
  .header-band { background: linear-gradient(135deg, #0f172a, #1e293b); color: #fff; padding: 24px 28px; border-radius: 14px; margin-bottom: 18px; }
  .header-band .badge { display: inline-block; color: #facc15; font-size: 10px; font-weight: 800; letter-spacing: .15em; border: 1px solid rgba(250,204,21,.5); padding: 4px 10px; border-radius: 999px; margin-bottom: 10px; }
  .header-band h1 { color: #fff; margin: 0 0 4px; }
  .header-band .sub { color: #cbd5e1; margin: 0; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
  .kpi-card { border-radius: 10px; padding: 12px 14px; color: #fff; page-break-inside: avoid; }
  .kpi-card .label { font-size: 9px; text-transform: uppercase; letter-spacing: .06em; opacity: .9; }
  .kpi-card .value { font-size: 17px; font-weight: 900; margin-top: 4px; }
  .section-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; margin-bottom: 14px; page-break-inside: avoid; }
  .section-card table { background: transparent; }
  .section-title { font-size: 13px; font-weight: 800; color: #0f172a; margin: 0 0 12px; }
  .two-col { display: grid; grid-template-columns: 1.2fr 1fr; gap: 18px; align-items: center; }
  .three-col { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
  .chart-block .chart-label { font-size: 11px; font-weight: 700; color: #475569; text-align: center; margin: 0 0 8px; }
  .chart-row { display: flex; flex-direction: column; align-items: center; gap: 10px; }
  table.mt { margin-top: 14px; }
  .highlight-row td { background: #fef9c3 !important; }
`;

// Donut com total no centro e legenda com contagem/percentual ao lado
const DonutCard: React.FC<{ title: string; data: { name: string; value: number }[]; colors: string[]; total: number }> = ({ title, data, colors, total }) => (
  <div className="bg-slate-900 p-6 rounded-xl border border-slate-800/60">
    <h3 className="text-base font-bold text-white mb-4">{title}</h3>
    {total > 0 ? (
      <div className="flex items-center gap-5">
        <div className="h-40 w-40 shrink-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value">
                {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-3xl font-black text-white leading-none">{total}</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">total</span>
          </div>
        </div>
        <div className="flex-1 space-y-2.5">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: colors[i % colors.length] }} />
                {d.name}
              </span>
              <span className="font-bold text-white">
                {d.value} <span className="text-slate-500 text-xs font-normal">({total ? Math.round((d.value / total) * 100) : 0}%)</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    ) : (
      <div className="h-40 flex items-center justify-center text-slate-600">Sem dados ainda</div>
    )}
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ runners, totalRevenue = 0, totalExpenses = 0, totalRegistrationRevenue = 0, totalSponsorRevenue = 0, totalExtraRevenue = 0, expenses = [], raceGroupName = '2ª CORRIDA NOTURNA LSC' }) => {

  const stats = useMemo(() => {
    const totalRunners = runners.length;

    // Camisetas
    const sizeCounts: Record<string, number> = {
      [ShirtSize.S]: 0,   // P
      [ShirtSize.M]: 0,   // M
      [ShirtSize.L]: 0,   // G
      [ShirtSize.XL]: 0,  // GG
      [ShirtSize.XXL]: 0, // EXG
    };

    const teamCounts: Record<string, number> = {};
    const cityCounts: Record<string, { name: string; count: number }> = {};

    let sumAge = 0;
    let paidCount = 0;
    let paidNoProofCount = 0;
    let m5 = 0;
    let m3 = 0;
    let seniorCount = 0;

    runners.forEach(r => {
      if (sizeCounts[r.shirtSize] !== undefined) sizeCounts[r.shirtSize]++;

      const team = r.teamName || 'Avulso';
      teamCounts[team] = (teamCounts[team] || 0) + 1;

      const city = (r.city || '').trim();
      if (city) {
        const key = city.toLowerCase();
        if (!cityCounts[key]) cityCounts[key] = { name: city, count: 0 };
        cityCounts[key].count++;
      }

      sumAge += r.age || 0;
      if (r.isPaid) paidCount++;
      if (r.paidNoProof && !r.isPaid) paidNoProofCount++;
      if (r.modality === '3k') m3++; else m5++;
      if (r.age >= SENIOR_AGE) seniorCount++;
    });

    const allTeamsSorted = Object.entries(teamCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    const sortedTeams = allTeamsSorted.slice(0, 5);

    const uniqueTeams = Object.keys(teamCounts).filter(t => t !== 'Avulso').length;

    const genderData = Object.entries(
      runners.reduce((acc, curr) => {
        acc[curr.gender] = (acc[curr.gender] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([name, value]) => ({ name, value }));

    const ageGroups = { '18-29': 0, '30-39': 0, '40-49': 0, '50-59': 0, '60+': 0 };
    runners.forEach(r => {
      if (r.age < 30) ageGroups['18-29']++;
      else if (r.age < 40) ageGroups['30-39']++;
      else if (r.age < 50) ageGroups['40-49']++;
      else if (r.age < 60) ageGroups['50-59']++;
      else ageGroups['60+']++;
    });
    const ageData = Object.entries(ageGroups).map(([name, value]) => ({ name, value }));

    const allCitiesSorted = Object.values(cityCounts).sort((a, b) => b.count - a.count);
    const topCities = allCitiesSorted.slice(0, 8);
    const distinctCities = Object.keys(cityCounts).length;

    const pendingCount = totalRunners - paidCount;
    const pctPaid = totalRunners ? Math.round((paidCount / totalRunners) * 100) : 0;
    const avgAge = totalRunners ? Math.round(sumAge / totalRunners) : 0;

    const paymentData = [
      { name: 'Pagos', value: paidCount },
      { name: 'Pendentes', value: pendingCount },
    ];
    const modalityData = [
      { name: 'Corrida 5 km', value: m5 },
      { name: 'Caminhada 3 km', value: m3 },
    ];

    return {
      totalRunners, uniqueTeams, sizeCounts, genderData, ageData, sortedTeams,
      topCities, distinctCities, paidCount, pendingCount, pctPaid, avgAge,
      seniorCount, m5, m3, paidNoProofCount, paymentData, modalityData,
      allTeamsSorted, allCitiesSorted,
    };
  }, [runners]);

  const balance = totalRevenue - totalExpenses;
  const PAYMENT_COLORS = ['#10b981', '#f59e0b'];
  const MODALITY_COLORS = ['#6366f1', '#0ea5e9'];

  const generatePdf = () => {
    const fmtMoney = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    const dataStr = new Date().toLocaleString('pt-BR');
    const CYCLE = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6', '#0ea5e9', '#ef4444', '#14b8a6'];
    const withCycleColors = (items: { name: string; count: number }[]) =>
      items.map((it, i) => ({ label: it.name, value: it.count, color: CYCLE[i % CYCLE.length] }));

    const expensesByCategory = new Map<string, number>();
    expenses.forEach(e => expensesByCategory.set(e.category, (expensesByCategory.get(e.category) || 0) + e.amount));
    const expenseEntries = Array.from(expensesByCategory.entries()).sort((a, b) => b[1] - a[1]);
    const expenseCategoryRows = expenseEntries
      .map(([cat, amount]) => `<tr><td>${esc(cat)}</td><td class="total-col">${esc(fmtMoney(amount))}</td></tr>`)
      .join('');

    const paymentSegments = [
      { label: 'Pagos', value: stats.paidCount, color: '#10b981' },
      { label: 'Pendentes', value: stats.pendingCount, color: '#f59e0b' },
    ];
    const modalitySegments = [
      { label: 'Corrida 5 km', value: stats.m5, color: '#6366f1' },
      { label: 'Caminhada 3 km', value: stats.m3, color: '#0ea5e9' },
    ];
    const genderSegments = stats.genderData.map((g, i) => ({ label: g.name, value: g.value, color: [COLORS[0], COLORS[1]][i % 2] }));

    const balanceColor = balance >= 0 ? '#3b82f6, #2563eb' : '#ef4444, #dc2626';

    const html = `
      <div class="header-band">
        <span class="badge">RELATÓRIO OFICIAL</span>
        <h1>${esc(raceGroupName)}</h1>
        <p class="sub">Data da prova: ${esc(formatBrDate(EVENT_DATE, true))} · Gerado em ${esc(dataStr)}</p>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card" style="background: linear-gradient(135deg, #6366f1, #4f46e5);">
          <div class="label">Total de Inscritos</div>
          <div class="value">${stats.totalRunners}</div>
        </div>
        <div class="kpi-card" style="background: linear-gradient(135deg, #10b981, #059669);">
          <div class="label">Receita Total</div>
          <div class="value">${esc(fmtMoney(totalRevenue))}</div>
        </div>
        <div class="kpi-card" style="background: linear-gradient(135deg, #ef4444, #dc2626);">
          <div class="label">Despesas</div>
          <div class="value">${esc(fmtMoney(totalExpenses))}</div>
        </div>
        <div class="kpi-card" style="background: linear-gradient(135deg, ${balanceColor});">
          <div class="label">Balanço Final</div>
          <div class="value">${esc(fmtMoney(balance))}</div>
        </div>
      </div>

      <div class="section-card">
        <div class="section-title">💰 Resumo Financeiro</div>
        <table><tbody>
          <tr><td>Receita de Inscrições</td><td class="total-col">${esc(fmtMoney(totalRegistrationRevenue))}</td></tr>
          <tr><td>Receita de Patrocínios</td><td class="total-col">${esc(fmtMoney(totalSponsorRevenue))}</td></tr>
          <tr><td>Receita Extra</td><td class="total-col">${esc(fmtMoney(totalExtraRevenue))}</td></tr>
          <tr class="highlight-row"><td><strong>Receita Total</strong></td><td class="total-col"><strong>${esc(fmtMoney(totalRevenue))}</strong></td></tr>
          <tr><td>Despesas Totais</td><td class="total-col">${esc(fmtMoney(totalExpenses))}</td></tr>
          <tr class="highlight-row"><td><strong>Balanço Final</strong></td><td class="total-col"><strong>${esc(fmtMoney(balance))}</strong></td></tr>
        </tbody></table>
      </div>

      ${expenseCategoryRows ? `
      <div class="section-card">
        <div class="section-title">📊 Despesas por Categoria</div>
        <div class="two-col">
          <table><thead><tr><th>Categoria</th><th class="size">Valor</th></tr></thead><tbody>${expenseCategoryRows}</tbody></table>
          ${svgBars(expenseEntries.map(([cat, amount], i) => ({ label: cat, value: amount, color: CYCLE[i % CYCLE.length] })), { width: 300, labelWidth: 80, valueWidth: 90, color: '#ef4444', valueFormatter: (v) => fmtMoney(v) })}
        </div>
      </div>
      ` : ''}

      <div class="section-card">
        <div class="section-title">🏅 Participação</div>
        <div class="three-col">
          <div class="chart-block">
            <p class="chart-label">Status de Pagamento</p>
            <div class="chart-row">${svgDonut(paymentSegments, 150, 22)}<div>${donutLegend(paymentSegments)}</div></div>
          </div>
          <div class="chart-block">
            <p class="chart-label">Modalidade</p>
            <div class="chart-row">${svgDonut(modalitySegments, 150, 22)}<div>${donutLegend(modalitySegments)}</div></div>
          </div>
          <div class="chart-block">
            <p class="chart-label">Gênero</p>
            <div class="chart-row">${svgDonut(genderSegments, 150, 22)}<div>${donutLegend(genderSegments)}</div></div>
          </div>
        </div>
        <table class="mt"><tbody>
          <tr><td>Idade Média</td><td class="total-col">${stats.avgAge} anos</td></tr>
          <tr><td>Atletas 60+</td><td class="total-col">${stats.seniorCount}</td></tr>
          <tr><td>Equipes</td><td class="total-col">${stats.uniqueTeams}</td></tr>
          <tr><td>Cidades</td><td class="total-col">${stats.distinctCities}</td></tr>
        </tbody></table>
      </div>

      <div class="section-card">
        <div class="section-title">🎂 Faixa Etária</div>
        ${svgBars(stats.ageData.map(a => ({ label: `${a.name} anos`, value: a.value })), { color: '#8b5cf6' })}
      </div>

      <div class="section-card">
        <div class="section-title">👕 Camisetas por Tamanho</div>
        ${svgBars(Object.entries(stats.sizeCounts).map(([size, count]) => ({ label: size, value: count })), { color: '#f59e0b', labelWidth: 60 })}
      </div>

      <div class="section-card">
        <div class="section-title">🏆 Inscritos por Equipe</div>
        ${svgBars(withCycleColors(stats.allTeamsSorted))}
      </div>

      <div class="section-card">
        <div class="section-title">📍 Inscritos por Cidade</div>
        ${svgBars(withCycleColors(stats.allCitiesSorted))}
      </div>
    `;
    printHtml(html, `Relatório - ${raceGroupName}`, REPORT_STYLE);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Ação: baixar relatório completo */}
      <div className="flex justify-end">
        <button
          onClick={generatePdf}
          className="flex items-center gap-2 bg-yellow-400 text-slate-900 px-4 py-2.5 rounded-lg font-bold text-sm hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20"
        >
          <FileDown size={18} /> Baixar Relatório (PDF)
        </button>
      </div>

      {/* Linha 1 — Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total de Inscritos"
          value={stats.totalRunners}
          icon={Users}
          color="bg-indigo-500"
          description={`${stats.uniqueTeams} equipe(s) • ${stats.distinctCities} cidade(s)`}
        />
        <StatsCard
          title="Receita Total"
          value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
          color="bg-emerald-500"
          description="Inscrições + Patrocínios + Extras"
        />
        <StatsCard
          title="Despesas"
          value={`R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={TrendingDown}
          color="bg-red-500"
          description="Gastos totais"
        />
        <StatsCard
          title="Balanço Final"
          value={`R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={Wallet}
          color={balance >= 0 ? "bg-blue-500" : "bg-red-600"}
          description="Lucro líquido"
        />
      </div>

      {/* Linha 2 — Participação */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Pagamentos Confirmados"
          value={`${stats.paidCount}/${stats.totalRunners}`}
          icon={CheckCircle}
          color="bg-emerald-500"
          description={`${stats.pctPaid}% confirmado • ${stats.pendingCount} pendente(s)`}
        />
        <StatsCard
          title="Corrida 5 km"
          value={stats.m5}
          icon={Activity}
          color="bg-indigo-500"
          description="Atletas na corrida"
        />
        <StatsCard
          title="Caminhada 3 km"
          value={stats.m3}
          icon={Footprints}
          color="bg-sky-500"
          description="Atletas na caminhada"
        />
        <StatsCard
          title="Idade Média"
          value={stats.avgAge}
          icon={Calendar}
          color="bg-fuchsia-500"
          description={`anos • ${stats.seniorCount} atleta(s) 60+`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Status de Pagamento */}
        <DonutCard title="Status de Pagamento" data={stats.paymentData} colors={PAYMENT_COLORS} total={stats.totalRunners} />

        {/* Modalidade */}
        <DonutCard title="Modalidade" data={stats.modalityData} colors={MODALITY_COLORS} total={stats.totalRunners} />

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

        {/* Top Cidades */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800/60">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            📍 Top Cidades
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase">
                <tr className="bg-slate-800/50">
                  <th className="px-4 py-3 rounded-l-lg">Cidade</th>
                  <th className="px-4 py-3 text-right rounded-r-lg">Atletas</th>
                </tr>
              </thead>
              <tbody>
                {stats.topCities.map((c, idx) => (
                  <tr key={c.name} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-300 flex items-center gap-2">
                      {idx < 3 && <span className="text-xs">{['🥇', '🥈', '🥉'][idx]}</span>}
                      {c.name}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-white">{c.count}</td>
                  </tr>
                ))}
                {stats.topCities.length === 0 && (
                  <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-600">Nenhuma cidade registrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

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

        {/* Gênero */}
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
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-600">Sem dados ainda</div>
            )}
          </div>
        </div>

        {/* Faixa Etária (largura total) */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800/60 lg:col-span-2">
          <h3 className="text-base font-bold text-white mb-4">Faixa Etária</h3>
          <div className="h-64">
            {stats.totalRunners > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.ageData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={tooltipStyle} />
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
