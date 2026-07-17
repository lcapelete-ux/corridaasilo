import React, { useMemo, useState } from 'react';
import { Runner } from '../types';
import { Flag, Users, Award, Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { TeamDetailView } from './TeamDetailView';

interface TeamViewProps {
  runners: Runner[];
  officialTeams: string[];
  onCreateTeam: (name: string) => void;
  onDeleteTeam: (name: string) => void;
  onRenameTeam?: (oldName: string, newName: string) => Promise<void>;
}

export const TeamView: React.FC<TeamViewProps> = ({ runners, officialTeams, onCreateTeam, onDeleteTeam, onRenameTeam }) => {
  const [selectedTeamName, setSelectedTeamName] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);

  // Edição inline do nome de uma equipe
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingRename, setSavingRename] = useState(false);

  const teams = useMemo(() => {
    const grouped: Record<string, Runner[]> = {};

    // Toda equipe oficial aparece, mesmo sem nenhum inscrito ainda
    officialTeams.forEach(name => {
      if (name && name !== 'Avulso') grouped[name] = [];
    });
    runners.forEach(r => {
      const team = r.teamName || 'Avulso';
      if (!grouped[team]) grouped[team] = [];
      grouped[team].push(r);
    });

    return Object.entries(grouped)
      .map(([name, members]) => ({
        name,
        members,
        isOfficial: officialTeams.includes(name),
        avgAge: members.length > 0
          ? Math.round(members.reduce((acc, curr) => acc + curr.age, 0) / members.length)
          : 0
      }))
      .sort((a, b) => b.members.length - a.members.length);
  }, [runners, officialTeams]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTeamName.trim();
    if (!name) return;
    if (name.toLowerCase() === 'avulso') {
      alert('"Avulso" já é reservado para quem não tem equipe.');
      return;
    }
    if (officialTeams.some(t => t.toLowerCase() === name.toLowerCase())) {
      alert('Já existe uma equipe com este nome.');
      return;
    }
    setCreating(true);
    await onCreateTeam(name);
    setCreating(false);
    setNewTeamName('');
  };

  const handleDeleteTeam = (e: React.MouseEvent, teamName: string, memberCount: number) => {
    e.stopPropagation();
    const warning = memberCount > 0
      ? `A equipe "${teamName}" tem ${memberCount} inscrito(s). Eles continuam cadastrados normalmente, mas a equipe sai da lista de seleção. Remover mesmo assim?`
      : `Remover a equipe "${teamName}"?`;
    if (confirm(warning)) {
      onDeleteTeam(teamName);
    }
  };

  const startEdit = (e: React.MouseEvent, teamName: string) => {
    e.stopPropagation();
    setEditingTeam(teamName);
    setEditValue(teamName);
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTeam(null);
    setEditValue('');
  };

  const saveEdit = async (e: React.MouseEvent | React.FormEvent, oldName: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onRenameTeam) return;
    const name = editValue.trim();
    if (!name || name === oldName) {
      setEditingTeam(null);
      return;
    }
    if (name.toLowerCase() === 'avulso') {
      alert('"Avulso" é reservado para quem não tem equipe.');
      return;
    }
    if (officialTeams.some(t => t.toLowerCase() === name.toLowerCase())) {
      alert('Já existe uma equipe com este nome.');
      return;
    }
    setSavingRename(true);
    await onRenameTeam(oldName, name);
    setSavingRename(false);
    setEditingTeam(null);
    setEditValue('');
  };

  if (selectedTeamName) {
    const teamData = teams.find(t => t.name === selectedTeamName);
    if (teamData) {
      return (
        <TeamDetailView
          teamName={teamData.name}
          runners={teamData.members}
          onBack={() => setSelectedTeamName(null)}
        />
      );
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cadastro de Nova Equipe */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <Plus size={16} className="text-indigo-500" /> Cadastrar Nova Equipe
        </h3>
        <form onSubmit={handleCreateSubmit} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={newTeamName}
            onChange={e => setNewTeamName(e.target.value)}
            placeholder="Nome da academia/equipe"
            className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none text-sm [color-scheme:light]"
          />
          <button
            type="submit"
            disabled={creating || !newTeamName.trim()}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0"
          >
            <Plus size={16} /> {creating ? 'Criando...' : 'Criar Equipe'}
          </button>
        </form>
        <p className="text-xs text-slate-400 mt-2">
          A equipe passa a aparecer na hora para escolher em Inscrições, Cupons e Novo Login.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.map((team) => (
          <div
            key={team.name}
            onClick={() => setSelectedTeamName(team.name)}
            className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all group"
          >
            <div className={`p-4 border-b border-slate-100 flex justify-between items-center transition-colors ${
              team.name === 'Avulso' ? 'bg-slate-50' : 'bg-gradient-to-r from-indigo-50 to-white group-hover:from-indigo-100'
            }`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-lg shrink-0 ${team.name === 'Avulso' ? 'bg-slate-200 text-slate-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  <Flag size={20} />
                </div>
                <div className="min-w-0">
                  {editingTeam === team.name ? (
                    <form onSubmit={(e) => saveEdit(e, team.name)} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        autoFocus
                        disabled={savingRename}
                        className="w-full min-w-0 px-2 py-1 bg-white border border-indigo-300 rounded text-slate-900 text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none [color-scheme:light]"
                        placeholder="Novo nome"
                      />
                      <button type="submit" disabled={savingRename} className="p-1 rounded text-emerald-600 hover:bg-emerald-50 transition-colors shrink-0" title="Salvar">
                        <Check size={16} />
                      </button>
                      <button type="button" onClick={cancelEdit} disabled={savingRename} className="p-1 rounded text-slate-400 hover:bg-slate-100 transition-colors shrink-0" title="Cancelar">
                        <X size={16} />
                      </button>
                    </form>
                  ) : (
                    <>
                      <h3 className="font-bold text-slate-800 truncate">{team.name}</h3>
                      <p className="text-xs text-slate-500">
                        {team.members.length > 0 ? `Média de idade: ${team.avgAge} anos` : 'Nenhum inscrito ainda'}
                      </p>
                    </>
                  )}
                </div>
              </div>
              {editingTeam !== team.name && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="bg-white px-2 py-1 rounded-full text-xs font-bold text-slate-600 shadow-sm border border-slate-100 flex items-center gap-1">
                    <Users size={12} />
                    {team.members.length}
                  </div>
                  {team.isOfficial && onRenameTeam && (
                    <button
                      onClick={(e) => startEdit(e, team.name)}
                      className="p-1.5 rounded-full text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 transition-colors"
                      title="Editar nome da equipe"
                    >
                      <Pencil size={14} />
                    </button>
                  )}
                  {team.isOfficial && (
                    <button
                      onClick={(e) => handleDeleteTeam(e, team.name, team.members.length)}
                      className="p-1.5 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Remover equipe da lista"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 flex-1 overflow-y-auto max-h-[300px] pointer-events-none">
              {team.members.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-4">
                  Equipe cadastrada, aguardando o primeiro inscrito.
                </p>
              ) : (
                <ul className="space-y-2">
                  {team.members.slice(0, 5).map(member => (
                    <li key={member.id} className="flex items-center justify-between text-sm p-2 rounded bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${member.isPaid ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                        <span className="text-slate-700 truncate max-w-[150px]">{member.fullName}</span>
                      </div>
                      <span className="text-slate-400 text-xs font-mono bg-slate-100 px-1 rounded">{member.shirtSize}</span>
                    </li>
                  ))}
                  {team.members.length > 5 && (
                    <li className="text-xs text-center text-indigo-500 font-medium pt-1">
                      + {team.members.length - 5} outros membros...
                    </li>
                  )}
                </ul>
              )}
            </div>

            {team.members.length >= 5 && team.name !== 'Avulso' && (
              <div className="bg-yellow-50 p-2 text-center text-xs text-yellow-700 border-t border-yellow-100 flex items-center justify-center gap-1">
                <Award size={14} /> Equipe Elegível para Premiação
              </div>
            )}

            <div className="bg-slate-50 p-3 text-center text-xs text-slate-400 font-medium border-t border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
              Clique para ver detalhes
            </div>
          </div>
        ))}

        {teams.length === 0 && (
          <div className="col-span-full p-10 text-center text-slate-400 italic bg-white rounded-xl border border-slate-100">
            Nenhuma equipe cadastrada ainda.
          </div>
        )}
      </div>
    </div>
  );
};
