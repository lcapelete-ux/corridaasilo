import React, { useState, useRef } from 'react';
import { Gender, Runner, ShirtSize, UserSession } from '../types';
import { getTrainingTip } from '../services/geminiService';
import { getRunners } from '../services/storageService';
import { Save, Calendar, MapPin, CreditCard, Flag, Upload, CheckCircle, XCircle, DollarSign, FileText, AlertCircle } from 'lucide-react';

interface RegistrationFormProps {
  onSave: (runner: Runner) => void;
  existingTeams: string[];
  isPublicView?: boolean;
  userSession?: UserSession | null;
}

const PREDEFINED_CITIES = [
  'Laranjal Paulista',
  'Cerquilho',
  'Cesário Lange',
  'Conchas',
  'Jumirim',
  'Pereiras',
  'Tiete'
];

const PREDEFINED_TEAMS = [
  'Ai que Fome (Tiete)',
  'Alcatéia',
  'Ecort (Tiete)',
  'Luso',
  'Runners Sempre Jovens',
  'Spazio',
  'Team Dani',
  'Time Runners (Tiete)',
  'Tribo'
];

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSave, existingTeams, isPublicView = false, userSession }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    cpf: '',
    city: '',
    birthDate: '',
    gender: Gender.MALE,
    teamName: 'Avulso',
    shirtSize: ShirtSize.M,
    isPaid: false,
    paymentProof: ''
  });

  const [errors, setErrors] = useState<{ cpf?: string }>({});
  const [isCustomCity, setIsCustomCity] = useState(false);
  const [isCustomTeam, setIsCustomTeam] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill team if team leader
  React.useEffect(() => {
    if (userSession?.role === 'team_leader' && userSession.teamAccess) {
      setFormData(prev => ({ ...prev, teamName: userSession.teamAccess! }));
    }
  }, [userSession]);

  const handleCpfChange = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'cpf') {
      const formattedCpf = handleCpfChange(value);
      setFormData(prev => ({ ...prev, [name]: formattedCpf }));
      // Limpa o erro se o usuário estiver corrigindo
      if (formattedCpf.length === 14) {
         setErrors(prev => ({ ...prev, cpf: undefined }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'cpf') {
      if (value.length > 0 && value.length < 14) {
        setErrors(prev => ({ ...prev, cpf: 'CPF incompleto (000.000.000-00)' }));
      } else {
        setErrors(prev => ({ ...prev, cpf: undefined }));
      }
    }
  };

  const handleCitySelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'Outra') {
      setIsCustomCity(true);
      setFormData(prev => ({ ...prev, city: '' }));
    } else {
      setIsCustomCity(false);
      setFormData(prev => ({ ...prev, city: value }));
    }
  };

  const handleTeamSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'Outra') {
      setIsCustomTeam(true);
      setFormData(prev => ({ ...prev, teamName: '' }));
    } else {
      setIsCustomTeam(false);
      setFormData(prev => ({ ...prev, teamName: value }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, paymentProof: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateAge = (birthDateString: string): number => {
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.cpf || !formData.birthDate || !formData.city) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (formData.cpf.length !== 14) {
      setErrors(prev => ({ ...prev, cpf: 'CPF inválido ou incompleto.' }));
      alert("Por favor, corrija o CPF antes de continuar.");
      return;
    }

    // Verificação de duplicidade
    const existingRunners = getRunners();
    
    // 1. Verifica CPF duplicado
    const duplicateCpf = existingRunners.find(r => r.cpf === formData.cpf);
    if (duplicateCpf) {
      setErrors(prev => ({ ...prev, cpf: 'CPF já cadastrado.' }));
      alert("Erro: Já existe um atleta cadastrado com este CPF.");
      return;
    }

    // 2. Verifica Email duplicado (apenas se preenchido)
    if (formData.email) {
      const duplicateEmail = existingRunners.find(r => r.email.toLowerCase() === formData.email.toLowerCase());
      if (duplicateEmail) {
        alert("Erro: Este e-mail já está sendo utilizado em outra inscrição.");
        return;
      }
    }

    const ageCalculated = calculateAge(formData.birthDate);
    
    if (ageCalculated < 10) {
      alert("Idade mínima de 10 anos.");
      return;
    }

    const newRunner: Runner = {
      id: crypto.randomUUID(),
      fullName: formData.fullName,
      email: formData.email,
      cpf: formData.cpf,
      city: formData.city,
      birthDate: formData.birthDate,
      age: ageCalculated,
      gender: formData.gender as Gender,
      teamName: formData.teamName || 'Avulso',
      shirtSize: formData.shirtSize as ShirtSize,
      registrationDate: new Date().toISOString(),
      isPaid: formData.isPaid,
      paymentProof: formData.paymentProof
    };

    onSave(newRunner);
    
    setFormData({
      fullName: '',
      email: '',
      cpf: '',
      city: '',
      birthDate: '',
      gender: Gender.MALE,
      teamName: userSession?.role === 'team_leader' && userSession.teamAccess ? userSession.teamAccess : 'Avulso',
      shirtSize: ShirtSize.M,
      isPaid: false,
      paymentProof: ''
    });
    setErrors({});
    setIsCustomCity(false);
    setIsCustomTeam(false);
    
    if (!isPublicView) {
       alert("Cadastrado com sucesso!");
    }
  };

  return (
    <div className={`max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden ${isPublicView ? 'my-8' : ''}`}>
      {isPublicView && (
        <div className="bg-[#FFD700] py-12 px-4 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Logo Recreation - Cleaner and Smaller */}
          <div className="relative flex flex-col items-center justify-center transform -skew-x-6 select-none">
            
            {/* Main Text Stack */}
            <span className="text-5xl md:text-6xl font-black tracking-tighter drop-shadow-sm leading-none text-slate-900">LSC</span>
            <span className="text-6xl md:text-7xl font-black tracking-tighter drop-shadow-sm leading-none text-slate-900 -mt-2">NIGHT</span>
            <span className="text-[5rem] md:text-[6rem] font-black tracking-tighter drop-shadow-sm leading-[0.75] text-slate-900 -mt-3">RUN</span>
            
            {/* Subtitle */}
            <div className="mt-3 border-t-4 border-slate-900 w-full pt-1">
               <span className="block text-center text-lg md:text-xl font-black tracking-widest uppercase text-slate-900">Laranjal Paulista</span>
            </div>

          </div>
        </div>
      )}

      <div className="p-8">
        {!isPublicView && (
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="bg-yellow-400 p-2 rounded-lg text-slate-900">
              <Save size={24} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">
              Nova Inscrição {userSession?.role === 'team_leader' ? '(Líder de Equipe)' : '(Admin)'}
            </h2>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Nome Completo */}
            <div className="col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">Nome Completo</label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all"
                placeholder="Ex: Maria Silva"
              />
            </div>

            {/* CPF */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1">
                <CreditCard size={14} /> CPF
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="cpf"
                  required
                  maxLength={14}
                  value={formData.cpf}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 outline-none transition-all ${
                    errors.cpf 
                      ? 'border-red-400 focus:ring-red-200 focus:border-red-400 bg-red-50' 
                      : 'border-slate-200 focus:ring-yellow-400 focus:border-yellow-400'
                  }`}
                  placeholder="000.000.000-00"
                />
                {errors.cpf && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 animate-fade-in">
                    <AlertCircle size={18} />
                  </div>
                )}
              </div>
              {errors.cpf && <p className="text-xs text-red-500 font-bold mt-1 ml-1">{errors.cpf}</p>}
            </div>

            {/* Data Nascimento */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Calendar size={14} /> Data de Nascimento
              </label>
              <input
                type="date"
                name="birthDate"
                required
                value={formData.birthDate}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all"
              />
            </div>

            {/* Cidade */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin size={14} /> Cidade onde reside
              </label>
              <div className="space-y-2">
                <select 
                  name="citySelect"
                  value={isCustomCity ? 'Outra' : formData.city}
                  onChange={handleCitySelectChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none bg-white transition-all"
                >
                  <option value="" disabled>Selecione uma cidade...</option>
                  {PREDEFINED_CITIES.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                  <option value="Outra">Outra (Digitar nome)</option>
                </select>

                {isCustomCity && (
                  <input
                    type="text"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all animate-fade-in"
                    placeholder="Digite o nome da cidade"
                    autoFocus
                  />
                )}
              </div>
            </div>

            {/* Gênero */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-bold text-slate-700 mb-1">Sexo</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none bg-white"
              >
                {Object.values(Gender).map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

             {/* Tamanho Camiseta */}
             <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-bold text-slate-700 mb-1">Tamanho da Camiseta</label>
              <select
                name="shirtSize"
                value={formData.shirtSize}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none bg-white"
              >
                {Object.values(ShirtSize).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Email */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-sm font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all"
                placeholder="contato@email.com"
              />
            </div>

            {/* Equipe */}
            <div className="col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Flag size={14} /> Nome da Equipe
              </label>
              <div className="space-y-2">
                <select 
                  name="teamSelect"
                  value={isCustomTeam ? 'Outra' : formData.teamName}
                  onChange={handleTeamSelectChange}
                  disabled={userSession?.role === 'team_leader' && !!userSession.teamAccess}
                  className={`w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none bg-white transition-all ${
                    userSession?.role === 'team_leader' ? 'bg-slate-100 text-slate-500' : ''
                  }`}
                >
                  <option value="Avulso">Avulso (Sem equipe)</option>
                  {PREDEFINED_TEAMS.map(team => (
                    <option key={team} value={team}>{team}</option>
                  ))}
                  <option value="Outra">Outra (Digitar nome da equipe)</option>
                </select>

                {isCustomTeam && (
                  <input
                    type="text"
                    name="teamName"
                    required
                    value={formData.teamName}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all animate-fade-in"
                    placeholder="Digite o nome da equipe"
                    autoFocus
                  />
                )}
              </div>
            </div>
          </div>

          {/* SESSÃO FINANCEIRA (APENAS ORGANIZADORES) */}
          {userSession && (
            <div className="mt-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
               <div className="flex items-center gap-2 mb-4 text-slate-800 border-b border-slate-200 pb-2">
                 <DollarSign size={20} className="text-emerald-600" />
                 <h3 className="font-bold text-lg">Financeiro (Área Restrita)</h3>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {/* Upload Comprovante */}
                 <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Comprovante de Pagamento</label>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full py-3 px-4 rounded-lg border-2 border-dashed flex items-center justify-center gap-2 transition-colors ${
                        formData.paymentProof 
                          ? 'border-emerald-400 bg-emerald-50 text-emerald-700' 
                          : 'border-slate-300 bg-white text-slate-500 hover:bg-slate-50 hover:border-slate-400'
                      }`}
                    >
                      {formData.paymentProof ? (
                        <>
                          <CheckCircle size={18} /> Comprovante Anexado
                        </>
                      ) : (
                        <>
                          <Upload size={18} /> Fazer Upload do Comprovante
                        </>
                      )}
                    </button>
                    {formData.paymentProof && (
                      <p className="text-xs text-center mt-1 text-emerald-600 font-medium cursor-pointer hover:underline" onClick={() => setFormData(prev => ({...prev, paymentProof: ''}))}>
                        Remover/Trocar
                      </p>
                    )}
                 </div>

                 {/* Status Toggle */}
                 <div className="flex flex-col justify-center">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Status do Pagamento</label>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, isPaid: !prev.isPaid }))}
                      className={`w-full py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                        formData.isPaid
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                          : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      {formData.isPaid ? (
                        <><CheckCircle size={20} /> PAGO</>
                      ) : (
                        <><XCircle size={20} /> PENDENTE</>
                      )}
                    </button>
                 </div>
               </div>
            </div>
          )}

          <div className="pt-6 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="w-full md:w-auto bg-slate-900 text-yellow-400 px-8 py-4 rounded-xl font-black italic tracking-wider hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl text-lg flex justify-center items-center gap-2 uppercase"
            >
              Confirmar Inscrição
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};