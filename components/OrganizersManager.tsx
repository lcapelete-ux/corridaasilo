import React, { useState } from 'react';
import { Organizer } from '../types';
import { Shield, Plus, Trash2, User, Key, Flag, Phone, Pencil, Mail, CheckCircle, Copy, Check, X } from 'lucide-react';

interface OrganizersManagerProps {
  organizers: Organizer[];
  teams: string[];
  onCreateLogin: (params: {
    email: string;
    password: string;
    name: string;
    username: string;
    teamName: string;
    role: 'admin' | 'team_leader';
    phone?: string;
  }) => Promise<void>;
  onUpdate: (organizer: Organizer) => void;
  onDelete: (id: string) => void;
}

const inputCls = "w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none transition-all text-sm";
const inputIconCls = "w-full pl-9 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none transition-all text-sm";
const selectCls = "w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none transition-all text-sm [color-scheme:dark]";
const labelCls = "block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wide";

const emptyCreateForm = {
  name: '',
  teamName: '',
  isCustomTeam: false,
  username: '',
  email: '',
  password: '',
  phone: '',
  role: 'team_leader' as 'admin' | 'team_leader',
};

const emptyEditForm = { name: '', teamName: '', username: '', phone: '' };

export const OrganizersManager: React.FC<OrganizersManagerProps> = ({ organizers, teams, onCreateLogin, onUpdate, onDelete }) => {
  // --- Criar novo login ---
  const [isCreateVisible, setIsCreateVisible] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [justCreated, setJustCreated] = useState<{ name: string; teamName: string; username: string; email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // --- Editar organizador existente ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyEditForm);

  const handleEdit = (org: Organizer) => {
    setEditForm({ name: org.name, teamName: org.teamName, username: org.username, phone: org.phone || '' });
    setEditingId(org.id);
    setIsCreateVisible(false);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    if (!editForm.name || !editForm.teamName || !editForm.username) {
      alert("Preencha todos os campos obrigatórios");
      return;
    }
    const original = organizers.find(o => o.id === editingId);
    onUpdate({ id: editingId, role: original?.role, ...editForm });
    setEditForm(emptyEditForm);
    setEditingId(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');

    if (!createForm.name || !createForm.teamName || !createForm.username || !createForm.email || !createForm.password) {
      setCreateError('Preencha todos os campos obrigatórios.');
      return;
    }
    if (createForm.password.length < 4) {
      setCreateError('A senha precisa ter no mínimo 4 caracteres.');
      return;
    }

    setCreating(true);
    try {
      await onCreateLogin({
        email: createForm.email.trim(),
        password: createForm.password,
        name: createForm.name.trim(),
        username: createForm.username.trim().toLowerCase(),
        teamName: createForm.teamName,
        role: createForm.role,
        phone: createForm.phone || undefined,
      });
      setJustCreated({
        name: createForm.name,
        teamName: createForm.teamName,
        username: createForm.username.toLowerCase(),
        email: createForm.email,
        password: createForm.password,
      });
      setCreateForm(emptyCreateForm);
      setIsCreateVisible(false);
    } catch (err: any) {
      setCreateError(err?.message || 'Erro ao criar login.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!justCreated) return;
    const text = `Acesso ao sistema da Corrida Noturna LSC\nUsuário: ${justCreated.username}\nSenha: ${justCreated.password}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
            Crie um login para cada líder de academia: ele só verá e cadastrará inscritos da própria equipe.
          </p>
        </div>
        <button
          onClick={() => { setIsCreateVisible(!isCreateVisible); setEditingId(null); setJustCreated(null); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
        >
          <Plus size={18} /> Novo Login
        </button>
      </div>

      {/* Confirmação de criação (mostra a senha uma última vez para repassar ao líder) */}
      {justCreated && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 flex items-start gap-4 animate-slide-down">
          <div className="bg-emerald-500/20 p-2 rounded-lg text-emerald-400 shrink-0">
            <CheckCircle size={20} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-emerald-400">Login criado para {justCreated.name} ({justCreated.teamName})</p>
            <p className="text-sm text-slate-300 mt-1">
              Anote agora — a senha não aparece novamente. Repasse ao líder pelo WhatsApp ou pessoalmente.
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-3 bg-slate-900/60 rounded-lg p-3 font-mono text-sm">
              <span className="text-slate-400">Usuário: <strong className="text-white">{justCreated.username}</strong></span>
              <span className="text-slate-400">Senha: <strong className="text-white">{justCreated.password}</strong></span>
              <button
                onClick={handleCopyCredentials}
                className={`ml-auto flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>
          <button onClick={() => setJustCreated(null)} className="text-slate-500 hover:text-white shrink-0">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Formulário: Novo Login */}
      {isCreateVisible && (
        <form onSubmit={handleCreateSubmit} className="bg-slate-900 p-6 rounded-xl border border-slate-800/60 animate-slide-down">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5 pb-3 border-b border-slate-800">
            Novo Login de Organizador
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nome do Responsável</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  required
                  value={createForm.name}
                  onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                  className={inputIconCls}
                  placeholder="Ex: Diego"
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Academia / Equipe</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Flag size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  {createForm.isCustomTeam ? (
                    <input
                      required
                      value={createForm.teamName}
                      onChange={e => setCreateForm({ ...createForm, teamName: e.target.value })}
                      className={inputIconCls}
                      placeholder="Digite o nome da academia"
                      autoFocus
                    />
                  ) : (
                    <select
                      required
                      value={createForm.teamName}
                      onChange={e => {
                        if (e.target.value === '__outra__') {
                          setCreateForm({ ...createForm, isCustomTeam: true, teamName: '' });
                        } else {
                          setCreateForm({ ...createForm, teamName: e.target.value });
                        }
                      }}
                      className={`${selectCls} pl-9`}
                    >
                      <option value="">Selecione...</option>
                      {teams.map(t => <option key={t} value={t}>{t}</option>)}
                      <option value="__outra__">Outra (digitar)</option>
                    </select>
                  )}
                </div>
                {createForm.isCustomTeam && (
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, isCustomTeam: false, teamName: '' })}
                    className="text-xs text-slate-500 hover:text-slate-300 shrink-0"
                  >
                    Escolher da lista
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className={labelCls}>E-mail (login)</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  required
                  type="email"
                  value={createForm.email}
                  onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                  className={inputIconCls}
                  placeholder="diego@exemplo.com"
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Usuário (login alternativo)</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  required
                  value={createForm.username}
                  onChange={e => setCreateForm({ ...createForm, username: e.target.value.toLowerCase() })}
                  className={inputIconCls}
                  placeholder="diego"
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Senha de Acesso</label>
              <div className="relative">
                <Key size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  required
                  value={createForm.password}
                  onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                  className={inputIconCls}
                  placeholder="Mínimo 4 caracteres"
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>Telefone/Whatsapp (Opcional)</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={createForm.phone}
                  onChange={e => setCreateForm({ ...createForm, phone: e.target.value })}
                  className={inputIconCls}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className={labelCls}>Nível de Acesso</label>
              <div className="flex gap-3">
                <label className={`flex-1 flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  createForm.role === 'team_leader' ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}>
                  <input type="radio" className="accent-indigo-500" checked={createForm.role === 'team_leader'} onChange={() => setCreateForm({ ...createForm, role: 'team_leader' })} />
                  <span className="text-sm font-bold">Líder de Equipe <span className="font-normal opacity-70">(vê só a própria academia)</span></span>
                </label>
                <label className={`flex-1 flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  createForm.role === 'admin' ? 'bg-yellow-400/10 border-yellow-400/40 text-yellow-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}>
                  <input type="radio" className="accent-yellow-400" checked={createForm.role === 'admin'} onChange={() => setCreateForm({ ...createForm, role: 'admin' })} />
                  <span className="text-sm font-bold">Administrador <span className="font-normal opacity-70">(acesso total)</span></span>
                </label>
              </div>
            </div>

            {createError && (
              <div className="col-span-1 md:col-span-2 text-red-400 text-sm font-bold bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                {createError}
              </div>
            )}

            <div className="col-span-1 md:col-span-2 pt-4 flex justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => { setIsCreateVisible(false); setCreateForm(emptyCreateForm); setCreateError(''); }}
                className="px-4 py-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg text-sm font-medium transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-md transition-all disabled:opacity-60"
              >
                {creating ? 'Criando...' : 'Criar Login'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Formulário: Editar Organizador */}
      {editingId && (
        <form onSubmit={handleEditSubmit} className="bg-slate-900 p-6 rounded-xl border border-slate-800/60 animate-slide-down">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5 pb-3 border-b border-slate-800">
            Editar Organizador
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Nome do Responsável</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input required value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className={inputIconCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Equipe Gerenciada</label>
              <div className="relative">
                <Flag size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input required value={editForm.teamName} onChange={e => setEditForm({ ...editForm, teamName: e.target.value })} className={inputIconCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Usuário</label>
              <input required value={editForm.username} onChange={e => setEditForm({ ...editForm, username: e.target.value.toLowerCase() })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Telefone/Whatsapp (Opcional)</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className={inputIconCls} />
              </div>
            </div>
            <div className="col-span-1 md:col-span-2 pt-4 flex justify-end gap-3 border-t border-slate-800">
              <button type="button" onClick={() => { setEditingId(null); setEditForm(emptyEditForm); }} className="px-4 py-2 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg text-sm font-medium transition-all">
                Cancelar
              </button>
              <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 shadow-md transition-all">
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
                <div className="flex items-center gap-1.5 flex-wrap">
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
                <p className="text-xs text-slate-600 font-bold uppercase tracking-wider mb-2">Login</p>
                <div className="flex items-center gap-2 text-sm text-slate-300 bg-slate-800/60 px-3 py-2 rounded-lg">
                  <User size={13} className="text-slate-500 shrink-0" /> {org.username}
                </div>
              </div>
            </div>
          </div>
        ))}

        {organizers.length === 0 && (
          <div className="col-span-full p-10 text-center text-slate-600 italic">
            Nenhum organizador cadastrado. Clique em "Novo Login" para criar o primeiro.
          </div>
        )}
      </div>
    </div>
  );
};
