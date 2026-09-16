import React, { useMemo, useState } from 'react';
import { Runner, ShirtSize } from '../types';
import { escapeHtml as esc, printHtml } from '../services/printReport';
import { EVENT_DATE, formatBrDate } from '../constants';
import { Shirt, Users, AlertCircle, FileDown, Search, CheckCircle, Loader2 } from 'lucide-react';

// Ordem canônica dos tamanhos (mesma do enum ShirtSize)
const SIZES: string[] = [ShirtSize.S, ShirtSize.M, ShirtSize.L, ShirtSize.XL, ShirtSize.XXL];

interface ShirtsManagerProps {
  runners: Runner[];
  onUpdate?: (runner: Runner) => Promise<void> | void;
  raceGroupName?: string;
}

const selectCls = "bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-white focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400 outline-none transition-all [color-scheme:dark]";

const REPORT_STYLE = `
  .header-band { background: linear-gradient(135deg, #0f172a, #1e293b); color: #fff; padding: 24px 28px; border-radius: 14px; margin-bottom: 18px; }
  .header-band .badge { display: inline-block; color: #38bdf8; font-size: 10px; font-weight: 800; letter-spacing: .15em; border: 1px solid rgba(56,189,248,.5); padding: 4px 10px; border-radius: 999px; margin-bottom: 10px; }
  .header-band h1 { color: #fff; margin: 0 0 4px; }
  .header-band .sub { color: #cbd5e1; margin: 0; }
  .chips { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }
  .chip { border: 2px solid #0ea5e9; border-radius: 12px; padding: 10px 18px; text-align: center; min-width: 80px; }
  .chip .n { font-size: 24px; font-weight: 900; color: #0f172a; }
  .chip .t { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; }
  .section-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 18px; margin-bottom: 14px; page-break-inside: avoid; }
  .section-title { font-size: 13px; font-weight: 800; color: #0f172a; margin: 0 0 12px; }
  tfoot td { font-weight: 800; background: #f1f5f9; }
`;

