import React, { useState } from 'react';
import { ExtraRevenue, Runner } from '../types';
import { getRunnerPaidValue, SENIOR_AGE, EVENT_DATE, formatBrDate } from '../constants';
import { escapeHtml as esc, printHtml, svgDonut, donutLegend, svgBars } from '../services/printReport';
import { Plus, Trash2, TrendingUp, Calendar, DollarSign, UserCheck, Tag, Pencil, FileDown } from 'lucide-react';
import { ValueAdjustModal } from './ValueAdjustModal';

interface ExtraRevenueManagerProps {
  revenues: ExtraRevenue[];
  runners: Runner[];
  onSave: (revenue: ExtraRevenue) => void;
  onDelete: (id: string) => void;
  onUpdateRunner?: (runner: Runner) => void;
  raceGroupName?: string;
}

// Mesmo padrão visual do relatório de patrocínios
const REPORT_STYLE = `
  .header-band { background: linear-gradient(135deg, #0f172a, #1e293b); color: #fff; padding: 24px 28px; border-radius: 14px; margin-bottom: 18px; }
  .header-band .badge { display: inline-block; color: #34d399; font-size: 10px; font-weight: 800; letter-spacing: .15em; border: 1px solid rgba(52,211,153,.5); padding: 4px 10px; border-radius: 999px; margin-bottom: 10px; }
  .header-band h1 { color: #fff; margin: 0 0 4px; }
  .header-band .sub { color: #cbd5e1; margin: 0; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 18px; }
  .kpi-card { border-radius: 10px; padding: 12px 14px; color: #fff; page-break-inside: avoid; }
  .kpi-card .label { font-size: 9px; text-transform: uppercase; letter-spacing: .06em; opacity: .9; }
  .kpi-card .value { font-size: 17px; font-weight: 900; margin-top: 4px; }
  .section-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; margin-bottom: 14px; page-break-inside: avoid; }
  .section-card table { background: transparent; }
  .section-title { font-size: 13px; font-weight: 800; color: #0f172a; margin: 0 0 12px; }
  .chart-row { display: flex; align-items: center; gap: 28px; justify-content: center; }
  .lista-longa { page-break-inside: auto; }
  tfoot td { font-weight: 800; background: #f1f5f9; }
  .tag { display: inline-block; background: #fef9c3; color: #854d0e; border-radius: 4px; padding: 0 4px; font-size: 9px; font-weight: 700; margin-left: 4px; }
`;

const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none transition-all text-sm";
const labelCls = "block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide";

