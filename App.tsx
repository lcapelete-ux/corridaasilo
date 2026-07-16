
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Runner, Sponsor, Expense, Organizer, ExtraRevenue, TeamCoupon, TransferSettings, ViewState, UserSession } from './types';
import { getRunners, saveRunner, deleteRunner, getSponsors, saveSponsor, updateSponsor, deleteSponsor, updateRunner, getExpenses, saveExpense, deleteExpense, getOrganizers, updateOrganizer, deleteOrganizer, createOrganizerLogin, getExtraRevenues, saveExtraRevenue, deleteExtraRevenue, getCoupons, saveCoupon, updateCoupon, deleteCoupon, getTransferSettings, updateTransferSettings, getTeams, createTeam, deleteTeam } from './services/storageService';
import { supabase } from './services/supabaseClient';
import { getRunnerPaidValue, PREDEFINED_TEAMS } from './constants';
import { RegistrationForm } from './components/RegistrationForm';
import { RegistrationSuccess } from './components/RegistrationSuccess';
import { RunnerList } from './components/RunnerList';
import { TeamView } from './components/TeamView';
import { SponsorsManager } from './components/SponsorsManager';
import { ExpensesManager } from './components/ExpensesManager';
import { ExtraRevenueManager } from './components/ExtraRevenueManager';
import { OrganizersManager } from './components/OrganizersManager';
import { CouponsManager } from './components/CouponsManager';
import { LoginScreen } from './components/LoginScreen';
import { LandingPage } from './components/LandingPage';
import { ProofUploadScreen } from './components/ProofUploadScreen';
import { LayoutDashboard, UserPlus, Users, Flag, Menu, Timer, LogIn, Briefcase, LogOut, TrendingDown, Shield, CircleDollarSign, ArrowLeft, Ticket } from 'lucide-react';

// Carregado sob demanda: o dashboard (com a lib de gráficos) só é baixado
// por quem entra na área restrita, deixando a página pública mais leve
const Dashboard = lazy(() =>
  import('./components/Dashboard').then(m => ({ default: m.Dashboard }))
);

type AppMode = 'landing' | 'public' | 'registration_success' | 'auth_screen' | 'restricted_area' | 'proof_upload';

