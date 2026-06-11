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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
           <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Shield className="text-indigo-600" />
            Organizadores de Equipe
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Cadastre ou edite os líderes que terão acesso ao sistema.
          </p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 transition-all"
        >
          <Plus size={18} /> Novo Organizador
        </button>
      </div>

      {isFormVisible && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md border border-indigo-100 animate-slide-down">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
            {editingId ? 'Editar Organizador' : 'Novo Organizador'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Nome do Responsável</label>
              <div className="relative">
                 <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                 <input 
                   required
                   value={formData.name}
                   onChange={e => setFormData({...formData, name: e.target.value})}
                   className="w-full pl-9 p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
                   placeholder="Ex: João da Silva"
                 />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Equipe Gerenciada</label>
              <div className="relative">
                 <Flag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                 <input 
                   required
                   value={formData.teamName}
                   onChange={e => setFormData({...formData, teamName: e.target.value})}
                   className="w-full pl-9 p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
                   placeholder="Ex: Luso, Alcatéia..."
                 />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Login (Usuário)</label>
              <input 
                required
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value.toLowerCase()})}
                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
                placeholder="usuario.acesso"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Senha de Acesso</label>
              <div className="relative">
                 <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                 <input 
                   required
                   value={formData.password}
                   onChange={e => setFormData({...formData, password: e.target.value})}
                   className="w-full pl-9 p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
                   placeholder="Senha simples (ex: 1234)"
                 />
              </div>
            </div>

             <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Telefone/Whatsapp (Opcional)</label>
              <div className="relative">
                 <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                 <input 
                   value={formData.phone}
                   onChange={e => setFormData({...formData, phone: e.target.value})}
                   className="w-full pl-9 p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-400 outline-none"
                   placeholder="(00) 00000-0000"
                 />
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 pt-4 flex justify-end gap-3">
              <button 
                type="button" 
                onClick={() => { setIsFormVisible(false); setEditingId(null); }}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm font-medium"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-md"
              >
                {editingId ? 'Atualizar Dados' : 'Cadastrar Organizador'}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {organizers.map(org => (
          <div key={org.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between group hover:border-indigo-200 transition-all">
            <div>
              <div className="flex justify-between items-start mb-2">
                 <div className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold uppercase tracking-wide">
                    {org.teamName}
                 </div>
                 <div className="flex gap-1">
                    <button 
                      onClick={() => handleEdit(org)} 
                      className="text-slate-300 hover:text-indigo-500 transition-colors p-1"
                      title="Editar Acesso"
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      onClick={() => onDelete(org.id)} 
                      className="text-slate-300 hover:text-red-500 transition-colors p-1"
                      title="Remover Acesso"
                    >
                      <Trash2 size={16} />
                    </button>
                 </div>
              </div>
              <h3 className="font-bold text-slate-800 text-lg">{org.name}</h3>
              {org.phone && <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><Phone size={12}/> {org.phone}</p>}
              
              <div className="mt-4 pt-3 border-t border-slate-50">
                <p className="text-xs text-slate-400 font-bold uppercase mb-1">Credenciais</p>
                <div className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded">
                  <User size={14} className="text-slate-400"/> {org.username}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 p-2 rounded mt-1">
                  <Key size={14} className="text-slate-400"/> {org.password}
                </div>
              </div>
            </div>
          </div>
        ))}

        {organizers.length === 0 && (
           <div className="col-span-full p-8 text-center text-slate-400 italic">
             Nenhum organizador cadastrado.
           </div>
        )}
      </div>
    </div>
  );
};