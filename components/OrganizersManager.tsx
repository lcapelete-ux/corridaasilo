import React, { useState } from 'react';
import { Organizer } from '../types';
import { Shield, Plus, Trash2, User, Key, Flag, Phone, Pencil } from 'lucide-react';

interface OrganizersManagerProps {
  organizers: Organizer[];
  onSave: (organizer: Organizer) => void;
  onUpdate: (organizer: Organizer) => void;
  onDelete: (id: string) => void;
}

export const OrganizersManager: React.FC<OrganizersManagerProps> = ({ organizers, onSave, onUpdate, onDelete }) => {
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    teamName: '',
    username: '',
    password: '',
    phone: ''
  });

  const handleEdit = (org: Organizer) => {
    setFormData({
      name: org.name,
      teamName: org.teamName,
      username: org.username,
      password: org.password,
      phone: org.phone || ''
    });
    setEditingId(org.id);
    setIsFormVisible(true);
  };

  const handleCreateNew = () => {
    setFormData({ name: '', teamName: '', username: '', password: '', phone: '' });
    setEditingId(null);
    setIsFormVisible(!isFormVisible);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.teamName || !formData.username || !formData.password) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    if (editingId) {
      // Update Mode
      const updatedOrganizer: Organizer = {
        id: editingId,
        ...formData
      };
      onUpdate(updatedOrganizer);
    } else {
      // Create Mode
      const newOrganizer: Organizer = {
        id: crypto.randomUUID(),
        ...formData
      };
      onSave(newOrganizer);
    }

    setFormData({ name: '', teamName: '', username: '', password: '', phone: '' });
    setEditingId(null);
    setIsFormVisible(false);
  };

  const inputCls = "w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none transition-all text-sm";
  const inputIconCls = "w-full pl-9 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none transition-all text-sm";
  const labelCls = "block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center bg-slate-900 p-6 rounded-xl border border-slate-800/60">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="text-indigo-400" size={20} />
            Organizadores de Equipe
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Cadastre ou edite os líderes que terão acesso ao sistema.
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
        >
          <Plus size={18} /> Novo Organizador
        </button>
      </div>

      {/* Formulário */}
      {isFormVisible && (
        <form onSubmit={handleSubmit} className="bg-slate-900 p-6 rounded-xl border border-slate-800/60 animate-slide-down">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5 pb-3 border-b border-slate-800">
            {editingId ? 'Editar Organizador' : 'Novo Organizador'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nome do Responsável</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className={inputIconCls}
                  placeholder="Ex: João da Silva"
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Equipe Gerenciada</label>
              <div className="relative">
                <Flag size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  required
                  value={formData.teamName}
                  onChange={e => setFormData({...formData, teamName: e.target.value})}
                  className={inputIconCls}
                  placeholder="Ex: Luso, Alcatéia..."
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Login (Usuário)</label>
              <input
                required
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value.toLowerCase()})}
                className={inputCls}
                placeholder="usuario.acesso"
              />
            </div>

            <div>
              <label className={labelCls}>Senha de Acesso</label>
              <div className="relative">
                <Key size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  required
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className={inputIconCls}
                  placeholder="Ex: 1234"
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Telefone/Whatsapp (Opcional)</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className={inputIconCls}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 pt-4 flex justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => { setIsFormVisible(false); setEditingId(null); }}
                className="px-4 py-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg text-sm font-medium transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-md transition-all"
              >
                {editingId ? 'Atualizar Dados' : 'Cadastrar Organizador'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Cards de organizadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {organizers.map(org => (
          <div key={org.id} className="bg-slate-900 p-5 rounded-xl border border-slate-800/60 flex flex-col justify-between hover:border-indigo-500/30 transition-all">
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide">
                  {org.teamName}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(org)}
                    className="text-slate-600 hover:text-indigo-400 transition-colors p-1"
                    title="Editar Acesso"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(org.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors p-1"
                    title="Remover Acesso"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-white text-lg">{org.name}</h3>
              {org.phone && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <Phone size={12} /> {org.phone}
                </p>
              )}
              <div className="mt-4 pt-3 border-t border-slate-800">
                <p className="text-xs text-slate-600 font-bold uppercase tracking-wider mb-2">Credenciais</p>
                <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800/60 px-3 py-2 rounded-lg">
                  <User size={13} className="text-slate-500 shrink-0" /> {org.username}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800/60 px-3 py-2 rounded-lg mt-1.5">
                  <Key size={13} className="text-slate-500 shrink-0" /> {org.password}
                </div>
              </div>
            </div>
          </div>
        ))}

        {organizers.length === 0 && (
          <div className="col-span-full p-10 text-center text-slate-600 italic">
            Nenhum organizador cadastrado.
          </div>
        )}
      </div>
    </div>
  );
};