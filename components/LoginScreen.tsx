import React, { useState } from 'react';
import { Lock, Timer, User, ShieldCheck } from 'lucide-react';
import { UserSession } from '../types';
import { getOrganizers } from '../services/storageService';

interface LoginScreenProps {
  onLogin: (session: UserSession) => void;
  onBack: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const user = username.trim().toLowerCase();
    
    // 1. Admin Master Access (Hardcoded)
    if ((user === 'marcelo' || user === 'wilson') && password === '1234') {
      onLogin({
        username: user,
        role: 'admin'
      });
      return;
    }

    // 2. Dynamic Team Leader Access (From Database)
    const organizers = getOrganizers();
    const organizer = organizers.find(
      org => org.username.toLowerCase() === user && org.password === password
    );

    if (organizer) {
      onLogin({
        username: organizer.name,
        role: 'team_leader',
        teamAccess: organizer.teamName // Garante acesso apenas à equipe cadastrada
      });
      return;
    }

    setError(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-yellow-400 p-4 rounded-xl text-slate-900 mb-4 shadow-lg shadow-yellow-400/20">
            <Timer size={40} className="fill-white text-black" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase">2ª Corrida Noturna LSC</h1>
          <p className="text-slate-500 font-medium">Área Restrita</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Campo de Usuário */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Usuário</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(false);
                }}
                className={`w-full pl-10 pr-4 py-3 border rounded-xl outline-none focus:ring-2 transition-all font-medium ${
                  error 
                    ? 'border-red-300 focus:ring-red-200 bg-red-50' 
                    : 'border-slate-200 focus:ring-yellow-400 focus:border-yellow-400'
                }`}
                placeholder="Digite seu usuário..."
                autoFocus
              />
            </div>
          </div>

          {/* Campo de Senha */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(false);
                }}
                className={`w-full pl-10 pr-4 py-3 border rounded-xl outline-none focus:ring-2 transition-all font-medium ${
                  error 
                    ? 'border-red-300 focus:ring-red-200 bg-red-50' 
                    : 'border-slate-200 focus:ring-yellow-400 focus:border-yellow-400'
                }`}
                placeholder="Digite sua senha..."
              />
            </div>
            {error && <p className="text-red-500 text-xs mt-2 ml-1 font-bold">Credenciais inválidas.</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-black text-yellow-400 py-3 rounded-xl font-black tracking-wide hover:bg-slate-800 transition-colors shadow-lg uppercase flex justify-center items-center gap-2"
          >
            <ShieldCheck size={18} /> Acessar Sistema
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-100 pt-6">
          <button onClick={onBack} className="text-sm font-medium text-slate-400 hover:text-slate-700 transition-colors">
            &larr; Voltar para Inscrições
          </button>
        </div>
      </div>
    </div>
  );
};