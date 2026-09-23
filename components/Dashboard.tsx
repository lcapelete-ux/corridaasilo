
import React, { useMemo } from 'react';
import { Runner, ShirtSize, Expense, Sponsor, ExtraRevenue } from '../types';
import { Users, DollarSign, TrendingDown, Wallet, CheckCircle, Activity, Footprints, Calendar, FileDown, Package, Ticket, Briefcase } from 'lucide-react';
import { SENIOR_AGE, EVENT_DATE, formatBrDate, getRunnerPaidValue, getRegistrationFee, getSponsorBalance, getSponsorPaidAmount, isSponsorSettled } from '../constants';
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
  extraRevenues?: ExtraRevenue[];
  sponsors?: Sponsor[];
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
  .status-pago { color: #047857; font-weight: 700; }
  .status-pendente { color: #b45309; font-weight: 700; }
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

export const Dashboard: React.FC<DashboardProps> = ({ runners, totalRevenue = 0, totalExpenses = 0, totalRegistrationRevenue = 0, totalSponsorRevenue = 0, totalExtraRevenue = 0, expenses = [], extraRevenues = [], sponsors = [], raceGroupName = '2ª CORRIDA NOTURNA LSC' }) => {

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

    // Inscrições por valor: só quem já pagou entra aqui — a soma dos totais
    // bate com a Receita de Inscrições, pra fechar as contas sem buraco.
    // Isento (valor zerado) conta a quantidade, mas o "recebido" é R$ 0 —
    // o valor de tabela que essas vagas representariam fica à parte.
    let inteiraCount = 0, inteiraTotal = 0;
    let meiaCount = 0, meiaTotal = 0;
    let apoiadorCount = 0, apoiadorTotal = 0;
    let cupomCount = 0, cupomTotal = 0;
    let isentoPatrocinioCount = 0, isentoPatrocinioValor = 0;
    let isentoCortesiaCount = 0, isentoCortesiaValor = 0;
    let isentoSemMotivoCount = 0, isentoSemMotivoValor = 0;

    // Cupons: só entre quem já pagou (valor histórico do desconto que de fato
    // saiu, consistente com a Receita de Inscrições acima)
    const couponCounts: Record<string, { count: number; total: number }> = {};
    // Kits: só faz sentido para quem pagou — sem pagamento não tem kit a entregar
    let kitDeliveredCount = 0;
    let kitPendingCount = 0;

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
      if (r.isPaid) {
        paidCount++;
        const valor = getRunnerPaidValue(r);
        if (valor <= 0) {
          const tabela = getRegistrationFee(r.age, r.seniorFullPrice);
          if (r.freeReason === 'patrocinio') { isentoPatrocinioCount++; isentoPatrocinioValor += tabela; }
          else if (r.freeReason === 'cortesia') { isentoCortesiaCount++; isentoCortesiaValor += tabela; }
          else { isentoSemMotivoCount++; isentoSemMotivoValor += tabela; }
        } else if (r.age >= SENIOR_AGE && r.seniorFullPrice) {
          apoiadorCount++; apoiadorTotal += valor;
        } else if (r.age >= SENIOR_AGE) {
          meiaCount++; meiaTotal += valor;
        } else if ((r.couponDiscount || 0) > 0) {
          cupomCount++; cupomTotal += valor;
        } else {
          inteiraCount++; inteiraTotal += valor;
        }
        if (r.couponCode && (r.couponDiscount || 0) > 0) {
          const code = r.couponCode.toUpperCase();
          if (!couponCounts[code]) couponCounts[code] = { count: 0, total: 0 };
          couponCounts[code].count++;
          couponCounts[code].total += r.couponDiscount || 0;
        }
        if (r.kitDelivered) kitDeliveredCount++; else kitPendingCount++;
      }
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

    const valueBreakdown = [
      { key: 'inteira', label: 'Inteira (valor cheio)', count: inteiraCount, total: inteiraTotal },
      { key: 'meia', label: 'Meia-inscrição (60+)', count: meiaCount, total: meiaTotal },
      { key: 'apoiador', label: 'Apoiador 60+ (optou pelo valor cheio)', count: apoiadorCount, total: apoiadorTotal },
      { key: 'cupom', label: 'Com cupom de desconto', count: cupomCount, total: cupomTotal },
      { key: 'isento_patrocinio', label: 'Isento — Patrocínio', count: isentoPatrocinioCount, total: 0 },
      { key: 'isento_cortesia', label: 'Isento — Cortesia', count: isentoCortesiaCount, total: 0 },
      { key: 'isento_sem_motivo', label: 'Isento — Sem motivo registrado', count: isentoSemMotivoCount, total: 0 },
    ];
    const valorRecebidoInscricoes = inteiraTotal + meiaTotal + apoiadorTotal + cupomTotal;
    const isentosCount = isentoPatrocinioCount + isentoCortesiaCount + isentoSemMotivoCount;
    const isentosValorTabela = isentoPatrocinioValor + isentoCortesiaValor + isentoSemMotivoValor;

    const couponSummary = Object.entries(couponCounts)
      .map(([code, v]) => ({ code, count: v.count, total: v.total }))
      .sort((a, b) => b.total - a.total);
    const couponTotalDiscount = couponSummary.reduce((acc, c) => acc + c.total, 0);

    const kitTotal = kitDeliveredCount + kitPendingCount;
    const kitPct = kitTotal ? Math.round((kitDeliveredCount / kitTotal) * 100) : 0;

    return {
      totalRunners, uniqueTeams, sizeCounts, genderData, ageData, sortedTeams,
      topCities, distinctCities, paidCount, pendingCount, pctPaid, avgAge,
      seniorCount, m5, m3, paidNoProofCount, paymentData, modalityData,
      allTeamsSorted, allCitiesSorted, valueBreakdown, valorRecebidoInscricoes,
      isentosCount, isentosValorTabela, isentoPatrocinioCount, isentoCortesiaCount, isentoSemMotivoCount,
      couponSummary, couponTotalDiscount, kitDeliveredCount, kitPendingCount, kitTotal, kitPct,
    };
  }, [runners]);

  // Previsão: patrocínios que ainda vão entrar (parcial ou totalmente
  // pendente). Não é dinheiro fechado — é o que falta receber, para o
  // organizador enxergar o que ainda pode chegar até o fim das contas.
  const sponsorForecast = useMemo(() => {
    const pending = sponsors
      .filter(s => !isSponsorSettled(s))
      .map(s => ({
        sponsor: s,
        recebido: getSponsorBalance(s) < s.amount ? s.amount - getSponsorBalance(s) : 0,
        saldo: getSponsorBalance(s),
        parcelado: !!s.installments?.length,
      }))
      .sort((a, b) => b.saldo - a.saldo);
    const totalAReceber = pending.reduce((acc, x) => acc + x.saldo, 0);
    return { pending, totalAReceber, count: pending.length };
  }, [sponsors]);

  // Visão geral de patrocínios: todos, quitados e pendentes — pendentes
  // primeiro (é o que precisa de ação), depois por valor combinado. Mesma
  // ordenação usada no relatório da tela de Patrocinadores.
  const sponsorOverview = useMemo(() => {
    const ordered = [...sponsors].sort((a, b) => {
      const pa = isSponsorSettled(a), pb = isSponsorSettled(b);
      return pa === pb ? b.amount - a.amount : (pa ? 1 : -1);
    }).map(s => ({
      sponsor: s,
      recebido: getSponsorPaidAmount(s),
      saldo: getSponsorBalance(s),
      quitado: isSponsorSettled(s),
    }));
    const totalCombinado = sponsors.reduce((acc, s) => acc + s.amount, 0);
    const totalRecebido = ordered.reduce((acc, x) => acc + x.recebido, 0);
    return { ordered, totalCombinado, totalRecebido, count: sponsors.length };
  }, [sponsors]);

  // Despesas e receita extra, uma linha por lançamento — auditoria completa
  // para além do resumo por categoria
  const expenseItems = useMemo(
    () => [...expenses].sort((a, b) => a.date.localeCompare(b.date)),
    [expenses]
  );
  const extraRevenueItems = useMemo(
    () => [...extraRevenues].sort((a, b) => a.date.localeCompare(b.date)),
    [extraRevenues]
  );

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

    const valueBreakdownRows = stats.valueBreakdown.map(v => `
      <tr${v.key.startsWith('isento') ? ' style="background:#fffbeb;"' : ''}>
        <td>${esc(v.label)}</td>
        <td class="total-col">${v.count}</td>
        <td class="total-col">${esc(fmtMoney(v.total))}</td>
      </tr>`).join('');

    const sponsorForecastRows = sponsorForecast.pending.map(({ sponsor: s, recebido, saldo, parcelado }) => `
      <tr>
        <td>${esc(s.name)}</td>
        <td>${esc(s.type)}${parcelado ? ' · parcelado' : ''}</td>
        <td class="total-col">${esc(fmtMoney(s.amount))}</td>
        <td class="total-col">${esc(fmtMoney(recebido))}</td>
        <td class="total-col">${esc(fmtMoney(saldo))}</td>
      </tr>`).join('');

    const sponsorOverviewRows = sponsorOverview.ordered.map(({ sponsor: s, recebido, saldo, quitado }) => `
      <tr>
        <td>${esc(s.name)}</td>
        <td>${esc(s.type)}</td>
        <td class="total-col">${esc(fmtMoney(s.amount))}</td>
        <td class="total-col">${esc(fmtMoney(recebido))}</td>
        <td class="total-col">${saldo > 0 ? esc(fmtMoney(saldo)) : '—'}</td>
        <td class="size ${quitado ? 'status-pago' : 'status-pendente'}">${quitado ? '✓ PAGO' : (recebido > 0 ? '◐ PARCIAL' : '✗ PENDENTE')}</td>
      </tr>`).join('');

    const couponRows = stats.couponSummary.map(c => `
      <tr>
        <td>${esc(c.code)}</td>
        <td class="total-col">${c.count}</td>
        <td class="total-col">${esc(fmtMoney(c.total))}</td>
      </tr>`).join('');

    const expenseItemRows = expenseItems.map(e => `
      <tr>
        <td>${esc(formatBrDate(e.date, true))}</td>
        <td>${esc(e.description)}</td>
        <td>${esc(e.category)}</td>
        <td class="total-col">${esc(fmtMoney(e.amount))}</td>
      </tr>`).join('');

    const extraRevenueItemRows = extraRevenueItems.map(e => `
      <tr>
        <td>${esc(formatBrDate(e.date, true))}</td>
        <td>${esc(e.description)}</td>
        <td>${esc(e.category || '—')}</td>
        <td class="total-col">${esc(fmtMoney(e.amount))}</td>
      </tr>`).join('');

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

      <div class="section-card">
        <div class="section-title">🧾 Inscrições por Valor (conferência)</div>
        <table>
          <thead><tr><th>Categoria</th><th class="size">Qtd</th><th class="size">Recebido</th></tr></thead>
          <tbody>${valueBreakdownRows}</tbody>
          <tfoot><tr><td>TOTAL PAGO</td><td class="total-col">${stats.paidCount}</td><td class="total-col">${esc(fmtMoney(stats.valorRecebidoInscricoes))}</td></tr></tfoot>
        </table>
        ${stats.isentosCount > 0 ? `
        <p style="font-size:11px;color:#92400e;margin-top:10px;">
          ⚠️ ${stats.isentosCount} ${stats.isentosCount === 1 ? 'vaga isenta' : 'vagas isentas'}
          (valor de tabela ${esc(fmtMoney(stats.isentosValorTabela))}) não entram na receita acima —
          patrocínio cobre ${stats.isentoPatrocinioCount}, cortesia ${stats.isentoCortesiaCount}${stats.isentoSemMotivoCount > 0 ? `, e <strong>${stats.isentoSemMotivoCount} ainda sem motivo classificado</strong> (ajuste em Corredores)` : ''}.
        </p>` : ''}
        ${stats.pendingCount > 0 ? `<p style="font-size:11px;color:#64748b;margin-top:6px;">${stats.pendingCount} ${stats.pendingCount === 1 ? 'inscrito ainda não confirmou pagamento' : 'inscritos ainda não confirmaram pagamento'} — fora desta tabela.</p>` : ''}
      </div>

      ${couponRows ? `
      <div class="section-card">
        <div class="section-title">🎟️ Cupons de Desconto — Resumo</div>
        <table>
          <thead><tr><th>Código</th><th class="size">Usos</th><th class="size">Desconto concedido</th></tr></thead>
          <tbody>${couponRows}</tbody>
          <tfoot><tr><td>TOTAL</td><td class="total-col">${stats.couponSummary.reduce((a, c) => a + c.count, 0)}</td><td class="total-col">${esc(fmtMoney(stats.couponTotalDiscount))}</td></tr></tfoot>
        </table>
      </div>` : ''}

      <div class="section-card">
        <div class="section-title">🤝 Patrocinadores — Visão Geral (${sponsorOverview.count})</div>
        ${sponsorOverviewRows ? `
        <table>
          <thead><tr><th>Patrocinador</th><th>Tipo</th><th class="size">Combinado</th><th class="size">Recebido</th><th class="size">Saldo</th><th class="size">Status</th></tr></thead>
          <tbody>${sponsorOverviewRows}</tbody>
          <tfoot><tr><td colspan="2">TOTAL</td><td class="total-col">${esc(fmtMoney(sponsorOverview.totalCombinado))}</td><td class="total-col">${esc(fmtMoney(sponsorOverview.totalRecebido))}</td><td colspan="2"></td></tr></tfoot>
        </table>
        ` : `<p style="font-size:12px;color:#475569;">Nenhum patrocinador cadastrado.</p>`}
      </div>

      <div class="section-card">
        <div class="section-title">🔮 Previsão — Patrocínios a Receber</div>
        ${sponsorForecastRows ? `
        <p style="font-size:12px;color:#475569;margin:0 0 10px;">
          Ainda não é receita confirmada — é o que falta entrar dos patrocínios parciais ou pendentes.
        </p>
        <table>
          <thead><tr><th>Patrocinador</th><th>Tipo</th><th class="size">Combinado</th><th class="size">Já recebido</th><th class="size">Saldo previsto</th></tr></thead>
          <tbody>${sponsorForecastRows}</tbody>
          <tfoot><tr><td colspan="4">TOTAL PREVISTO A RECEBER</td><td class="total-col">${esc(fmtMoney(sponsorForecast.totalAReceber))}</td></tr></tfoot>
        </table>
        ` : `<p style="font-size:12px;color:#475569;">Nenhum patrocínio pendente — todos os cadastrados já estão quitados.</p>`}
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

      ${expenseItemRows ? `
      <div class="section-card">
        <div class="section-title">📋 Despesas — Detalhamento (${expenseItems.length})</div>
        <table>
          <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th class="size">Valor</th></tr></thead>
          <tbody>${expenseItemRows}</tbody>
          <tfoot><tr><td colspan="3">TOTAL</td><td class="total-col">${esc(fmtMoney(totalExpenses))}</td></tr></tfoot>
        </table>
      </div>` : ''}

      ${extraRevenueItemRows ? `
      <div class="section-card">
        <div class="section-title">💵 Receita Extra — Detalhamento (${extraRevenueItems.length})</div>
        <table>
          <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th class="size">Valor</th></tr></thead>
          <tbody>${extraRevenueItemRows}</tbody>
          <tfoot><tr><td colspan="3">TOTAL</td><td class="total-col">${esc(fmtMoney(totalExtraRevenue))}</td></tr></tfoot>
        </table>
      </div>` : ''}

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
        <div class="section-title">📦 Entrega de Kits (só quem pagou)</div>
        <table class="mt"><tbody>
          <tr><td>Kits entregues</td><td class="total-col">${stats.kitDeliveredCount}</td></tr>
          <tr><td>Kits ainda pendentes</td><td class="total-col">${stats.kitPendingCount}</td></tr>
          <tr class="highlight-row"><td><strong>Total (pagos)</strong></td><td class="total-col"><strong>${stats.kitTotal} — ${stats.kitPct}% entregue</strong></td></tr>
        </tbody></table>
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

        {/* Inscrições por Valor — para fechar as contas */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800/60 lg:col-span-2">
          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            🧾 Inscrições por Valor
          </h3>
          <p className="text-slate-500 text-xs mb-4">
            Só quem já pagou — a soma bate com a Receita de Inscrições do relatório em PDF.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase">
                <tr className="bg-slate-800/50">
                  <th className="px-4 py-3 rounded-l-lg">Categoria</th>
                  <th className="px-4 py-3 text-right">Qtd</th>
                  <th className="px-4 py-3 text-right rounded-r-lg">Recebido</th>
                </tr>
              </thead>
              <tbody>
                {stats.valueBreakdown.map(v => (
                  <tr key={v.key} className={`border-b border-slate-800/40 last:border-0 hover:bg-slate-800/30 transition-colors ${v.key.startsWith('isento') ? 'bg-amber-500/5' : ''}`}>
                    <td className="px-4 py-3 font-medium text-slate-300">{v.label}</td>
                    <td className="px-4 py-3 text-right text-slate-400">{v.count}</td>
                    <td className="px-4 py-3 text-right font-bold text-white">R$ {v.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))}
                <tr className="bg-yellow-400/10 font-bold border-t border-yellow-400/20">
                  <td className="px-4 py-3 text-yellow-400">TOTAL PAGO</td>
                  <td className="px-4 py-3 text-right text-yellow-400">{stats.paidCount}</td>
                  <td className="px-4 py-3 text-right text-yellow-400">R$ {stats.valorRecebidoInscricoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
          </div>
          {stats.isentosCount > 0 && (
            <p className="text-amber-400/90 text-xs mt-3">
              {stats.isentosCount} {stats.isentosCount === 1 ? 'vaga isenta' : 'vagas isentas'} (valor de tabela R$ {stats.isentosValorTabela.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}) não contam como receita.
              {stats.isentoSemMotivoCount > 0 && <> <strong>{stats.isentoSemMotivoCount} sem motivo classificado</strong> — ajuste em Corredores.</>}
            </p>
          )}
          {stats.pendingCount > 0 && (
            <p className="text-slate-500 text-xs mt-1">{stats.pendingCount} {stats.pendingCount === 1 ? 'inscrito ainda não pagou' : 'inscritos ainda não pagaram'} (fora desta tabela).</p>
          )}
        </div>

        {/* Previsão: patrocínios ainda a receber */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800/60 lg:col-span-2">
          <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            🔮 Previsão — Patrocínios a Receber
          </h3>
          <p className="text-slate-500 text-xs mb-4">
            Ainda não é receita confirmada — é o que falta entrar dos patrocínios parciais ou pendentes.
          </p>
          {sponsorForecast.count > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase">
                  <tr className="bg-slate-800/50">
                    <th className="px-4 py-3 rounded-l-lg">Patrocinador</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3 text-right">Combinado</th>
                    <th className="px-4 py-3 text-right">Já recebido</th>
                    <th className="px-4 py-3 text-right rounded-r-lg">Saldo previsto</th>
                  </tr>
                </thead>
                <tbody>
                  {sponsorForecast.pending.map(({ sponsor: s, recebido, saldo, parcelado }) => (
                    <tr key={s.id} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-300">{s.name}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{s.type}{parcelado ? ' · parcelado' : ''}</td>
                      <td className="px-4 py-3 text-right text-slate-400">R$ {s.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right text-emerald-400">R$ {recebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right font-bold text-amber-400">R$ {saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  <tr className="bg-yellow-400/10 font-bold border-t border-yellow-400/20">
                    <td className="px-4 py-3 text-yellow-400" colSpan={4}>TOTAL PREVISTO A RECEBER</td>
                    <td className="px-4 py-3 text-right text-yellow-400">R$ {sponsorForecast.totalAReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-600 text-sm italic">Nenhum patrocínio pendente — todos os cadastrados já estão quitados.</p>
          )}
        </div>

        {/* Patrocinadores — visão geral (todos, quitados e pendentes) */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800/60 lg:col-span-2">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Briefcase size={18} className="text-yellow-400" /> Patrocinadores — Visão Geral ({sponsorOverview.count})
          </h3>
          {sponsorOverview.count > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase">
                  <tr className="bg-slate-800/50">
                    <th className="px-4 py-3 rounded-l-lg">Patrocinador</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3 text-right">Combinado</th>
                    <th className="px-4 py-3 text-right">Recebido</th>
                    <th className="px-4 py-3 text-right">Saldo</th>
                    <th className="px-4 py-3 text-right rounded-r-lg">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sponsorOverview.ordered.map(({ sponsor: s, recebido, saldo, quitado }) => (
                    <tr key={s.id} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-300">{s.name}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{s.type}</td>
                      <td className="px-4 py-3 text-right text-slate-400">R$ {s.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right text-emerald-400">R$ {recebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right text-slate-400">{saldo > 0 ? `R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}</td>
                      <td className={`px-4 py-3 text-right text-xs font-bold ${quitado ? 'text-emerald-400' : recebido > 0 ? 'text-amber-400' : 'text-red-400'}`}>
                        {quitado ? '✓ PAGO' : recebido > 0 ? '◐ PARCIAL' : '✗ PENDENTE'}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-yellow-400/10 font-bold border-t border-yellow-400/20">
                    <td className="px-4 py-3 text-yellow-400" colSpan={2}>TOTAL</td>
                    <td className="px-4 py-3 text-right text-yellow-400">R$ {sponsorOverview.totalCombinado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 text-right text-yellow-400">R$ {sponsorOverview.totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-600 text-sm italic">Nenhum patrocinador cadastrado.</p>
          )}
        </div>

        {/* Cupons de desconto */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800/60">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Ticket size={18} className="text-yellow-400" /> Cupons de Desconto
          </h3>
          {stats.couponSummary.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase">
                  <tr className="bg-slate-800/50">
                    <th className="px-4 py-3 rounded-l-lg">Código</th>
                    <th className="px-4 py-3 text-right">Usos</th>
                    <th className="px-4 py-3 text-right rounded-r-lg">Desconto</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.couponSummary.map(c => (
                    <tr key={c.code} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-300">{c.code}</td>
                      <td className="px-4 py-3 text-right text-slate-400">{c.count}</td>
                      <td className="px-4 py-3 text-right font-bold text-white">R$ {c.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  <tr className="bg-yellow-400/10 font-bold border-t border-yellow-400/20">
                    <td className="px-4 py-3 text-yellow-400">TOTAL</td>
                    <td className="px-4 py-3 text-right text-yellow-400">{stats.couponSummary.reduce((a, c) => a + c.count, 0)}</td>
                    <td className="px-4 py-3 text-right text-yellow-400">R$ {stats.couponTotalDiscount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-600 text-sm italic">Nenhum cupom usado por quem já pagou.</p>
          )}
        </div>

        {/* Entrega de Kits */}
        <div className="bg-slate-900 p-6 rounded-xl border border-slate-800/60">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Package size={18} className="text-yellow-400" /> Entrega de Kits
          </h3>
          <p className="text-slate-500 text-xs mb-4">Contando só quem já pagou — {stats.kitPct}% entregue.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <tbody>
                <tr className="border-b border-slate-800/40">
                  <td className="px-4 py-3 font-medium text-slate-300">Entregues</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-400">{stats.kitDeliveredCount}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium text-slate-300">Pendentes</td>
                  <td className="px-4 py-3 text-right font-bold text-amber-400">{stats.kitPendingCount}</td>
                </tr>
                <tr className="bg-yellow-400/10 font-bold border-t border-yellow-400/20">
                  <td className="px-4 py-3 text-yellow-400">TOTAL (pagos)</td>
                  <td className="px-4 py-3 text-right text-yellow-400">{stats.kitTotal}</td>
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