export const ShirtsManager: React.FC<ShirtsManagerProps> = ({ runners, onUpdate, raceGroupName = '2ª CORRIDA NOTURNA LSC' }) => {
  // Camiseta é contrapartida da inscrição paga: o pedido à confecção sai daqui,
  // então o padrão conta só quem pagou. O interruptor mostra o cenário completo
  // para quem quer planejar com os pendentes incluídos.
  const [onlyPaid, setOnlyPaid] = useState(true);
  const [teamFilter, setTeamFilter] = useState('');
  const [busca, setBusca] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [erro, setErro] = useState('');

  const base = useMemo(
    () => (onlyPaid ? runners.filter(r => r.isPaid) : runners),
    [runners, onlyPaid]
  );
  const naoPagos = runners.length - runners.filter(r => r.isPaid).length;

  const teamsPresent = useMemo(
    () => Array.from(new Set(base.map(r => r.teamName).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [base]
  );

  // Tamanhos canônicos + qualquer "exótico" que apareça nos dados
  const sizeColumns = useMemo(() => {
    const extras = Array.from(new Set(base.map(r => r.shirtSize))).filter(s => s && !SIZES.includes(s));
    return [...SIZES, ...extras];
  }, [base]);

  // Resumo por equipe (respeita só o filtro de equipe, não a busca: a busca
  // serve para achar a pessoa na lista de baixo, não para mudar o pedido)
  const resumoBase = useMemo(
    () => base.filter(r => !teamFilter || r.teamName === teamFilter),
    [base, teamFilter]
  );

  const resumo = useMemo(() => {
    const porEquipe = new Map<string, Record<string, number>>();
    const geral: Record<string, number> = {};
    for (const r of resumoBase) {
      const eq = r.teamName || 'Avulso';
      if (!porEquipe.has(eq)) porEquipe.set(eq, {});
      const linha = porEquipe.get(eq)!;
      linha[r.shirtSize] = (linha[r.shirtSize] || 0) + 1;
      geral[r.shirtSize] = (geral[r.shirtSize] || 0) + 1;
    }
    const linhas = Array.from(porEquipe.entries())
      .map(([equipe, counts]) => ({
        equipe,
        counts,
        total: Object.values(counts).reduce((a, b) => a + b, 0),
      }))
      .sort((a, b) => b.total - a.total || a.equipe.localeCompare(b.equipe, 'pt-BR'));
    return { linhas, geral, total: resumoBase.length };
  }, [resumoBase]);

  // Lista para alterar tamanho: equipe + busca por nome/CPF
  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const digitos = q.replace(/\D/g, '');
    return resumoBase
      .filter(r => {
        if (!q) return true;
        return r.fullName.toLowerCase().includes(q)
          || (digitos.length > 0 && r.cpf.replace(/\D/g, '').includes(digitos));
      })
      .sort((a, b) =>
        a.teamName.localeCompare(b.teamName, 'pt-BR') || a.fullName.localeCompare(b.fullName, 'pt-BR')
      );
  }, [resumoBase, busca]);

  const trocarTamanho = async (runner: Runner, tamanho: string) => {
    if (!onUpdate || tamanho === runner.shirtSize) return;
    setSavingId(runner.id);
    setErro('');
    try {
      await onUpdate({ ...runner, shirtSize: tamanho as ShirtSize });
    } catch (e: any) {
      setErro(`${runner.fullName}: ${e?.message || 'não foi possível trocar o tamanho.'}`);
    } finally {
      setSavingId(null);
    }
  };

  const gerarPdf = () => {
    const dataStr = new Date().toLocaleString('pt-BR');
    const filtro = [
      onlyPaid ? 'Somente pagamentos confirmados' : 'Todos os inscritos (inclui pendentes)',
      teamFilter ? `Equipe: ${teamFilter}` : 'Todas as equipes',
    ].join(' · ');

    const chips = sizeColumns.map(s => `
      <div class="chip"><div class="n">${resumo.geral[s] || 0}</div><div class="t">${esc(s)}</div></div>`).join('');

    const linhas = resumo.linhas.map(l => `
      <tr>
        <td>${esc(l.equipe)}</td>
        ${sizeColumns.map(s => `<td class="size">${l.counts[s] || ''}</td>`).join('')}
        <td class="total-col">${l.total}</td>
      </tr>`).join('');

    const html = `
      <div class="header-band">
        <span class="badge">PEDIDO DE CAMISETAS</span>
        <h1>${esc(raceGroupName)}</h1>
        <p class="sub">Data da prova: ${esc(formatBrDate(EVENT_DATE, true))} · ${esc(filtro)} · Gerado em ${esc(dataStr)}</p>
      </div>

      <div class="section-card">
        <div class="section-title">👕 Total por tamanho — ${resumo.total} ${resumo.total === 1 ? 'camiseta' : 'camisetas'}</div>
        <div class="chips">${chips}</div>
      </div>

      <div class="section-card">
        <div class="section-title">🏳️ Por equipe</div>
        <table>
          <thead><tr><th>Equipe</th>${sizeColumns.map(s => `<th class="size">${esc(s)}</th>`).join('')}<th class="size">Total</th></tr></thead>
          <tbody>${linhas || `<tr><td colspan="${sizeColumns.length + 2}">Nenhum inscrito.</td></tr>`}</tbody>
          <tfoot>
            <tr>
              <td>TOTAL</td>
              ${sizeColumns.map(s => `<td class="size">${resumo.geral[s] || 0}</td>`).join('')}
              <td class="total-col">${resumo.total}</td>
            </tr>
          </tfoot>
        </table>
      </div>`;
    printHtml(html, `Camisetas - ${raceGroupName}`, REPORT_STYLE);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabeçalho + total */}
      <div className="bg-slate-900 rounded-xl border border-slate-800/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Shirt className="text-sky-400" size={22} /> Camisetas
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {onlyPaid
                ? 'Contando apenas quem já pagou — é o número que vai para a confecção.'
                : 'Contando todos os inscritos, inclusive quem ainda não pagou.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-xl">
              <Shirt size={18} className="text-sky-400" />
              <span className="text-white font-black text-xl">{resumo.total}</span>
              <span className="text-slate-500 text-sm">no total</span>
            </div>
            <button
              onClick={gerarPdf}
              className="flex items-center gap-2 bg-sky-500/10 text-sky-400 border border-sky-500/30 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-sky-500/20 transition-all"
              title="Gerar o pedido de camisetas em PDF"
            >
              <FileDown size={16} /> Pedido (PDF)
            </button>
          </div>
        </div>

        {/* Chips por tamanho: o número que interessa, grande */}
        <div className="flex flex-wrap gap-2">
          {sizeColumns.map(s => (
            <div key={s} className="bg-slate-800 border border-slate-700 rounded-xl px-5 py-3 text-center min-w-[80px]">
              <div className="text-3xl font-black text-white">{resumo.geral[s] || 0}</div>
              <div className="text-[11px] font-bold text-sky-400 uppercase tracking-wide mt-0.5">{s}</div>
            </div>
          ))}
        </div>

        {onlyPaid && naoPagos > 0 && (
          <div className="mt-4 flex items-start gap-2 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
            <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/90">
              <strong>{naoPagos}</strong> {naoPagos === 1 ? 'inscrito não está' : 'inscritos não estão'} nesta conta porque
              o pagamento ainda não foi confirmado. Ligue o interruptor abaixo para ver o cenário completo.
            </p>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar atleta por nome ou CPF..."
            className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 outline-none transition-all"
          />
        </div>
        <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)} className={`${selectCls} py-3`}>
          <option value="">Todas as equipes</option>
          {teamsPresent.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button
          onClick={() => setOnlyPaid(v => !v)}
          className={`px-4 py-3 rounded-xl font-bold text-sm transition-all shrink-0 border ${
            onlyPaid
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
          }`}
        >
          {onlyPaid ? 'Só pagas ✓' : 'Só pagas'}
        </button>
      </div>

      {erro && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm font-bold flex items-center gap-2">
          <AlertCircle size={16} /> {erro}
        </div>
      )}

      {/* Resumo por equipe */}
      <div className="bg-slate-900 rounded-xl border border-slate-800/60 overflow-hidden">
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="text-indigo-400" size={18} /> Por equipe
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-800">
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase">Equipe</th>
                {sizeColumns.map(s => (
                  <th key={s} className="p-3 text-xs font-semibold text-slate-500 uppercase text-center">{s}</th>
                ))}
                <th className="p-3 text-xs font-semibold text-slate-500 uppercase text-center">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {resumo.linhas.length === 0 ? (
                <tr><td colSpan={sizeColumns.length + 2} className="p-8 text-center text-slate-600">Nenhum inscrito para os filtros.</td></tr>
              ) : resumo.linhas.map(l => (
                <tr key={l.equipe} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-medium text-white">{l.equipe}</td>
                  {sizeColumns.map(s => (
                    <td key={s} className="p-3 text-center text-slate-300">
                      {l.counts[s] || <span className="text-slate-700">·</span>}
                    </td>
                  ))}
                  <td className="p-3 text-center font-bold text-sky-400">{l.total}</td>
                </tr>
              ))}
            </tbody>
            {resumo.linhas.length > 0 && (
              <tfoot>
                <tr className="bg-slate-800/50 border-t border-slate-700">
                  <td className="p-3 font-bold text-white uppercase text-xs">Total</td>
                  {sizeColumns.map(s => (
                    <td key={s} className="p-3 text-center font-bold text-white">{resumo.geral[s] || 0}</td>
                  ))}
                  <td className="p-3 text-center font-black text-sky-400">{resumo.total}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Alterar tamanho, atleta por atleta */}
      {onUpdate && (
        <div className="bg-slate-900 rounded-xl border border-slate-800/60 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Shirt className="text-sky-400" size={18} /> Alterar tamanho ({lista.length})
            </h3>
            <span className="text-xs text-slate-500">
              A troca é gravada na hora e o resumo acima acompanha
            </span>
          </div>
          <div className="divide-y divide-slate-800/60 max-h-[520px] overflow-y-auto">
            {lista.length === 0 ? (
              <p className="p-8 text-center text-slate-600">Nenhum atleta para os filtros.</p>
            ) : lista.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-3.5 hover:bg-slate-800/30 transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white truncate">{r.fullName}</p>
                  <div className="flex flex-wrap items-center gap-x-2 text-xs mt-0.5">
                    <span className="text-indigo-400">{r.teamName || 'Avulso'}</span>
                    <span className="text-slate-600">·</span>
                    <span className="text-slate-500 font-mono">{r.cpf}</span>
                    {!r.isPaid && (
                      <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase text-[10px]">
                        Pgto pendente
                      </span>
                    )}
                  </div>
                </div>
                {savingId === r.id && <Loader2 size={16} className="text-sky-400 animate-spin shrink-0" />}
                <select
                  value={r.shirtSize}
                  disabled={savingId === r.id}
                  onChange={e => trocarTamanho(r, e.target.value)}
                  className={`${selectCls} font-bold shrink-0 disabled:opacity-50`}
                >
                  {sizeColumns.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-600 flex items-start gap-1.5">
        <CheckCircle size={12} className="shrink-0 mt-0.5" />
        O <strong>Pedido (PDF)</strong> sai com os filtros que estiverem valendo — confira o cabeçalho dele antes de mandar para a confecção.
      </p>
    </div>
  );
};
