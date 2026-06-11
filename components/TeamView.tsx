import React, { useMemo, useState } from 'react';
import { Runner } from '../types';
import { Flag, Users, Award } from 'lucide-react';
import { TeamDetailView } from './TeamDetailView';

interface TeamViewProps {
  runners: Runner[];
}

export const TeamView: React.FC<TeamViewProps> = ({ runners }) => {
  const [selectedTeamName, setSelectedTeamName] = useState<string | null>(null);

  const teams = useMemo(() => {
    const grouped: Record<string, Runner[]> = {};
    runners.forEach(r => {
      const team = r.teamName || 'Avulso';
      if (!grouped[team]) grouped[team] = [];
      grouped[team].push(r);
    });
    
    // Convert to array and sort by team size
    return Object.entries(grouped)
      .map(([name, members]) => ({
        name,
        members,
        avgAge: Math.round(members.reduce((acc, curr) => acc + curr.age, 0) / members.length)
      }))
      .sort((a, b) => b.members.length - a.members.length);
  }, [runners]);

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
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${team.name === 'Avulso' ? 'bg-slate-200 text-slate-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  <Flag size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{team.name}</h3>
                  <p className="text-xs text-slate-500">Média de idade: {team.avgAge} anos</p>
                </div>
              </div>
              <div className="bg-white px-2 py-1 rounded-full text-xs font-bold text-slate-600 shadow-sm border border-slate-100 flex items-center gap-1">
                <Users size={12} />
                {team.members.length}
              </div>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto max-h-[300px] pointer-events-none">
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
      </div>
    </div>
  );
};