import React, { useState, useRef } from 'react';
import { Gender, Runner, ShirtSize, TeamCoupon, UserSession, RaceModality } from '../types';
import { getTrainingTip } from '../services/geminiService';
import { findCouponByCode } from '../services/storageService';
import { prepareProofFile } from '../services/imageUtils';
import { Save, Calendar, MapPin, CreditCard, Flag, Upload, CheckCircle, XCircle, DollarSign, FileText, AlertCircle, Ticket, ShieldAlert, UserCheck, Trophy } from 'lucide-react';
import { getRegistrationFee, calcCouponDiscount, REGISTRATION_PRICE, REGISTRATION_PRICE_SENIOR, SENIOR_AGE, PREDEFINED_TEAMS, MIN_AGE, MINOR_AGE, AGE_REF_DATE, ageOnDate, isMinorAtEvent, getRunnerCategory, MODALITIES } from '../constants';
import { RegulationModal } from './RegulationModal';

interface RegistrationFormProps {
  onSave: (runner: Runner) => Promise<boolean>;
  existingTeams: string[];
  officialTeams?: string[]; // Lista de equipes cadastradas (banco); sem isso, usa PREDEFINED_TEAMS
  isPublicView?: boolean;
  userSession?: UserSession | null;
  coupons?: TeamCoupon[]; // Cupons disponíveis (área restrita): botão de aplicar direto
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

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSave, existingTeams, officialTeams, isPublicView = false, userSession, coupons }) => {
  // "Avulso" já tem opção própria no <select>: não repete aqui
  const teamOptions = (officialTeams && officialTeams.length > 0 ? officialTeams : PREDEFINED_TEAMS)
    .filter(t => t !== 'Avulso');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    cpf: '',
    city: '',
    birthDate: '',
    gender: Gender.MALE,
    teamName: 'Avulso',
    shirtSize: ShirtSize.M,
    modality: '5k' as RaceModality,
    guardianName: '',
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
  const [couponChecking, setCouponChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // --- Regulamento da prova (obrigatório na inscrição pública) ---
  const [agreedToRules, setAgreedToRules] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [rulesError, setRulesError] = useState(false);
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
      // Nascimento mudou para 60+: remove o cupom (meia inscrição não acumula)
      if (name === 'birthDate' && appliedCoupon && value && calculateAge(value) >= SENIOR_AGE) {
        setAppliedCoupon(null);
        setCouponInput('');
        setCouponError('Cupom removido: atletas 60+ já pagam meia inscrição e o desconto não acumula.');
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

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    setCouponError('');

    if (isSeniorRegistrant) {
      setCouponError(`Atletas 60+ já pagam meia inscrição (R$ ${REGISTRATION_PRICE_SENIOR.toFixed(2).replace('.', ',')}). O desconto não acumula com cupom.`);
      setAppliedCoupon(null);
      return;
    }

    if (!code) {
      setCouponError('Digite o código do cupom.');
      return;
    }

    setCouponChecking(true);
    try {
      const coupon = await findCouponByCode(code);

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
    } catch (err: any) {
      setCouponError(err?.message || 'Erro ao validar o cupom. Tente novamente.');
      setAppliedCoupon(null);
    } finally {
      setCouponChecking(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
  };

  // Aplica direto o cupom da equipe (botão), sem precisar digitar o código.
  const applyCouponDirect = (coupon: TeamCoupon) => {
    setCouponError('');
    if (coupon.blocked) {
      setCouponError('Este cupom está bloqueado pela organização.');
      return;
    }
    if (isSeniorRegistrant) {
      setCouponError(`Atletas 60+ já pagam meia inscrição (R$ ${REGISTRATION_PRICE_SENIOR.toFixed(2).replace('.', ',')}). O desconto não acumula com cupom.`);
      return;
    }
    setAppliedCoupon(coupon);
    setCouponInput(coupon.code);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const prepared = await prepareProofFile(file);
      setFormData(prev => ({ ...prev, paymentProof: prepared }));
    } catch (err: any) {
      alert(err?.message || 'Não foi possível preparar o comprovante.');
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
  // 60+ já tem meia inscrição: cupom de academia não acumula
  const isSeniorRegistrant = !!formData.birthDate && ageForFee >= SENIOR_AGE;
  // Idade considerada para mínimo/categoria (a que terá em 31/12/2026, conforme regulamento)
  const ageRef = formData.birthDate ? ageOnDate(formData.birthDate, AGE_REF_DATE) : null;
  // Menor de 18 na data da prova: exige nome do responsável (autorização vem no comprovante)
  const isMinor = isMinorAtEvent(formData.birthDate);
  // Abaixo da idade mínima permitida (14): não pode se inscrever
  const isUnderMinAge = ageRef !== null && ageRef < MIN_AGE;
  // Categoria conforme a modalidade (corrida = faixa etária; caminhada = 3 km)
  const category = getRunnerCategory(formData.birthDate, formData.modality);
  const baseFee = formData.birthDate ? getRegistrationFee(ageForFee) : REGISTRATION_PRICE;
  const couponDiscountValue = appliedCoupon ? calcCouponDiscount(baseFee, appliedCoupon) : 0;
  const finalFee = Math.max(0, baseFee - couponDiscountValue);
  const fmt = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

  // Cupons da equipe selecionada (só na área restrita, quando App passa a lista).
  // Servem para o botão de aplicar com um clique, sem digitar o código.
  const teamCoupons = (coupons || []).filter(
    c => formData.teamName && formData.teamName !== 'Avulso'
      && c.teamName.toLowerCase() === formData.teamName.toLowerCase()
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.cpf || !formData.birthDate || !formData.city) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (isPublicView && !agreedToRules) {
      setRulesError(true);
      alert("Para confirmar a inscrição é preciso concordar com o regulamento da prova.");
      return;
    }

    if (formData.cpf.length !== 14) {
      setErrors(prev => ({ ...prev, cpf: 'CPF inválido ou incompleto.' }));
      alert("Por favor, corrija o CPF antes de continuar.");
      return;
    }

    // Duplicidade de CPF/e-mail é garantida pelo banco (índices únicos);
    // se houver conflito, onSave retorna erro amigável.
    const ageCalculated = calculateAge(formData.birthDate);

    if (isUnderMinAge) {
      alert(`Idade mínima de ${MIN_AGE} anos para participar da prova (regra da Confederação Brasileira de Atletismo).`);
      return;
    }

    // Menor de 18: precisa do nome do responsável (a autorização assinada é
    // anexada depois, junto com o comprovante).
    if (isMinor && !formData.guardianName.trim()) {
      alert('Atleta menor de 18 anos: informe o nome do pai, mãe ou responsável. A autorização assinada deverá ser anexada junto com o comprovante.');
      return;
    }

    // Desconto do cupom sobre o valor da inscrição — 60+ já tem meia inscrição, não acumula cupom
    const feeForRunner = getRegistrationFee(ageCalculated);
    const discountForRunner = appliedCoupon && ageCalculated < SENIOR_AGE
      ? calcCouponDiscount(feeForRunner, appliedCoupon)
      : 0;

    const newRunner: Runner = {
      id: crypto.randomUUID(),
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      cpf: formData.cpf,
      city: formData.city,
      birthDate: formData.birthDate,
      age: ageCalculated,
      gender: formData.gender as Gender,
      teamName: formData.teamName || 'Avulso',
      shirtSize: formData.shirtSize as ShirtSize,
      modality: formData.modality,
      registrationDate: new Date().toISOString(),
      isPaid: formData.isPaid,
      paymentProof: formData.paymentProof,
      ...(isMinor && formData.guardianName.trim() && { guardianName: formData.guardianName.trim() }),
      ...(appliedCoupon && ageCalculated < SENIOR_AGE && discountForRunner > 0 && {
        couponCode: appliedCoupon.code,
        couponDiscount: discountForRunner,
      }),
    };

    setSubmitting(true);
    const saved = await onSave(newRunner);
    setSubmitting(false);
    if (!saved) return;

    setFormData({
      fullName: '',
      email: '',
      phone: '',
      cpf: '',
      city: '',
      birthDate: '',
      gender: Gender.MALE,
      teamName: userSession?.role === 'team_leader' && userSession.teamAccess ? userSession.teamAccess : 'Avulso',
      shirtSize: ShirtSize.M,
      modality: '5k' as RaceModality,
      guardianName: '',
      isPaid: false,
      paymentProof: ''
    });
    setErrors({});
    setIsCustomCity(false);
    setIsCustomTeam(false);
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
    setAgreedToRules(false);
    setRulesError(false);

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
          {/* Seleção de modalidade — destaque no topo */}
          <div>
            <label className={`${labelClass} flex items-center gap-1 mb-2`}>
              <Trophy size={14} /> Escolha sua modalidade
            </label>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {MODALITIES.map(m => {
                const selected = formData.modality === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, modality: m.value }))}
                    aria-pressed={selected}
                    className={`relative overflow-hidden rounded-2xl border-2 p-4 md:p-5 flex flex-col items-center gap-1.5 transition-all duration-200 ${
                      selected
                        ? isPublicView
                          ? 'border-yellow-400 bg-yellow-400/10 shadow-[0_0_25px_rgba(250,204,21,0.25)] scale-[1.02]'
                          : 'border-yellow-400 bg-yellow-50 shadow-md scale-[1.02]'
                        : isPublicView
                          ? 'border-slate-700 bg-slate-800/40 hover:border-slate-500 hover:bg-slate-800/70'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {selected && (
                      <span className={`absolute top-2 right-2 ${isPublicView ? 'text-yellow-400' : 'text-yellow-500'}`}>
                        <CheckCircle size={18} />
                      </span>
                    )}
                    <span className="text-3xl md:text-4xl leading-none" aria-hidden="true">{m.emoji}</span>
                    <span className={`font-black italic uppercase tracking-wide text-base md:text-lg ${
                      selected
                        ? isPublicView ? 'text-white' : 'text-slate-900'
                        : isPublicView ? 'text-slate-300' : 'text-slate-700'
                    }`}>{m.label}</span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      selected
                        ? 'bg-yellow-400 text-slate-900'
                        : isPublicView ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-500'
                    }`}>{m.distance}</span>
                  </button>
                );
              })}
            </div>
          </div>

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

            {/* Categoria (faixa etária + sexo), conforme regulamento */}
            {category && (
              <div className="col-span-2 md:col-span-1 flex items-end">
                <div className={`w-full rounded-lg px-4 py-3 border flex items-center gap-2 ${
                  isPublicView ? 'bg-slate-800/60 border-slate-700' : 'bg-indigo-50 border-indigo-200'
                }`}>
                  <Trophy size={16} className={isPublicView ? 'text-yellow-400 shrink-0' : 'text-indigo-500 shrink-0'} />
                  <div className="min-w-0">
                    <p className={`text-[10px] uppercase font-bold tracking-wide ${isPublicView ? 'text-slate-500' : 'text-slate-400'}`}>Categoria</p>
                    <p className={`text-sm font-bold truncate ${isPublicView ? 'text-white' : 'text-slate-800'}`}>
                      {formData.modality === '3k' ? category : `${formData.gender} · ${category}`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Aviso e campo do responsável (menor de 18 na data da prova) */}
            {isUnderMinAge && (
              <div className={`col-span-2 rounded-lg px-4 py-3 border text-sm flex items-start gap-2 animate-fade-in ${
                isPublicView ? 'bg-red-500/10 border-red-500/40 text-red-300' : 'bg-red-50 border-red-300 text-red-700'
              }`}>
                <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                <span>
                  A idade mínima para participar é de <strong>{MIN_AGE} anos</strong> (regra da Confederação Brasileira de Atletismo). Não é possível concluir esta inscrição.
                </span>
              </div>
            )}

            {isMinor && !isUnderMinAge && (
              <>
                <div className={`col-span-2 rounded-lg px-4 py-3 border text-sm flex items-start gap-2 animate-fade-in ${
                  isPublicView ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-800'
                }`}>
                  <ShieldAlert size={18} className="shrink-0 mt-0.5 text-amber-500" />
                  <span>
                    <strong>Atleta menor de 18 anos.</strong> É obrigatória a autorização por escrito do pai, mãe ou responsável.
                    Informe o nome do responsável abaixo e <strong>anexe a autorização assinada junto com o comprovante</strong> na área
                    "Já me inscrevi, enviar comprovante". Sem a autorização, a inscrição do menor não é validada.
                    {' '}
                    <a
                      href={`${import.meta.env.BASE_URL}autorizacao-menor.html`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`underline font-bold ${isPublicView ? 'text-amber-100 hover:text-white' : 'text-amber-900 hover:text-black'}`}
                    >
                      Baixar modelo de autorização
                    </a>.
                  </span>
                </div>

                <div className="col-span-2">
                  <label className={`${labelClass} flex items-center gap-1`}>
                    <UserCheck size={14} /> Nome do pai, mãe ou responsável <span className={isPublicView ? 'text-red-400' : 'text-red-500'}>*</span>
                  </label>
                  <input
                    type="text"
                    name="guardianName"
                    value={formData.guardianName}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Nome completo do responsável"
                    required={isMinor}
                  />
                </div>
              </>
            )}

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

            {/* Telefone */}
            <div className="col-span-2 md:col-span-1">
              <label className={labelClass}>Telefone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={inputClass}
                placeholder="(15) 99999-9999"
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
                  {teamOptions.map(team => (
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

                {isSeniorRegistrant ? (
                  <div className={`flex items-center gap-2 rounded-lg px-4 py-3 border text-sm ${
                    isPublicView
                      ? 'bg-slate-800/60 border-slate-700 text-slate-400'
                      : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <AlertCircle size={16} className={isPublicView ? 'text-yellow-400 shrink-0' : 'text-yellow-600 shrink-0'} />
                    <span>
                      Atletas 60+ já pagam <strong>meia inscrição (R$ {fmt(REGISTRATION_PRICE_SENIOR)})</strong> — cupom de academia não se aplica.
                    </span>
                  </div>
                ) : appliedCoupon ? (
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
                  <div className="space-y-3">
                    {/* Botões de cupom da equipe (aplica com 1 clique). Só na
                        área restrita, quando a lista de cupons foi carregada. */}
                    {teamCoupons.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {teamCoupons.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => applyCouponDirect(c)}
                            disabled={c.blocked}
                            title={c.blocked ? 'Cupom bloqueado pela organização' : 'Aplicar este cupom'}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm border transition-all ${
                              c.blocked
                                ? 'opacity-50 cursor-not-allowed border-slate-300 bg-slate-100 text-slate-400 line-through [color-scheme:light]'
                                : isPublicView
                                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                                  : 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            <Ticket size={15} />
                            <span className="font-mono">{c.code}</span>
                            <span className="opacity-80">
                              {c.discountType === 'percent' ? `${c.value}%` : `R$ ${fmt(c.value)}`}
                            </span>
                            {c.blocked && <span className="no-underline text-[10px] uppercase">bloqueado</span>}
                          </button>
                        ))}
                      </div>
                    )}

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
                        disabled={couponChecking}
                        className={`px-5 rounded-lg font-bold text-sm transition-all shrink-0 disabled:opacity-60 disabled:cursor-wait ${
                          isPublicView
                            ? 'bg-yellow-400 text-slate-900 hover:bg-yellow-300'
                            : 'bg-slate-900 text-yellow-400 hover:bg-slate-800'
                        }`}
                      >
                        {couponChecking ? 'Verificando...' : 'Aplicar'}
                      </button>
                    </div>
                  </div>
                )}

                {couponError && !isSeniorRegistrant && (
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

              <div className={`grid grid-cols-1 gap-6 ${userSession?.role === 'admin' ? 'md:grid-cols-2' : ''}`}>
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

                {/* Status Toggle: confirmação de pagamento é exclusiva do admin */}
                {userSession?.role === 'admin' && (
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
                )}
                {userSession?.role === 'team_leader' && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-100 rounded-lg px-3 py-2">
                    <AlertCircle size={14} className="text-slate-400 shrink-0" />
                    A confirmação de pagamento é feita pelo administrador após conferir o comprovante.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Aceite do Regulamento (inscrição pública) */}
          {isPublicView && (
            <div className={`mt-6 rounded-xl border p-4 transition-colors ${
              rulesError
                ? 'border-red-500/60 bg-red-500/5'
                : agreedToRules
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-slate-700 bg-slate-800/40'
            }`}>
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agreedToRules}
                  onChange={e => {
                    setAgreedToRules(e.target.checked);
                    if (e.target.checked) setRulesError(false);
                  }}
                  className="mt-0.5 w-5 h-5 rounded accent-yellow-400 shrink-0 cursor-pointer"
                />
                <span className="text-sm text-slate-300">
                  Li e <strong className="text-white">estou de acordo com o regulamento</strong> da 2ª Corrida Noturna LSC.
                </span>
              </label>
              <button
                type="button"
                onClick={() => setShowRules(true)}
                className="mt-2 ml-8 text-yellow-400 text-sm font-bold underline underline-offset-2 hover:text-yellow-300 inline-flex items-center gap-1.5 transition-colors"
              >
                <FileText size={14} /> Ler regulamento
              </button>
              {rulesError && (
                <p className="mt-2 ml-8 text-red-400 text-xs font-bold flex items-center gap-1">
                  <AlertCircle size={12} /> Marque a caixinha acima para confirmar a inscrição.
                </p>
              )}
            </div>
          )}

          <div className={`pt-6 flex justify-end ${isPublicView ? 'border-t border-slate-800' : 'border-t border-slate-100'}`}>
            <button
              type="submit"
              disabled={submitting || isUnderMinAge}
              className={isPublicView
                ? "group relative w-full md:w-auto inline-flex items-center justify-center gap-3 bg-yellow-400 text-slate-900 px-8 py-5 rounded-xl font-black italic tracking-wider uppercase text-lg hover:bg-white hover:scale-105 transition-all duration-300 shadow-[0_0_30px_rgba(250,204,21,0.4)] hover:shadow-[0_0_50px_rgba(250,204,21,0.6)] overflow-hidden disabled:opacity-60 disabled:cursor-wait disabled:hover:scale-100"
                : "w-full md:w-auto bg-slate-900 text-yellow-400 px-8 py-4 rounded-xl font-black italic tracking-wider hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl text-lg flex justify-center items-center gap-2 uppercase disabled:opacity-60 disabled:cursor-wait"
              }
            >
              {isPublicView ? (
                <>
                  <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-25deg] group-hover:animate-shimmer" aria-hidden="true"></div>
                  <span className="relative z-10 flex items-center gap-2">
                    <Save size={20} aria-hidden="true" /> {submitting ? 'Enviando...' : 'Confirmar Inscrição'}
                  </span>
                </>
              ) : (
                submitting ? 'Salvando...' : 'Confirmar Inscrição'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Modal do Regulamento */}
      {showRules && (
        <RegulationModal
          onClose={() => setShowRules(false)}
          onAgree={() => {
            setAgreedToRules(true);
            setRulesError(false);
            setShowRules(false);
          }}
        />
      )}
    </div>
  );
};
