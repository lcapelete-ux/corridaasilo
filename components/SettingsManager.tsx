import React, { useState } from 'react';
import { Settings, Save, AlertCircle } from 'lucide-react';

interface SettingsManagerProps {
  raceGroupName: string;
  onUpdateRaceGroupName: (name: string) => Promise<void>;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({ raceGroupName, onUpdateRaceGroupName }) => {
  const [name, setName] = useState(raceGroupName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError('O nome do grupo não pode ser vazio.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      await onUpdateRaceGroupName(trimmedName);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || 'Erro ao salvar o nome do grupo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-indigo-100 p-3 rounded-lg">
            <Settings size={24} className="text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Configurações da Corrida</h2>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              Nome do Grupo / Evento
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
                setSuccess(false);
              }}
              placeholder="Ex: 2ª CORRIDA NOTURNA LSC"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-lg font-semibold [color-scheme:light]"
            />
            <p className="text-xs text-slate-500 mt-2">
              Este nome será exibido em vários locais da página e no painel administrativo.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700 font-medium text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-emerald-700 font-medium text-sm">✓ Nome salvo com sucesso!</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || name.trim() === raceGroupName}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            <Save size={18} /> {saving ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </form>
      </div>
    </div>
  );
};
