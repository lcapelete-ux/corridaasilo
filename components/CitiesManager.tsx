import React, { useMemo, useState } from 'react';
import { MapPin, Plus, Trash2, Users, PlusCircle } from 'lucide-react';
import { Runner } from '../types';

interface CitiesManagerProps {
  cities: string[];
  runners?: Runner[];
  onCreate: (name: string) => Promise<void>;
  onDelete: (name: string) => void;
}

// Normaliza para comparar cidades: ignora maiúsculas, espaços e acentos, para
// "Tietê" e "Tiete" (ou "São Paulo"/"Sao Paulo") contarem como a mesma cidade.
const norm = (s: string) =>
  s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const CitiesManager: React.FC<CitiesManagerProps> = ({ cities, runners = [], onCreate, onDelete }) => {
  const [newCityName, setNewCityName] = useState('');
  const [creating, setCreating] = useState(false);
  const [addingCity, setAddingCity] = useState<string | null>(null);

  // Quantos inscritos há por cidade (normalizando maiúsculas/espaços)
  const cityCounts = useMemo(() => {
    const m = new Map<string, { name: string; count: number }>();
    runners.forEach(r => {
      const c = (r.city || '').trim();
      if (!c) return;
      const k = norm(c);
      const cur = m.get(k);
      if (cur) cur.count++;
      else m.set(k, { name: c, count: 1 });
    });
    return m;
  }, [runners]);

  const countFor = (city: string) => cityCounts.get(norm(city))?.count || 0;
  const totalWithCity = runners.filter(r => (r.city || '').trim()).length;

  // Cadastradas, ordenadas por quantidade de inscritos (mais populares primeiro)
  const registeredSorted = useMemo(
    () => [...cities].sort((a, b) => countFor(b) - countFor(a) || a.localeCompare(b, 'pt-BR')),
    [cities, cityCounts]
  );

  // Cidades que aparecem nos inscritos mas NÃO estão na lista de cadastro
  const officialSet = useMemo(() => new Set(cities.map(norm)), [cities]);
  const unregistered = useMemo(
    () => [...cityCounts.values()].filter(c => !officialSet.has(norm(c.name))).sort((a, b) => b.count - a.count),
    [cityCounts, officialSet]
  );

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCityName.trim();
    if (!name) return;
    if (cities.some(c => c.toLowerCase() === name.toLowerCase())) {
      alert('Já existe uma cidade com este nome.');
      return;
    }
    setCreating(true);
    try {
      await onCreate(name);
      setNewCityName('');
    } catch (err: any) {
      alert(err?.message || 'Não foi possível cadastrar a cidade.');
    } finally {
      setCreating(false);
    }
  };

  const quickAdd = async (name: string) => {
    setAddingCity(name);
    try {
      await onCreate(name);
    } catch (err: any) {
      alert(err?.message || 'Não foi possível cadastrar a cidade.');
    } finally {
      setAddingCity(null);
    }
  };

  const handleDelete = (name: string) => {
    if (confirm(`Remover "${name}" da lista de cidades? Quem já se inscreveu com essa cidade não é afetado — ela só sai da lista de seleção.`)) {
      onDelete(name);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header + cadastro */}
      <div className="bg-slate-900 rounded-xl border border-slate-800/60 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <MapPin className="text-yellow-400" size={20} /> Cidades
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Estas cidades aparecem para escolher na inscrição. Ao lado de cada uma, quantos atletas já são daquela cidade.
            </p>
          </div>
          {totalWithCity > 0 && (
            <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-2 shrink-0">
              <Users size={16} className="text-indigo-400" />
              <span className="text-sm text-slate-300">
                <strong className="text-white">{cityCounts.size}</strong> cidade(s) entre <strong className="text-white">{totalWithCity}</strong> inscrito(s)
              </span>
            </div>
          )}
        </div>
        <form onSubmit={handleCreateSubmit} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newCityName}
            onChange={e => setNewCityName(e.target.value)}
            placeholder="Nome da cidade"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400/40 focus:border-yellow-400 outline-none transition-all text-sm"
          />
          <button
            type="submit"
            disabled={creating || !newCityName.trim()}
            className="bg-yellow-400 text-slate-900 px-5 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-yellow-300 transition-all shadow-lg shadow-yellow-400/20 disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
          >
            <Plus size={18} /> {creating ? 'Cadastrando...' : 'Cadastrar Cidade'}
          </button>
        </form>
      </div>

      {/* Cidades NÃO cadastradas (digitadas pelos inscritos em "Outra") */}
      {unregistered.length > 0 && (
        <div className="bg-slate-900 rounded-xl border border-amber-500/30 p-4">
          <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-2">
            <MapPin size={14} /> Cidades de inscritos ainda não cadastradas
          </p>
          <p className="text-xs text-slate-500 mb-3">
            Foram digitadas na inscrição (opção “Outra”) e não estão na sua lista. Clique em “Cadastrar” para adicioná-las à seleção.
          </p>
          <div className="flex flex-wrap gap-2">
            {unregistered.map(c => (
              <div
                key={c.name}
                className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/30 rounded-full pl-3.5 pr-2 py-1.5"
              >
                <span className="text-sm text-slate-200 font-medium">{c.name}</span>
                <span className="text-[11px] font-bold bg-amber-500/20 text-amber-300 rounded-full px-2 py-0.5">{c.count}</span>
                <button
                  onClick={() => quickAdd(c.name)}
                  disabled={addingCity === c.name}
                  className="text-amber-400 hover:text-amber-200 p-1 rounded-full hover:bg-amber-500/10 transition-colors disabled:opacity-50"
                  title="Cadastrar esta cidade na lista"
                >
                  <PlusCircle size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista de cadastradas com contagem */}
      {cities.length === 0 ? (
        <div className="bg-slate-900 rounded-xl border border-dashed border-slate-700 p-12 text-center">
          <MapPin size={36} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhuma cidade cadastrada ainda.</p>
          <p className="text-slate-600 text-sm mt-1">Cadastre acima para começar a aparecer na inscrição.</p>
        </div>
      ) : (
        <div className="bg-slate-900 rounded-xl border border-slate-800/60 p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            {cities.length} {cities.length === 1 ? 'cidade cadastrada' : 'cidades cadastradas'} — número = inscritos
          </p>
          <div className="flex flex-wrap gap-2">
            {registeredSorted.map(city => {
              const n = countFor(city);
              return (
                <div
                  key={city}
                  className="group flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-full pl-3.5 pr-2 py-1.5 hover:border-red-500/40 transition-all"
                >
                  <span className="text-sm text-slate-200 font-medium">{city}</span>
                  <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${
                    n > 0 ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-700 text-slate-500'
                  }`}>
                    {n}
                  </span>
                  <button
                    onClick={() => handleDelete(city)}
                    className="text-slate-500 hover:text-red-400 p-1 rounded-full hover:bg-red-500/10 transition-colors"
                    title="Remover cidade"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
