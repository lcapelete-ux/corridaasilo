import React, { useState, useRef } from 'react';
import { Gender, Runner, ShirtSize, TeamCoupon, UserSession } from '../types';
import { getTrainingTip } from '../services/geminiService';
import { getRunners } from '../services/storageService';
import { Save, Calendar, MapPin, CreditCard, Flag, Upload, CheckCircle, XCircle, DollarSign, FileText, AlertCircle, Ticket } from 'lucide-react';
import { getRegistrationFee, calcCouponDiscount, REGISTRATION_PRICE, PREDEFINED_TEAMS } from '../constants';

interface RegistrationFormProps {
  onSave: (runner: Runner) => void;
  existingTeams: string[];
  isPublicView?: boolean;
  userSession?: UserSession | null;
  coupons?: TeamCoupon[];
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

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSave, existingTeams, isPublicView = false, userSession, coupons = [] }) => {
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

  // --- Cupom de desconto da academia ---
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<TeamCoupon | null>(null);
  const [couponError, setCouponError] = useState('');
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
      // Mudou o nome da equipe digitado: cupom aplicado deixa de valer
      if (name === 'teamName' && appliedCoupon) {
        setAppliedCoupon(null);
        setCouponError('');
      }
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
    // Trocou de academia: o cupom precisa ser validado de novo
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
  };

  const handleApplyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    setCouponError('');

    if (!code) {
      setCouponError('Digite o código do cupom.');
      return;
    }

    const coupon = coupons.find(c => c.code.toUpperCase() === code);
    if (!coupon) {
      setCouponError('Cupom não encontrado. Confira o código com a sua academia.');
      setAppliedCoupon(null);
      return;
    }

    if (coupon.teamName.toLowerCase() !== formData.teamName.toLowerCase()) {
      setCouponError(`Este cupom não pertence à academia selecionada (${formData.teamName || 'nenhuma'}).`);
      setAppliedCoupon(null);
      return;
    }

    setAppliedCoupon(coupon);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
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

  // Valores para o resumo (idade 60+ tem preço reduzido; sem nascimento, assume preço normal)
  const ageForFee = formData.birthDate ? calculateAge(formData.birthDate) : 0;
  const baseFee = formData.birthDate ? getRegistrationFee(ageForFee) : REGISTRATION_PRICE;
  const couponDiscountValue = appliedCoupon ? calcCouponDiscount(baseFee, appliedCoupon) : 0;
  const finalFee = Math.max(0, baseFee - couponDiscountValue);
  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

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

    // Desconto do cupom calculado sobre o valor real da inscrição (60+ paga menos)
    const feeForRunner = getRegistrationFee(ageCalculated);
    const discountForRunner = appliedCoupon ? calcCouponDiscount(feeForRunner, appliedCoupon) : 0;

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
      paymentProof: formData.paymentProof,
      ...(appliedCoupon && discountForRunner > 0 && {
        couponCode: appliedCoupon.code,
        couponDiscount: discountForRunner,
      }),
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
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');

    if (!isPublicView) {
       alert("Cadastrado com sucesso!");
    }
  };

  const inputClass = isPublicView
    ? "w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all"
    : "w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all [color-scheme:light]";

  const selectClass = isPublicView
    ? "w-full px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all [color-scheme:dark]"
    : "w-full px-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all [color-scheme:light]";

  const labelClass = isPublicView
    ? "block text-sm font-bold text-slate-300 mb-1"
    : "block text-sm font-bold text-slate-800 mb-1";

  const optionClass = "text-slate-900 bg-white";

  return (
    <div className={isPublicView
      ? "max-w-3xl mx-auto bg-slate-900/60 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-800 overflow-hidden my-8 relative z-10"
      : "max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden"
    }>
      {isPublicView && (
        <div className="relative py-10 px-6 flex flex-col items-center justify-center text-center border-b border-slate-800 overflow-hidden">
          <div className="absolute top-[-60%] left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-yellow-500 rounded-full blur-[100px] opacity-20 pointer-events-none" aria-hidden="true"></div>
          <span className="relative z-10 text-yellow-400 text-xs font-bold uppercase tracking-widest border border-yellow-400/40 px-3 py-1 rounded-full mb-3">
            2ª Corrida Noturna LSC
          </span>
          <h2 className="relative z-10 text-3xl md:text-4xl font-black italic tracking-tighter text-white neon-text">
            FICHA DE <span className="text-yellow-400">INSCRIÇÃO</span>
          </h2>
          <p className="relative z-10 mt-2 flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-wider">
            <MapPin size={14} className="text-yellow-400" aria-hidden="true" /> Laranjal Paulista/SP
          </p>
        </div>
      )}

      <div className="p-8">
        {!isPublicView && (
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="bg-yellow-400 p-2 rounded-lg text-slate-900">
              <Save size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Nova Inscrição <span className="text-slate-400 font-medium text-base">{userSession?.role === 'team_leader' ? '(Líder de Equipe)' : '(Admin)'}</span>
            </h2>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Nome Completo */}
            <div className="col-span-2">
              <label className={labelClass}>Nome Completo</label>
              <input
                type="text"
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                className={inputClass}
                placeholder="Ex: Maria Silva"
              />
            </div>

            {/* CPF */}
            <div className="col-span-2 md:col-span-1">
              <label className={`${labelClass} flex items-center gap-1`}>
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
                    isPublicView
                      ? `bg-slate-800/60 text-white placeholder-slate-500 ${errors.cpf ? 'border-red-500 focus:ring-red-500/30' : 'border-slate-700 focus:ring-yellow-400/40 focus:border-yellow-400'}`
                      : `bg-white text-slate-900 placeholder-slate-400 ${errors.cpf ? 'border-red-400 bg-red-50 focus:ring-red-200' : 'border-slate-300 focus:ring-yellow-400 focus:border-yellow-400'}`
                  }`}
                  placeholder="000.000.000-00"
                />
                {errors.cpf && (
                  <div className={`absolute right-3 top-1/2 -translate-y-1/2 animate-fade-in ${isPublicView ? 'text-red-400' : 'text-red-500'}`}>
                    <AlertCircle size={18} />
                  </div>
                )}
              </div>
              {errors.cpf && <p className={`text-xs font-bold mt-1 ml-1 ${isPublicView ? 'text-red-400' : 'text-red-500'}`}>{errors.cpf}</p>}
            </div>

            {/* Data Nascimento */}
            <div className="col-span-2 md:col-span-1">
              <label className={`${labelClass} flex items-center gap-1`}>
                <Calendar size={14} /> Data de Nascimento
              </label>
              <input
                type="date"
                name="birthDate"
                required
                value={formData.birthDate}
                onChange={handleChange}
                className={`${inputClass} ${isPublicView ? '[color-scheme:dark]' : ''}`}
              />
            </div>

            {/* Cidade */}
            <div className="col-span-2 md:col-span-1">
              <label className={`${labelClass} flex items-center gap-1`}>
                <MapPin size={14} /> Cidade onde reside
              </label>
              <div className="space-y-2">
                <select
                  name="citySelect"
                  value={isCustomCity ? 'Outra' : formData.city}
                  onChange={handleCitySelectChange}
                  className={selectClass}
                >
                  <option value="" disabled className={optionClass}>Selecione uma cidade...</option>
                  {PREDEFINED_CITIES.map(city => (
                    <option key={city} value={city} className={optionClass}>{city}</option>
                  ))}
                  <option value="Outra" className={optionClass}>Outra (Digitar nome)</option>
                </select>

                {isCustomCity && (
                  <input
                    type="text"
                    name="city"
                    required
                    value={formData.city}
                    onChange={handleChange}
                    className={`${inputClass} animate-fade-in`}
                    placeholder="Digite o nome da cidade"
                    autoFocus
                  />
                )}
              </div>
            </div>

            {/* Gênero */}
            <div className="col-span-2 md:col-span-1">
              <label className={labelClass}>Sexo</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className={selectClass}
              >
                {Object.values(Gender).map(g => (
                  <option key={g} value={g} className={optionClass}>{g}</option>
                ))}
              </select>
            </div>

             {/* Tamanho Camiseta */}
             <div className="col-span-2 md:col-span-1">
              <label className={labelClass}>Tamanho da Camiseta</label>
              <select
                name="shirtSize"
                value={formData.shirtSize}
                onChange={handleChange}
                className={selectClass}
              >
                {Object.values(ShirtSize).map(s => (
                  <option key={s} value={s} className={optionClass}>{s}</option>
                ))}
              </select>
            </div>

            {/* Email */}
            <div className="col-span-2 md:col-span-1">
              <label className={labelClass}>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={inputClass}
                placeholder="contato@email.com"
              />
            </div>

            {/* Equipe */}
            <div className="col-span-2">
              <label className={`${labelClass} flex items-center gap-1`}>
                <Flag size={14} /> Nome da Equipe
              </label>
              <div className="space-y-2">
                <select
                  name="teamSelect"
                  value={isCustomTeam ? 'Outra' : formData.teamName}
                  onChange={handleTeamSelectChange}
                  disabled={userSession?.role === 'team_leader' && !!userSession.teamAccess}
                  className={`${selectClass} ${
                    userSession?.role === 'team_leader' ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="Avulso" className={optionClass}>Avulso (Sem equipe)</option>
                  {PREDEFINED_TEAMS.map(team => (
                    <option key={team} value={team} className={optionClass}>{team}</option>
                  ))}
                  <option value="Outra" className={optionClass}>Outra (Digitar nome da equipe)</option>
                </select>

                {isCustomTeam && (
                  <input
                    type="text"
                    name="teamName"
                    required
                    value={formData.teamName}
                    onChange={handleChange}
                    className={`${inputClass} animate-fade-in`}
                    placeholder="Digite o nome da equipe"
                    autoFocus
                  />
                )}
              </div>
            </div>

            {/* Cupom de Desconto da Academia */}
            {formData.teamName && formData.teamName !== 'Avulso' && (
              <div className="col-span-2 animate-fade-in">
                <label className={`${labelClass} flex items-center gap-1`}>
                  <Ticket size={14} /> Cupom da Academia <span className={isPublicView ? 'text-slate-500 font-normal' : 'text-slate-400 font-normal'}>(opcional)</span>
                </label>

                {appliedCoupon ? (
                  <div className={`flex items-center justify-between rounded-lg px-4 py-3 border ${
                    isPublicView
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-emerald-50 border-emerald-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={18} className={isPublicView ? 'text-emerald-400' : 'text-emerald-600'} />
                      <div>
                        <p className={`font-bold text-sm ${isPublicView ? 'text-emerald-400' : 'text-emerald-700'}`}>
                          Cupom {appliedCoupon.code} aplicado!
                        </p>
                        <p className={`text-xs ${isPublicView ? 'text-emerald-500/80' : 'text-emerald-600'}`}>
                          Desconto de {appliedCoupon.discountType === 'percent'
                            ? `${appliedCoupon.value}%`
                            : `R$ ${fmt(appliedCoupon.value)}`} — Academia {appliedCoupon.teamName}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className={`text-xs font-bold underline ${isPublicView ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Remover
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={e => { setCouponInput(e.target.value.toUpperCase()); setCouponError(''); }}
                      className={`${inputClass} uppercase font-mono flex-1`}
                      placeholder="Ex: LUSO10"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className={`px-5 rounded-lg font-bold text-sm transition-all shrink-0 ${
                        isPublicView
                          ? 'bg-yellow-400 text-slate-900 hover:bg-yellow-300'
                          : 'bg-slate-900 text-yellow-400 hover:bg-slate-800'
                      }`}
                    >
                      Aplicar
                    </button>
                  </div>
                )}

                {couponError && (
                  <p className={`text-xs mt-2 font-bold flex items-center gap-1 ${isPublicView ? 'text-red-400' : 'text-red-600'}`}>
                    <AlertCircle size={12} /> {couponError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Resumo do Valor da Inscrição */}
          {appliedCoupon && (
            <div className={`mt-6 rounded-xl p-5 border animate-fade-in ${
              isPublicView
                ? 'bg-slate-800/60 border-slate-700'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${isPublicView ? 'text-slate-500' : 'text-slate-400'}`}>
                Resumo da Inscrição
              </p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className={isPublicView ? 'text-slate-400' : 'text-slate-600'}>
                    Inscrição{formData.birthDate && ageForFee >= 60 ? ' (60+)' : ''}
                  </span>
                  <span className={`font-mono ${isPublicView ? 'text-slate-300' : 'text-slate-700'}`}>R$ {fmt(baseFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isPublicView ? 'text-emerald-400' : 'text-emerald-600'}>
                    Cupom {appliedCoupon.code}
                  </span>
                  <span className={`font-mono font-bold ${isPublicView ? 'text-emerald-400' : 'text-emerald-600'}`}>− R$ {fmt(couponDiscountValue)}</span>
                </div>
                <div className={`flex justify-between pt-2 mt-1 border-t ${isPublicView ? 'border-slate-700' : 'border-slate-200'}`}>
                  <span className={`font-bold ${isPublicView ? 'text-white' : 'text-slate-900'}`}>Total a pagar</span>
                  <span className={`font-mono font-black text-lg ${isPublicView ? 'text-yellow-400' : 'text-slate-900'}`}>R$ {fmt(finalFee)}</span>
                </div>
              </div>
            </div>
          )}

          {/* SESSÃO FINANCEIRA (APENAS ORGANIZADORES) */}
          {userSession && (
            <div className="mt-8 bg-slate-50 p-6 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
                <DollarSign size={18} className="text-emerald-600" />
                <h3 className="font-bold text-slate-800">Financeiro <span className="text-slate-400 font-medium text-sm">(Área Restrita)</span></h3>
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
                      <><CheckCircle size={18} /> Comprovante Anexado</>
                    ) : (
                      <><Upload size={18} /> Fazer Upload do Comprovante</>
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

          <div className={`pt-6 flex justify-end ${isPublicView ? 'border-t border-slate-800' : 'border-t border-slate-100'}`}>
            <button
              type="submit"
              className={isPublicView
                ? "group relative w-full md:w-auto inline-flex items-center justify-center gap-3 bg-yellow-400 text-slate-900 px-8 py-5 rounded-xl font-black italic tracking-wider uppercase text-lg hover:bg-white hover:scale-105 transition-all duration-300 shadow-[0_0_30px_rgba(250,204,21,0.4)] hover:shadow-[0_0_50px_rgba(250,204,21,0.6)] overflow-hidden"
                : "w-full md:w-auto bg-slate-900 text-yellow-400 px-8 py-4 rounded-xl font-black italic tracking-wider hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl text-lg flex justify-center items-center gap-2 uppercase"
              }
            >
              {isPublicView ? (
                <>
                  <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-25deg] group-hover:animate-shimmer" aria-hidden="true"></div>
                  <span className="relative z-10 flex items-center gap-2">
                    <Save size={20} aria-hidden="true" /> Confirmar Inscrição
                  </span>
                </>
              ) : (
                'Confirmar Inscrição'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
