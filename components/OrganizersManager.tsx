import React, { useState } from 'react';
import { Organizer } from '../types';
import { Shield, Trash2, User, Flag, Phone, Pencil, Info, Copy, Check } from 'lucide-react';

interface OrganizersManagerProps {
  organizers: Organizer[];
  onUpdate: (organizer: Organizer) => void;
  onDelete: (id: string) => void;
}

const SQL_TEMPLATE = `select public.admin_create_login(
  'email@exemplo.com',   -- e-mail de login
  'senha1234',           -- senha (mínimo 4 caracteres)
  'Nome Completo',       -- nome
  'usuario',             -- usuário
  'Nome da Equipe',      -- equipe que lidera
  'team_leader',         -- 'admin' ou 'team_leader'
  '(15) 99999-0000'      -- telefone (opcional)
);`;

export const OrganizersManager: React.FC<OrganizersManagerProps> = ({ organizers, onUpdate, onDelete }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    teamName: '',
    username: '',
    phone: ''
  });

  const handleEdit = (org: Organizer) => {
    setFormData({
      name: org.name,
      teamName: org.teamName,
      username: org.username,
      phone: org.phone || ''
    });
    setEditingId(org.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    if (!formData.name || !formData.teamName || !formData.username) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }

    const original = organizers.find(o => o.id === editingId);
    onUpdate({
      id: editingId,
      role: original?.role,
      ...formData
    });

    setFormData({ name: '', teamName: '', username: '', phone: '' });
    setEditingId(null);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
            Os acessos são autenticados pelo Supabase. Edite os perfis aqui.
          </p>
        </div>
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
        >
          <Info size={18} /> Como criar um login
        </button>
      </div>

      {/* Instruções de criação de login */}
      {showInstructions && (
        <div className="bg-slate-900 p-6 rounded-xl border border-indigo-500/30 animate-slide-down">
          <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-3">Criar novo login de organizador</h3>
          <ol className="text-sm text-slate-300 space-y-1.5 list-decimal list-inside mb-4">
            <li>Abra o painel do Supabase e vá em <strong className="text-white">SQL Editor</strong></li>
            <li>Cole o comando abaixo, ajuste os dados e clique em <strong className="text-white">Run</strong></li>
            <li>O login já sai pronto: e-mail confirmado e perfil criado automaticamente</li>
          </ol>
          <div className="relative">
            <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 text-xs text-emerald-300 font-mono overflow-x-auto">{SQL_TEMPLATE}</pre>
            <button
              onClick={handleCopySql}
              className={`absolute top-2 right-2 p-2 rounded-lg transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}
              title="Copiar SQL"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>
      )}

      {/* Formulário de edição */}
      {editingId && (
        <form onSubmit={handleSubmit} className="bg-slate-900 p-6 rounded-xl border border-slate-800/60 animate-slide-down">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5 pb-3 border-b border-slate-800">
            Editar Organizador
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
              <label className={labelCls}>Usuário</label>
              <input
                required
                value={formData.username}
                onChange={e => setFormData({...formData, username: e.target.value.toLowerCase()})}
                className={inputCls}
                placeholder="usuario.acesso"
              />
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
                onClick={() => setEditingId(null)}
                className="px-4 py-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg text-sm font-medium transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-md transition-all"
              >
                Atualizar Dados
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
                <div className="flex items-center gap-2">
                  <div className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide">
                    {org.teamName}
                  </div>
                  {org.role === 'admin' && (
                    <div className="bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide">
                      Admin
                    </div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(org)}
                    className="text-slate-600 hover:text-indigo-400 transition-colors p-1"
                    title="Editar Perfil"
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
                <p className="text-xs text-slate-600 font-bold uppercase tracking-wider mb-2">Acesso</p>
                <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800/60 px-3 py-2 rounded-lg">
                  <User size={13} className="text-slate-500 shrink-0" /> {org.username}
                </div>
              </div>
            </div>
          </div>
        ))}

        {organizers.length === 0 && (
          <div className="col-span-full p-10 text-center text-slate-600 italic">
            Nenhum organizador cadastrado. Use "Como criar um login" acima.
          </div>
        )}
      </div>
    </div>
  );
};
