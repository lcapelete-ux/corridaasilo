import React, { useEffect, useMemo, useState } from 'react';
import { Package, Search, CheckCircle, Clock, RotateCcw, Users, AlertCircle, PackageCheck, FileText, List, Shirt } from 'lucide-react';
import { listKitRunners, setKitDelivered, KitRunner } from '../services/storageService';

// Ordem canônica dos tamanhos (mesma do enum ShirtSize)
const SIZES = ['P', 'M', 'G', 'GG', 'EXG'];

// Escapa texto para montar o HTML do PDF com segurança
const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

const modalityText = (m?: string) => (m === '3k' ? 'Caminhada 3 km' : 'Corrida 5 km');

// Imprime um HTML isolado num iframe oculto → o usuário escolhe "Salvar como PDF"
const printHtml = (bodyHtml: string, title: string) => {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) { iframe.remove(); return; }
  doc.open();
  doc.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)}</title>
    <style>
      @page { size: A4; margin: 14mm; }
      * { box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; }
      h1 { font-size: 18px; margin: 0 0 2px; }
      .sub { font-size: 12px; color: #475569; margin: 0 0 14px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
      th { background: #f1f5f9; text-transform: uppercase; font-size: 10px; letter-spacing: .04em; }
      td.num, th.num { text-align: center; width: 34px; }
      td.size, th.size { text-align: center; }
      .sig { width: 150px; }
      tr:nth-child(even) td { background: #f8fafc; }
      tfoot td { font-weight: bold; background: #f1f5f9; }
      .total-col { text-align: center; font-weight: bold; }
    </style></head><body>${bodyHtml}</body></html>`);
  doc.close();
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch { /* ignora: alguns ambientes bloqueiam impressão */ }
    setTimeout(() => iframe.remove(), 1500);
  }, 300);
};

export const KitDelivery: React.FC = () => {
  const [runners, setRunners] = useState<KitRunner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [onlyPending, setOnlyPending] = useState(false);

  // Visualização + filtros
  const [viewMode, setViewMode] = useState<'lista' | 'resumo'>('lista');
  const [teamFilter, setTeamFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setRunners(await listKitRunners());
    } catch (e: any) {
      setError(e?.message || 'Não foi possível carregar os atletas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleToggle = async (r: KitRunner) => {
    const next = !r.kitDelivered;
    setBusyId(r.id);
    setRunners(prev => prev.map(x => x.id === r.id ? { ...x, kitDelivered: next } : x));
    try {
      await setKitDelivered(r.id, next);
    } catch (e: any) {
      setRunners(prev => prev.map(x => x.id === r.id ? { ...x, kitDelivered: !next } : x));
      alert(e?.message || 'Erro ao registrar a entrega.');
    } finally {
      setBusyId(null);
    }
  };

  const delivered = runners.filter(r => r.kitDelivered).length;
  const total = runners.length;
  const pct = total > 0 ? Math.round((delivered / total) * 100) : 0;

  // Equipes presentes (para o filtro)
  const teamsPresent = useMemo(
    () => Array.from(new Set(runners.map(r => r.teamName).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [runners]
  );

  // Lista para a aba "Lista" (respeita busca, só pendentes, equipe e tamanho)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return runners.filter(r => {
      if (onlyPending && r.kitDelivered) return false;
      if (teamFilter && r.teamName !== teamFilter) return false;
      if (sizeFilter && r.shirtSize !== sizeFilter) return false;
      if (!q) return true;
      const nameMatch = r.fullName.toLowerCase().includes(q);
      const cpfMatch = digits.length > 0 && r.cpf.replace(/\D/g, '').includes(digits);
      return nameMatch || cpfMatch;
    });
  }, [runners, query, onlyPending, teamFilter, sizeFilter]);

  // Base do resumo: respeita equipe e "só pendentes" (não usa busca/tamanho,
  // para mostrar sempre a distribuição completa de tamanhos)
  const summaryBase = useMemo(
    () => runners.filter(r => (!teamFilter || r.teamName === teamFilter) && (!onlyPending || !r.kitDelivered)),
    [runners, teamFilter, onlyPending]
  );

  // Colunas de tamanho: as canônicas + qualquer tamanho "exótico" que apareça
  const sizeColumns = useMemo(() => {
    const extras = Array.from(new Set(summaryBase.map(r => r.shirtSize)))
      .filter(s => s && !SIZES.includes(s));
    return [...SIZES, ...extras];
  }, [summaryBase]);

  // Resumo por equipe: { team, counts: {tamanho: n}, total }
  const summary = useMemo(() => {
    const byTeam = new Map<string, { counts: Record<string, number>; total: number }>();
    const grand: Record<string, number> = {};
    let grandTotal = 0;
    for (const r of summaryBase) {
      const team = r.teamName || 'Avulso';
      if (!byTeam.has(team)) byTeam.set(team, { counts: {}, total: 0 });
      const entry = byTeam.get(team)!;
      entry.counts[r.shirtSize] = (entry.counts[r.shirtSize] || 0) + 1;
      entry.total += 1;
      grand[r.shirtSize] = (grand[r.shirtSize] || 0) + 1;
      grandTotal += 1;
    }
    const rows = Array.from(byTeam.entries())
      .map(([team, v]) => ({ team, ...v }))
      .sort((a, b) => a.team.localeCompare(b.team, 'pt-BR'));
    return { rows, grand, grandTotal };
  }, [summaryBase]);

  // Rótulo dos filtros ativos (vai no cabeçalho do PDF)
  const filterLabel = () => {
    const parts: string[] = [];
    parts.push(teamFilter ? `Equipe: ${teamFilter}` : 'Todas as equipes');
    if (sizeFilter && viewMode === 'lista') parts.push(`Tamanho: ${sizeFilter}`);
    if (onlyPending) parts.push(viewMode === 'lista' ? 'Somente kits pendentes' : 'Somente tamanhos ainda não entregues');
    return parts.join(' · ');
  };

  const generatePdf = () => {
    const dataStr = new Date().toLocaleString('pt-BR');
    if (viewMode === 'resumo') {
      const head = `<tr><th>Equipe</th>${sizeColumns.map(s => `<th class="size">${esc(s)}</th>`).join('')}<th class="size">Total</th></tr>`;
      const body = summary.rows.map(row =>
        `<tr><td>${esc(row.team)}</td>${sizeColumns.map(s => `<td class="size">${row.counts[s] || ''}</td>`).join('')}<td class="total-col">${row.total}</td></tr>`
      ).join('');
      const foot = `<tr><td>TOTAL GERAL</td>${sizeColumns.map(s => `<td class="size">${summary.grand[s] || 0}</td>`).join('')}<td class="total-col">${summary.grandTotal}</td></tr>`;
      const html = `
        <h1>Resumo de Camisetas — Entrega de Kits</h1>
        <p class="sub">2ª Corrida Noturna LSC · ${esc(filterLabel())} · Gerado em ${esc(dataStr)}</p>
        <table><thead>${head}</thead><tbody>${body || `<tr><td colspan="${sizeColumns.length + 2}">Nenhum atleta.</td></tr>`}</tbody><tfoot>${foot}</tfoot></table>`;
      printHtml(html, 'Resumo de Camisetas - Kits');
      return;
    }
    // Lista de retirada
    const rows = filtered.map((r, i) =>
      `<tr>
        <td class="num">${i + 1}</td>
        <td>${esc(r.fullName)}</td>
        <td>${esc(r.teamName || 'Avulso')}</td>
        <td class="size">${esc(r.shirtSize)}</td>
        <td class="sig"></td>
      </tr>`
    ).join('');
    const html = `
      <h1>Lista de Retirada de Kits</h1>
      <p class="sub">2ª Corrida Noturna LSC · ${esc(filterLabel())} · ${filtered.length} atleta(s) · Gerado em ${esc(dataStr)}</p>
      <table>
        <thead><tr><th class="num">Nº</th><th>Nome Completo</th><th>Equipe</th><th class="size">Camiseta</th><th class="sig">Assinatura</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5">Nenhum atleta para os filtros selecionados.</td></tr>'}</tbody>
      </table>`;
    printHtml(html, 'Lista de Retirada de Kits');
  };

  const selectCls = "bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-white focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400 outline-none transition-all [color-scheme:dark]";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header + progresso */}
      <div className="bg-slate-900 rounded-xl border border-slate-800/60 p-6">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="text-yellow-400" size={22} /> Entrega de Kits
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-xl">
              <PackageCheck size={18} className="text-emerald-400" />
              <span className="text-white font-bold text-lg">{delivered}</span>
              <span className="text-slate-500">/ {total} entregues</span>
            </div>
            <button
              onClick={generatePdf}
              className="flex items-center gap-2 bg-yellow-400 text-slate-900 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20"
              title="Gerar PDF conforme a visualização e os filtros atuais"
            >
              <FileText size={16} /> Gerar PDF
            </button>
          </div>
        </div>
        <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          O <strong className="text-slate-300">Gerar PDF</strong> segue a visualização (Lista ou Resumo) e os filtros escolhidos abaixo.
        </p>
      </div>

      {/* Alternância de visualização */}
      <div className="flex gap-1 bg-slate-800/60 p-1 rounded-lg w-fit">
        <button
          onClick={() => setViewMode('lista')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
            viewMode === 'lista' ? 'bg-yellow-400 text-slate-900 shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <List size={15} /> Lista de retirada
        </button>
        <button
          onClick={() => setViewMode('resumo')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
            viewMode === 'resumo' ? 'bg-yellow-400 text-slate-900 shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Shirt size={15} /> Resumo de camisetas
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        {viewMode === 'lista' && (
          <div className="relative flex-1 min-w-[200px]">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Digite o nome ou CPF do atleta..."
              className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400 outline-none transition-all"
            />
          </div>
        )}
        <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)} className={`${selectCls} py-3`} title="Filtrar por equipe">
          <option value="">Todas as equipes</option>
          {teamsPresent.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {viewMode === 'lista' && (
          <select value={sizeFilter} onChange={e => setSizeFilter(e.target.value)} className={`${selectCls} py-3`} title="Filtrar por tamanho da camiseta">
            <option value="">Todos os tamanhos</option>
            {sizeColumns.map(s => <option key={s} value={s}>Camiseta {s}</option>)}
          </select>
        )}
        <button
          onClick={() => setOnlyPending(v => !v)}
          className={`px-4 py-3 rounded-xl font-bold text-sm transition-all shrink-0 border ${
            onlyPending
              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
          }`}
        >
          {onlyPending ? 'Só pendentes ✓' : 'Só pendentes'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm font-bold flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-slate-500 py-12 animate-pulse font-medium">Carregando atletas...</div>
      ) : viewMode === 'resumo' ? (
        /* --- RESUMO DE CAMISETAS --- */
        <div className="space-y-4">
          {/* Chips com o total geral por tamanho */}
          <div className="bg-slate-900 rounded-xl border border-slate-800/60 p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Shirt size={14} className="text-yellow-400" /> Total de camisetas {onlyPending ? '(ainda não entregues)' : ''} — {summary.grandTotal}
            </p>
            <div className="flex flex-wrap gap-2">
              {sizeColumns.map(s => (
                <div key={s} className="bg-slate-800 rounded-lg px-4 py-2 text-center min-w-[64px]">
                  <div className="text-2xl font-black text-white">{summary.grand[s] || 0}</div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase">{s}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabela por equipe */}
          <div className="bg-slate-900 rounded-xl border border-slate-800/60 overflow-hidden">
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
                  {summary.rows.length === 0 ? (
                    <tr><td colSpan={sizeColumns.length + 2} className="p-8 text-center text-slate-600">Nenhum atleta.</td></tr>
                  ) : summary.rows.map(row => (
                    <tr key={row.team} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-medium text-white">{row.team}</td>
                      {sizeColumns.map(s => (
                        <td key={s} className="p-3 text-center text-slate-300">{row.counts[s] || <span className="text-slate-700">·</span>}</td>
                      ))}
                      <td className="p-3 text-center font-bold text-yellow-400">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
                {summary.rows.length > 0 && (
                  <tfoot>
                    <tr className="bg-slate-800/50 border-t border-slate-700">
                      <td className="p-3 font-bold text-white uppercase text-xs">Total geral</td>
                      {sizeColumns.map(s => (
                        <td key={s} className="p-3 text-center font-bold text-white">{summary.grand[s] || 0}</td>
                      ))}
                      <td className="p-3 text-center font-black text-yellow-400">{summary.grandTotal}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900 rounded-xl border border-slate-800/60 p-12 text-center">
          <Users size={36} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">
            {query || teamFilter || sizeFilter ? 'Nenhum atleta encontrado para os filtros.' : 'Nenhum atleta para exibir.'}
          </p>
        </div>
      ) : (
        /* --- LISTA DE RETIRADA --- */
        <div className="space-y-2.5">
          {filtered.map(r => (
            <div
              key={r.id}
              className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                r.kitDelivered
                  ? 'bg-emerald-500/[0.07] border-emerald-500/25'
                  : 'bg-slate-900 border-slate-800/60'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                r.kitDelivered ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-500'
              }`}>
                {r.kitDelivered ? <CheckCircle size={20} /> : <Package size={18} />}
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-bold text-white truncate">{r.fullName}</p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5 text-xs">
                  <span className="text-slate-500 font-mono">{r.cpf}</span>
                  {r.teamName && r.teamName !== 'Avulso' && (
                    <span className="text-indigo-400">{r.teamName}</span>
                  )}
                  <span className="text-slate-400">👕 {r.shirtSize}</span>
                  <span className="text-slate-500">{r.modality === '3k' ? '🚶 3 km' : '🏃 5 km'}</span>
                  {!r.isPaid && (
                    <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase text-[10px]">
                      <Clock size={10} /> Pgto pendente
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleToggle(r)}
                disabled={busyId === r.id}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-lg font-bold text-sm transition-all disabled:opacity-60 ${
                  r.kitDelivered
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-lg shadow-emerald-500/20'
                }`}
                title={r.kitDelivered ? 'Desfazer entrega' : 'Dar baixa no kit'}
              >
                {r.kitDelivered
                  ? <><RotateCcw size={15} /> Desfazer</>
                  : <><CheckCircle size={16} /> Entregar</>
                }
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
