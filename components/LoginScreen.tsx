import React, { useState } from 'react';
import { Lock, Timer, Mail, ShieldCheck, Loader2 } from 'lucide-react';
import { UserSession } from '../types';
import { supabase } from '../services/supabaseClient';

interface LoginScreenProps {
  onLogin: (session: UserSession) => void;
  onBack: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Aceita usuário OU e-mail: sem "@", resolve o e-mail pelo usuário.
      //    Distinguir "usuário não existe" de "não consegui consultar" importa:
      //    com o banco fora do ar os dois casos voltam vazios, e tratar tudo
      //    como "usuário não encontrado" manda o admin caçar o problema errado.
      let loginEmail = email.trim();
      if (loginEmail && !loginEmail.includes('@')) {
        const { data: resolved, error: rpcError } = await supabase.rpc('get_login_email', {
          p_username: loginEmail,
        });
        if (rpcError) {
          console.error('Falha ao resolver o usuário:', rpcError);
          setError('Não foi possível consultar o servidor agora. Tente entrar com o e-mail completo ou tente novamente em instantes.');
          setLoading(false);
          return;
        }
        if (resolved) {
          loginEmail = resolved as string;
        } else {
          setError('Usuário não encontrado. Confira o usuário ou entre com o e-mail completo.');
          setLoading(false);
          return;
        }
      }

      // 2. Autentica no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (authError || !authData.user) {
        setError('Usuário/e-mail ou senha inválidos.');
        setLoading(false);
        return;
      }

      // 3. Busca o perfil (papel + equipe + telas liberadas) na tabela organizers.
      //    Resiliente: se a coluna permissions ainda não existe, busca sem ela.
      let profile: any = null;
      let profileError: { code?: string; message?: string } | null = null;
      const withPerms = await supabase
        .from('organizers')
        .select('name, username, role, team_name, permissions')
        .eq('id', authData.user.id)
        .single();
      if (withPerms.error) {
        const fallback = await supabase
          .from('organizers')
          .select('name, username, role, team_name')
          .eq('id', authData.user.id)
          .single();
        profile = fallback.data;
        profileError = fallback.error;
      } else {
        profile = withPerms.data;
      }

      if (!profile) {
        await supabase.auth.signOut();
        // PGRST116 = a consulta funcionou e não achou linha: o perfil realmente
        // não existe. Qualquer outro erro é falha de consulta (banco acordando,
        // instabilidade) — dizer "sem perfil" nesse caso manda procurar o
        // problema no lugar errado, como já aconteceu.
        const semPerfil = !profileError || profileError.code === 'PGRST116';
        if (semPerfil) {
          setError('Seu login existe, mas não tem perfil de organizador cadastrado. Fale com o administrador.');
        } else {
          console.error('Falha ao carregar o perfil do organizador:', profileError);
          setError('Login OK, mas não foi possível carregar seu perfil agora. Aguarde alguns instantes e tente de novo.');
        }
        setLoading(false);
        return;
      }

      onLogin({
        username: profile.name || profile.username,
        role: profile.role,
        teamAccess: profile.role === 'team_leader' ? profile.team_name : undefined,
        permissions: profile.permissions || [],
      });
    } catch {
      setError('Falha na conexão. Verifique sua internet e tente novamente.');
      setLoading(false);
    }
  };

  const inputCls = (hasError: boolean) =>
    `w-full pl-10 pr-4 py-3 border rounded-xl outline-none focus:ring-2 transition-all font-medium bg-slate-800 text-white placeholder-slate-500 ${
      hasError
        ? 'border-red-500 focus:ring-red-500/30'
        : 'border-slate-700 focus:ring-yellow-400/40 focus:border-yellow-400'
    }`;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 animate-fade-in relative overflow-hidden">
      {/* Glow de fundo */}
      <div className="absolute top-[-15%] right-[-10%] w-[400px] h-[400px] bg-yellow-500 rounded-full blur-[140px] opacity-10 pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[350px] h-[350px] bg-indigo-900 rounded-full blur-[120px] opacity-15 pointer-events-none" />

      <div className="relative bg-slate-900 p-8 rounded-2xl w-full max-w-md border border-slate-800 shadow-2xl shadow-black/60">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-yellow-400 p-4 rounded-xl text-slate-900 mb-4 shadow-lg shadow-yellow-400/20">
            <Timer size={40} className="fill-white text-black" />
          </div>
          <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase">2ª Corrida Noturna LSC</h1>
          <p className="text-slate-400 font-medium mt-1">Área Restrita</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Campo de Usuário ou E-mail */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-1">Usuário ou E-mail</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                className={inputCls(!!error)}
                placeholder="Ex: marcelo"
                autoFocus
              />
            </div>
          </div>

          {/* Campo de Senha */}
          <div>
            <label className="block text-sm font-bold text-slate-300 mb-1">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                className={inputCls(!!error)}
                placeholder="Digite sua senha..."
              />
            </div>
            {error && <p className="text-red-400 text-xs mt-2 ml-1 font-bold">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-400 text-slate-900 py-3 rounded-xl font-black tracking-wide hover:bg-yellow-300 transition-colors shadow-lg shadow-yellow-400/20 uppercase flex justify-center items-center gap-2 disabled:opacity-60 disabled:cursor-wait"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
            {loading ? 'Entrando...' : 'Acessar Sistema'}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-800 pt-6">
          <button onClick={onBack} className="text-sm font-medium text-slate-500 hover:text-slate-300 transition-colors">
            &larr; Voltar para Inscrições
          </button>
        </div>
      </div>
    </div>
  );
};
