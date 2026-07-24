import React, { useState } from 'react';
import { MapPin, Plus, Trash2 } from 'lucide-react';

interface CitiesManagerProps {
  cities: string[];
  onCreate: (name: string) => Promise<void>;
  onDelete: (name: string) => void;
}

export const CitiesManager: React.FC<CitiesManagerProps> = ({ cities, onCreate, onDelete }) => {
  const [newCityName, setNewCityName] = useState('');
  const [creating, setCreating] = useState(false);

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
              Estas cidades aparecem para escolher na hora da inscrição. Já vem algumas cadastradas — adicione outras conforme precisar.
            </p>
          </div>
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

      {/* Lista */}
      {cities.length === 0 ? (
        <div className="bg-slate-900 rounded-xl border border-dashed border-slate-700 p-12 text-center">
          <MapPin size={36} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhuma cidade cadastrada ainda.</p>
          <p className="text-slate-600 text-sm mt-1">Cadastre acima para começar a aparecer na inscrição.</p>
        </div>
      ) : (
        <div className="bg-slate-900 rounded-xl border border-slate-800/60 p-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            {cities.length} {cities.length === 1 ? 'cidade cadastrada' : 'cidades cadastradas'}
          </p>
          <div className="flex flex-wrap gap-2">
            {cities.map(city => (
              <div
                key={city}
                className="group flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-full pl-3.5 pr-2 py-1.5 hover:border-red-500/40 transition-all"
              >
                <span className="text-sm text-slate-200 font-medium">{city}</span>
                <button
                  onClick={() => handleDelete(city)}
                  className="text-slate-500 hover:text-red-400 p-1 rounded-full hover:bg-red-500/10 transition-colors"
                  title="Remover cidade"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
