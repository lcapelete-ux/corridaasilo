import React, { useEffect, useMemo, useState } from 'react';
import { Package, Search, CheckCircle, Clock, RotateCcw, Users, AlertCircle, PackageCheck } from 'lucide-react';
import { listKitRunners, setKitDelivered, KitRunner } from '../services/storageService';

export const KitDelivery: React.FC = () => {
  const [runners, setRunners] = useState<KitRunner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [onlyPending, setOnlyPending] = useState(false);

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
    // Atualização otimista
    setRunners(prev => prev.map(x => x.id === r.id ? { ...x, kitDelivered: next } : x));
    try {
      await setKitDelivered(r.id, next);
    } catch (e: any) {
      // Reverte em caso de erro
      setRunners(prev => prev.map(x => x.id === r.id ? { ...x, kitDelivered: !next } : x));
      alert(e?.message || 'Erro ao registrar a entrega.');
    } finally {
      setBusyId(null);
    }
  };

  const delivered = runners.filter(r => r.kitDelivered).length;
  const total = runners.length;
  const pct = total > 0 ? Math.round((delivered / total) * 100) : 0;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return runners.filter(r => {
      if (onlyPending && r.kitDelivered) return false;
      if (!q) return true;
      const nameMatch = r.fullName.toLowerCase().includes(q);
      const cpfMatch = digits.length > 0 && r.cpf.replace(/\D/g, '').includes(digits);
      return nameMatch || cpfMatch;
    });
  }, [runners, query, onlyPending]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header + progresso */}
      <div className="bg-slate-900 rounded-xl border border-slate-800/60 p-6">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Package className="text-yellow-400" size={22} /> Entrega de Kits
          </h2>
          <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-xl">
            <PackageCheck size={18} className="text-emerald-400" />
            <span className="text-white font-bold text-lg">{delivered}</span>
            <span className="text-slate-500">/ {total} entregues</span>
          </div>
        </div>
        <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Busque o atleta pelo nome ou CPF e toque em <strong className="text-slate-300">Entregar</strong> para dar baixa no kit.
        </p>
      </div>

      {/* Busca + filtro */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Digite o nome ou CPF do atleta..."
            autoFocus
            className="w-full pl-11 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400 outline-none transition-all"
          />
        </div>
        <button
          onClick={() => setOnlyPending(v => !v)}
          className={`px-4 py-3 rounded-xl font-bold text-sm transition-all shrink-0 border ${
            onlyPending
              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
          }`}
        >
          {onlyPending ? 'Mostrando pendentes' : 'Só pendentes'}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm font-bold flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-center text-slate-500 py-12 animate-pulse font-medium">Carregando atletas...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-900 rounded-xl border border-slate-800/60 p-12 text-center">
          <Users size={36} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">
            {query ? 'Nenhum atleta encontrado para esta busca.' : 'Nenhum atleta para exibir.'}
          </p>
        </div>
      ) : (
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