export const ExtraRevenueManager: React.FC<ExtraRevenueManagerProps> = ({ revenues, runners, onSave, onDelete, onUpdateRunner, raceGroupName = '2ª CORRIDA NOTURNA LSC' }) => {
  const [valueAdjustRunner, setValueAdjustRunner] = useState<Runner | null>(null);
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

  const generatePdf = () => {
    const fmtMoney = (v: number) => `R$ ${fmt(v)}`;
    const dataStr = new Date().toLocaleString('pt-BR');

    // Quanto cada equipe trouxe em inscrições pagas — é o que responde
    // "de onde veio o dinheiro" melhor do que a lista nome por nome
    const porEquipe = new Map<string, { total: number; qtd: number }>();
    for (const r of paidRunners) {
      const eq = r.teamName || 'Avulso';
      const atual = porEquipe.get(eq) || { total: 0, qtd: 0 };
      atual.total += getRunnerPaidValue(r);
      atual.qtd += 1;
      porEquipe.set(eq, atual);
    }
    const equipes = Array.from(porEquipe.entries())
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => b.total - a.total);

    const segmentos = [
      { label: `Inscrições (${paidRunners.length})`, value: totalRegistrations, color: '#6366f1' },
      { label: `Receitas extras (${revenues.length})`, value: totalExtra, color: '#10b981' },
    ].filter(s => s.value > 0);

    const linhasExtras = [...revenues]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(r => `
        <tr>
          <td>${esc(r.description)}</td>
          <td class="size">${esc(formatBrDate(r.date, true))}</td>
          <td class="total-col">${esc(fmtMoney(r.amount))}</td>
        </tr>`).join('');

    const linhasEquipes = equipes.map(e => `
      <tr>
        <td>${esc(e.label)}</td>
        <td class="size">${e.qtd}</td>
        <td class="total-col">${esc(fmtMoney(e.total))}</td>
      </tr>`).join('');

    const linhasInscricoes = paidRunners.map(r => `
      <tr>
        <td>${esc(r.fullName)}${r.couponCode ? `<span class="tag">${esc(r.couponCode)}</span>` : ''}${r.age >= SENIOR_AGE ? '<span class="tag">60+</span>' : ''}</td>
        <td>${esc(r.teamName)}</td>
        <td class="size">${esc(new Date(r.registrationDate).toLocaleDateString('pt-BR'))}</td>
        <td class="total-col">${esc(fmtMoney(getRunnerPaidValue(r)))}</td>
      </tr>`).join('');

    const html = `
      <div class="header-band">
        <span class="badge">RELATÓRIO DE ENTRADAS</span>
        <h1>${esc(raceGroupName)}</h1>
        <p class="sub">Data da prova: ${esc(formatBrDate(EVENT_DATE, true))} · Gerado em ${esc(dataStr)}</p>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card" style="background: linear-gradient(135deg, #6366f1, #4f46e5);">
          <div class="label">Inscrições confirmadas (${paidRunners.length})</div>
          <div class="value">${esc(fmtMoney(totalRegistrations))}</div>
        </div>
        <div class="kpi-card" style="background: linear-gradient(135deg, #10b981, #059669);">
          <div class="label">Receitas extras (${revenues.length})</div>
          <div class="value">${esc(fmtMoney(totalExtra))}</div>
        </div>
        <div class="kpi-card" style="background: linear-gradient(135deg, #0f172a, #334155);">
          <div class="label">Total de entradas</div>
          <div class="value">${esc(fmtMoney(totalGeral))}</div>
        </div>
      </div>

      ${segmentos.length > 0 ? `
      <div class="section-card">
        <div class="section-title">💰 Composição das Entradas</div>
        <div class="chart-row">
          ${svgDonut(segmentos, 160, 22, fmtMoney)}
          <div style="min-width:250px;">${donutLegend(segmentos, fmtMoney)}</div>
        </div>
      </div>` : ''}

      ${equipes.length > 0 ? `
      <div class="section-card">
        <div class="section-title">🏳️ Inscrições por Equipe</div>
        ${svgBars(equipes.slice(0, 10).map(e => ({ label: e.label, value: e.total })), {
          width: 620, labelWidth: 150, valueWidth: 90, color: '#6366f1', valueFormatter: fmtMoney,
        })}
        <table style="margin-top:14px;">
          <thead><tr><th>Equipe</th><th class="size">Inscritos</th><th class="size">Valor</th></tr></thead>
          <tbody>${linhasEquipes}</tbody>
          <tfoot><tr><td>TOTAL</td><td class="size">${paidRunners.length}</td><td class="total-col">${esc(fmtMoney(totalRegistrations))}</td></tr></tfoot>
        </table>
      </div>` : ''}

      <div class="section-card">
        <div class="section-title">➕ Receitas Extras (${revenues.length})</div>
        <table>
          <thead><tr><th>Descrição</th><th class="size">Data</th><th class="size">Valor</th></tr></thead>
          <tbody>${linhasExtras || '<tr><td colspan="3">Nenhuma receita extra registrada.</td></tr>'}</tbody>
          ${revenues.length > 0 ? `<tfoot><tr><td colspan="2">TOTAL</td><td class="total-col">${esc(fmtMoney(totalExtra))}</td></tr></tfoot>` : ''}
        </table>
      </div>

      <div class="section-card lista-longa">
        <div class="section-title">👥 Entradas de Inscrições (${paidRunners.length})</div>
        <table>
          <thead><tr><th>Atleta</th><th>Equipe</th><th class="size">Inscrição</th><th class="size">Valor</th></tr></thead>
          <tbody>${linhasInscricoes || '<tr><td colspan="4">Nenhuma inscrição confirmada ainda.</td></tr>'}</tbody>
          ${paidRunners.length > 0 ? `<tfoot><tr><td colspan="3">SUBTOTAL INSCRIÇÕES</td><td class="total-col">${esc(fmtMoney(totalRegistrations))}</td></tr></tfoot>` : ''}
        </table>
      </div>
    `;
    printHtml(html, `Entradas - ${raceGroupName}`, REPORT_STYLE);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Barra do relatório: cobre a tela inteira (inscrições + extras), por
          isso fica no topo e não junto de uma das tabelas */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-5 rounded-xl border border-slate-800/60">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="text-emerald-400" size={20} /> Entradas
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Inscrições pagas e receitas extras. O PDF traz tudo, com os totais por equipe.
          </p>
        </div>
        <button
          onClick={generatePdf}
          className="bg-slate-800 text-slate-300 border border-slate-700 px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-700 hover:text-white transition-all shrink-0"
          title="Gerar relatório de entradas em PDF"
        >
          <FileDown size={18} /> Relatório (PDF)
        </button>
      </div>

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
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-mono font-bold text-indigo-400">+ R$ {fmt(getRunnerPaidValue(runner))}</span>
                        {onUpdateRunner && (
                          <button
                            onClick={() => setValueAdjustRunner(runner)}
                            className="text-slate-600 hover:text-indigo-400 transition-colors"
                            title="Ajustar valor (desconto/contribuição extra)"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                      </div>
                    </td>
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

      {valueAdjustRunner && onUpdateRunner && (
        <ValueAdjustModal
          runner={valueAdjustRunner}
          onClose={() => setValueAdjustRunner(null)}
          onSave={onUpdateRunner}
        />
      )}
    </div>
  );
};