const App: React.FC = () => {
  const [runners, setRunners] = useState<Runner[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [organizers, setOrganizers] = useState<Organizer[]>([]);
  const [extraRevenues, setExtraRevenues] = useState<ExtraRevenue[]>([]);
  const [coupons, setCoupons] = useState<TeamCoupon[]>([]);
  const [transferSettings, setTransferSettings] = useState<TransferSettings | null>(null);
  // Lista de equipes/academias: seed com a constante e some para a versão
  // ao vivo do banco assim que carrega — funciona até para visitante anônimo
  const [officialTeams, setOfficialTeams] = useState<string[]>(PREDEFINED_TEAMS);

  // Alterado: O modo inicial agora é 'landing'
  const [mode, setMode] = useState<AppMode>('landing');
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [lastRegisteredAge, setLastRegisteredAge] = useState<number>(0);
  const [lastRegisteredDiscount, setLastRegisteredDiscount] = useState<number>(0);
  
  // Auth State
  const [userSession, setUserSession] = useState<UserSession | null>(null);

  // Carrega os dados do banco conforme o papel do usuário logado
  const loadDataForSession = async (session: UserSession) => {
    // Configurações de transferência são "melhor esforço": se a tabela ainda
    // não existir no banco (migração pendente), não pode travar o carregamento
    // dos corredores — só assume "sem restrição" e segue o app funcionando.
    getTransferSettings()
      .then(setTransferSettings)
      .catch(e => console.warn('Configurações de transferência indisponíveis:', e?.message));

    try {
      setRunners(await getRunners());

      if (session.role === 'admin') {
        const [sp, ex, org, rev, cp] = await Promise.all([
          getSponsors(),
          getExpenses(),
          getOrganizers(),
          getExtraRevenues(),
          getCoupons(),
        ]);
        setSponsors(sp);
        setExpenses(ex);
        setOrganizers(org);
        setExtraRevenues(rev);
        setCoupons(cp);
      }
    } catch (e: any) {
      alert(e?.message || 'Erro ao carregar dados do banco.');
    }
  };

  // Restaura a sessão do Supabase ao abrir o site (login fica salvo)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;
        if (!user) return;

        const { data: profile } = await supabase
          .from('organizers')
          .select('name, username, role, team_name')
          .eq('id', user.id)
          .single();

        if (!profile) return;

        const session: UserSession = {
          username: profile.name || profile.username,
          role: profile.role,
          teamAccess: profile.role === 'team_leader' ? profile.team_name : undefined,
        };
        setUserSession(session);
        loadDataForSession(session);
      } catch {
        // Sem sessão salva ou sem conexão: segue deslogado
      }
    })();
  }, []);

  // Lista de equipes: carrega sempre, mesmo sem login (o formulário público
  // de inscrição precisa dela). RLS da tabela "teams" já permite leitura
  // pública. Se falhar (sem internet), mantém a lista padrão como reserva.
  const refreshTeams = async () => {
    try {
      setOfficialTeams(await getTeams());
    } catch {
      // Mantém o valor atual (a constante padrão ou o último carregado)
    }
  };

  useEffect(() => {
    refreshTeams();
  }, []);

  const handleCreateTeam = async (name: string) => {
    try {
      await createTeam(name);
      await refreshTeams();
    } catch (e: any) {
      alert(e?.message || 'Erro ao criar equipe.');
    }
  };

  const handleDeleteTeam = async (name: string) => {
    try {
      await deleteTeam(name);
      await refreshTeams();
    } catch (e: any) {
      alert(e?.message || 'Erro ao remover equipe.');
    }
  };

  const refreshRunners = async () => {
    try {
      setRunners(await getRunners());
    } catch (e: any) {
      alert(e?.message || 'Erro ao atualizar a lista.');
    }
  };

  // --- Runner Actions ---
  const handleSaveRunner = async (runner: Runner): Promise<boolean> => {
    try {
      await saveRunner(runner);
    } catch (e: any) {
      alert(e?.message || 'Erro ao salvar inscrição.');
      return false;
    }

    setLastRegisteredAge(runner.age);
    setLastRegisteredDiscount(runner.couponDiscount || 0);

    if (mode === 'public') {
      setMode('registration_success');
    } else if (mode === 'restricted_area') {
      await refreshRunners();
      setCurrentView('runners');
    }
    return true;
  };

  const handleUpdateRunner = async (runner: Runner) => {
    try {
      await updateRunner(runner);
      await refreshRunners();
    } catch (e: any) {
      alert(e?.message || 'Erro ao atualizar inscrição.');
    }
  };

  const handleDeleteRunner = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este atleta?')) {
      try {
        await deleteRunner(id);
        await refreshRunners();
      } catch (e: any) {
        alert(e?.message || 'Erro ao remover inscrição.');
      }
    }
  };

  // --- Sponsor Actions ---
  const handleSaveSponsor = async (sponsor: Sponsor) => {
    try {
      await saveSponsor(sponsor);
      setSponsors(await getSponsors());
    } catch (e: any) {
      alert(e?.message || 'Erro ao salvar patrocinador.');
    }
  };

  const handleUpdateSponsor = async (sponsor: Sponsor) => {
    try {
      await updateSponsor(sponsor);
      setSponsors(await getSponsors());
    } catch (e: any) {
      alert(e?.message || 'Erro ao atualizar patrocinador.');
    }
  };

  const handleDeleteSponsor = async (id: string) => {
    if (confirm('Remover este patrocinador?')) {
      try {
        await deleteSponsor(id);
        setSponsors(await getSponsors());
      } catch (e: any) {
        alert(e?.message || 'Erro ao remover patrocinador.');
      }
    }
  };

  // --- Expense Actions ---
  const handleSaveExpense = async (expense: Expense) => {
    try {
      await saveExpense(expense);
      setExpenses(await getExpenses());
    } catch (e: any) {
      alert(e?.message || 'Erro ao salvar despesa.');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (confirm('Remover esta despesa?')) {
      try {
        await deleteExpense(id);
        setExpenses(await getExpenses());
      } catch (e: any) {
        alert(e?.message || 'Erro ao remover despesa.');
      }
    }
  };

  // --- Extra Revenue Actions ---
  const handleSaveExtraRevenue = async (revenue: ExtraRevenue) => {
    try {
      await saveExtraRevenue(revenue);
      setExtraRevenues(await getExtraRevenues());
    } catch (e: any) {
      alert(e?.message || 'Erro ao salvar receita.');
    }
  };

  const handleDeleteExtraRevenue = async (id: string) => {
    if (confirm('Remover esta receita?')) {
      try {
        await deleteExtraRevenue(id);
        setExtraRevenues(await getExtraRevenues());
      } catch (e: any) {
        alert(e?.message || 'Erro ao remover receita.');
      }
    }
  };

  // --- Organizer Actions ---
  const handleCreateOrganizerLogin = async (params: {
    email: string;
    password: string;
    name: string;
    username: string;
    teamName: string;
    role: 'admin' | 'team_leader';
    phone?: string;
  }) => {
    await createOrganizerLogin(params); // erros propagam para o formulário tratar
    setOrganizers(await getOrganizers());
  };

  const handleUpdateOrganizer = async (organizer: Organizer) => {
    try {
      await updateOrganizer(organizer);
      setOrganizers(await getOrganizers());
    } catch (e: any) {
      alert(e?.message || 'Erro ao atualizar organizador.');
    }
  };

  const handleDeleteOrganizer = async (id: string) => {
    if (confirm('Remover este organizador? Ele perderá o acesso ao sistema.')) {
      try {
        await deleteOrganizer(id);
        setOrganizers(await getOrganizers());
      } catch (e: any) {
        alert(e?.message || 'Erro ao remover organizador.');
      }
    }
  };

  // --- Coupon Actions ---
  const handleSaveCoupon = async (coupon: TeamCoupon) => {
    try {
      await saveCoupon(coupon);
      setCoupons(await getCoupons());
    } catch (e: any) {
      alert(e?.message || 'Erro ao salvar cupom.');
    }
  };

  const handleUpdateCoupon = async (coupon: TeamCoupon) => {
    try {
      await updateCoupon(coupon);
      setCoupons(await getCoupons());
    } catch (e: any) {
      alert(e?.message || 'Erro ao atualizar cupom.');
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    try {
      await deleteCoupon(id);
      setCoupons(await getCoupons());
    } catch (e: any) {
      alert(e?.message || 'Erro ao remover cupom.');
    }
  };

  // --- Transfer Settings Actions ---
  const handleUpdateTransferSettings = async (settings: TransferSettings) => {
    try {
      await updateTransferSettings(settings);
      setTransferSettings(await getTransferSettings());
    } catch (e: any) {
      alert(e?.message || 'Erro ao salvar configurações de transferência.');
    }
  };

  // Academias disponíveis para cupons/login (oficiais do banco + criadas por
  // inscrições/organizadores, para não perder equipes digitadas via "Outra")
  const getCouponTeams = () => {
    const set = new Set<string>(officialTeams.filter(t => t !== 'Avulso'));
    runners.forEach(r => { if (r.teamName && r.teamName !== 'Avulso') set.add(r.teamName); });
    organizers.forEach(o => { if (o.teamName) set.add(o.teamName); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  };

  // --- Auth & Permissions ---
  const handleLogin = (session: UserSession) => {
    setUserSession(session);
    setMode('restricted_area');
    loadDataForSession(session);

    // Redirecionamento inicial baseado no cargo
    if (session.role === 'team_leader') {
      setCurrentView('runners'); // Líder vê direto a lista
    } else {
      setCurrentView('dashboard'); // Admin vê dashboard
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Mesmo sem conexão, encerra a sessão local
    }
    setUserSession(null);
    setRunners([]);
    setSponsors([]);
    setExpenses([]);
    setOrganizers([]);
    setExtraRevenues([]);
    setCoupons([]);
    setTransferSettings(null);
    setMode('landing'); // Logout volta para a Landing Page
  };

  // Filtra corredores baseado no usuário logado
  const getVisibleRunners = () => {
    if (userSession?.role === 'team_leader' && userSession.teamAccess) {
      return runners.filter(r => r.teamName.toLowerCase() === userSession.teamAccess?.toLowerCase());
    }
    return runners;
  };

  const getExistingTeams = () => {
    const teams = new Set(runners.map(r => r.teamName).filter(t => t && t !== 'Avulso'));
    return Array.from(teams);
  };

  // Totals Calculation
  const totalSponsorRevenue = sponsors.reduce((acc, curr) => acc + (curr.isPaid ? curr.amount : 0), 0);
  const totalExtraRevenue = extraRevenues.reduce((acc, curr) => acc + curr.amount, 0);
  const totalRegistrationRevenue = runners.reduce((acc, r) => acc + (r.isPaid ? getRunnerPaidValue(r) : 0), 0);
  const totalExpensesValue = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  // Grand Total Revenue (Inscrições + Sponsors + Extra)
  const grandTotalRevenue = totalRegistrationRevenue + totalSponsorRevenue + totalExtraRevenue;

  const NavItem = ({ target, icon: Icon, label }: { target: ViewState; icon: any; label: string }) => (
    <button
      onClick={() => {
        setCurrentView(target);
        setIsSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        currentView === target
          ? 'bg-yellow-400 text-slate-900 shadow-lg shadow-yellow-400/25 font-bold'
          : 'text-slate-500 hover:bg-slate-800/60 hover:text-yellow-400'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  // RENDER: LANDING PAGE (NOVA TELA INICIAL)
  if (mode === 'landing') {
    return (
      <LandingPage 
        onStartRegistration={() => setMode('public')} 
        onAdminLogin={() => setMode(userSession ? 'restricted_area' : 'auth_screen')} 
        onOpenProofUpload={() => setMode('proof_upload')}
      />
    );
  }

  // RENDER: TELA DE UPLOAD DE COMPROVANTE
  if (mode === 'proof_upload') {
    return <ProofUploadScreen onBack={() => setMode('landing')} />;
  }

  // RENDER: TELA DE LOGIN
  if (mode === 'auth_screen') {
    return <LoginScreen onLogin={handleLogin} onBack={() => setMode('landing')} />;
  }

  // RENDER: TELA DE SUCESSO DO PIX
  if (mode === 'registration_success') {
    return <RegistrationSuccess onBack={() => setMode('landing')} isSenior={lastRegisteredAge >= 60} discount={lastRegisteredDiscount} />;
  }

  // RENDER: FORMULÁRIO PÚBLICO
  if (mode === 'public') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col relative overflow-hidden font-sans">
        {/* Brilhos de fundo (mesma identidade visual da tela inicial) */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-yellow-500 rounded-full blur-[120px] opacity-20"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-indigo-900 rounded-full blur-[100px] opacity-20"></div>
        </div>

        <nav className="relative z-20 flex justify-between items-center p-6 max-w-5xl mx-auto w-full">
          <div className="flex items-center gap-2 font-black italic tracking-tighter text-lg md:text-xl">
            <Timer size={22} className="text-yellow-400" aria-hidden="true" /> 2ª CORRIDA NOTURNA LSC
          </div>
          <button
            onClick={() => setMode('landing')}
            className="text-slate-400 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 border border-slate-800 px-3 py-1.5 rounded-full hover:bg-slate-900 transition-all backdrop-blur-md"
          >
            <ArrowLeft size={14} aria-hidden="true" /> Voltar
          </button>
        </nav>

        <main className="flex-1 p-4 md:p-8 relative z-10">
           <RegistrationForm
             onSave={handleSaveRunner}
             existingTeams={getExistingTeams()}
             officialTeams={officialTeams}
             isPublicView={true}
           />

           <div className="max-w-3xl mx-auto mt-4 mb-8 text-center text-slate-500 text-sm">
             <p className="font-bold text-slate-300">Laranjal Paulista</p>
             <p className="mt-2">&copy; 2026 Corrida Noturna LSC. Todos os direitos reservados.</p>
             <p className="mt-3 text-[11px] text-slate-600">
               Desenvolvido por{' '}
               <a
                 href="https://wa.me/5515991334809"
                 target="_blank"
                 rel="noopener noreferrer"
                 className="text-slate-500 hover:text-yellow-400 font-bold transition-colors"
               >
                 Marcelo Capelete
               </a>
             </p>
           </div>
        </main>
      </div>
    );
  }

  // RENDER: ÁREA RESTRITA (ADMIN / TEAM LEADER)
  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative z-30 w-72 h-full bg-slate-900 border-r border-slate-800/50 flex flex-col
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-7 flex items-center gap-3 border-b border-slate-800/50">
          <div className="bg-yellow-400 p-2 rounded-lg text-slate-900 shadow-lg shadow-yellow-400/20">
            <Timer size={22} />
          </div>
          <div>
            <h1 className="text-base font-black text-white italic tracking-tighter leading-tight">2ª CORRIDA<br />NOTURNA LSC</h1>
            <p className="text-xs text-yellow-400/80 mt-0.5">
              {userSession?.role === 'admin' ? 'Painel Admin' : `Líder: ${userSession?.username}`}
            </p>
          </div>
        </div>

        <nav className="flex-1 p-5 space-y-1 overflow-y-auto">
          {userSession?.role === 'admin' && (
            <NavItem target="dashboard" icon={LayoutDashboard} label="Dashboard" />
          )}

          <NavItem target="runners" icon={Users} label="Corredores" />

          <NavItem target="registration" icon={UserPlus} label="Novo Cadastro" />

          {userSession?.role === 'admin' && (
            <>
              <NavItem target="teams" icon={Flag} label="Equipes" />
              <div className="py-3">
                <div className="h-px bg-slate-800/80 w-full" />
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-3 px-4">Financeiro</p>
              </div>
              <NavItem target="sponsors" icon={Briefcase} label="Patrocinadores" />
              <NavItem target="extra_revenue" icon={CircleDollarSign} label="Receita Extra" />
              <NavItem target="expenses" icon={TrendingDown} label="Despesas" />
              <div className="py-3">
                <div className="h-px bg-slate-800/80 w-full" />
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-3 px-4">Gestão</p>
              </div>
              <NavItem target="organizers" icon={Shield} label="Organizadores" />
              <NavItem target="coupons" icon={Ticket} label="Cupons" />
            </>
          )}
        </nav>

        <div className="p-5 border-t border-slate-800/50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-red-400 hover:bg-slate-800/60 rounded-xl transition-all text-sm py-2.5 font-bold"
          >
            <LogOut size={16} /> Encerrar Sessão
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-slate-900 border-b border-slate-800/50 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-black text-white italic">
            <Timer size={20} className="text-yellow-400"/> CORRIDA NOTURNA LSC
          </div>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-400 hover:text-white transition-colors">
            <Menu size={24} />
          </button>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-auto p-4 md:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto">
            {currentView === 'dashboard' && (
              <Suspense fallback={<div className="text-slate-400 font-medium p-8 text-center animate-pulse">Carregando dashboard...</div>}>
                <Dashboard
                  runners={runners}
                  totalRevenue={grandTotalRevenue}
                  totalExpenses={totalExpensesValue}
                />
              </Suspense>
            )}
            
            {currentView === 'registration' && (
              <RegistrationForm
                onSave={handleSaveRunner}
                existingTeams={getExistingTeams()}
                officialTeams={officialTeams}
                isPublicView={false}
                userSession={userSession}
              />
            )}
            
            {currentView === 'runners' && (
              <RunnerList
                runners={getVisibleRunners()}
                onDelete={handleDeleteRunner}
                onUpdate={handleUpdateRunner}
                userSession={userSession}
                transferSettings={transferSettings}
                onUpdateTransferSettings={handleUpdateTransferSettings}
              />
            )}
            
            {currentView === 'teams' && (
              <TeamView
                runners={runners}
                officialTeams={officialTeams}
                onCreateTeam={handleCreateTeam}
                onDeleteTeam={handleDeleteTeam}
              />
            )}
            
            {currentView === 'sponsors' && (
              <SponsorsManager 
                sponsors={sponsors} 
                onSave={handleSaveSponsor} 
                onUpdate={handleUpdateSponsor}
                onDelete={handleDeleteSponsor}
              />
            )}

            {currentView === 'extra_revenue' && (
              <ExtraRevenueManager
                revenues={extraRevenues}
                runners={runners}
                onSave={handleSaveExtraRevenue}
                onDelete={handleDeleteExtraRevenue}
              />
            )}

            {currentView === 'expenses' && (
              <ExpensesManager 
                expenses={expenses}
                onSave={handleSaveExpense}
                onDelete={handleDeleteExpense}
              />
            )}

            {currentView === 'coupons' && (
              <CouponsManager
                coupons={coupons}
                teams={getCouponTeams()}
                onSave={handleSaveCoupon}
                onUpdate={handleUpdateCoupon}
                onDelete={handleDeleteCoupon}
              />
            )}

            {currentView === 'organizers' && (
              <OrganizersManager
                organizers={organizers}
                teams={getCouponTeams()}
                onCreateLogin={handleCreateOrganizerLogin}
                onUpdate={handleUpdateOrganizer}
                onDelete={handleDeleteOrganizer}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;