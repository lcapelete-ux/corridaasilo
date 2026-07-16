import { Runner, Sponsor, Expense, Organizer, ExtraRevenue, TeamCoupon, TransferSettings, Gender, ShirtSize } from '../types';
import { supabase } from './supabaseClient';

// Todos os dados agora vivem no Supabase (banco central), não mais no
// localStorage. As funções mantêm os mesmos nomes, mas são assíncronas.

// Converte erros do Postgres em mensagens amigáveis
const friendlyError = (error: { code?: string; message?: string } | null, fallback: string): Error => {
  const msg = error?.message || '';
  if (error?.code === '23505' || msg.includes('duplicate key')) {
    if (msg.includes('runners_cpf')) return new Error('Já existe uma inscrição com este CPF.');
    if (msg.includes('runners_email')) return new Error('Este e-mail já está sendo utilizado em outra inscrição.');
    if (msg.includes('team_coupons_code')) return new Error('Já existe um cupom com este código.');
    return new Error('Registro duplicado.');
  }
  if (msg.includes('row-level security')) {
    return new Error('Sem permissão para esta operação. Faça login novamente.');
  }
  if (error?.code === 'P0001') {
    // Exceção lançada de propósito por uma função/trigger do banco (regra de
    // negócio) — a mensagem já é escrita para o usuário final, sem prefixo.
    return new Error(msg || fallback);
  }
  console.error(fallback, error);
  return new Error(`${fallback}${msg ? `: ${msg}` : ''}`);
};

// --- Runners ---

interface RunnerRow {
  id: string;
  full_name: string;
  email: string;
  cpf: string;
  city: string;
  birth_date: string;
  age: number;
  gender: string;
  team_name: string;
  shirt_size: string;
  registration_date: string;
  is_paid: boolean;
  payment_proof: string | null;
  transferred_from: string | null;
  transferred_at: string | null;
  coupon_code: string | null;
  coupon_discount: number | null;
}

const runnerFromRow = (r: RunnerRow): Runner => ({
  id: r.id,
  fullName: r.full_name,
  email: r.email,
  cpf: r.cpf,
  city: r.city,
  birthDate: r.birth_date,
  age: r.age,
  gender: r.gender as Gender,
  teamName: r.team_name,
  shirtSize: r.shirt_size as ShirtSize,
  registrationDate: r.registration_date,
  isPaid: r.is_paid,
  paymentProof: r.payment_proof || undefined,
  transferredFrom: r.transferred_from || undefined,
  transferredAt: r.transferred_at || undefined,
  couponCode: r.coupon_code || undefined,
  couponDiscount: r.coupon_discount != null ? Number(r.coupon_discount) : undefined,
});

const runnerToRow = (r: Runner) => ({
  id: r.id,
  full_name: r.fullName,
  email: r.email,
  cpf: r.cpf,
  city: r.city,
  birth_date: r.birthDate,
  age: r.age,
  gender: r.gender,
  team_name: r.teamName,
  shirt_size: r.shirtSize,
  registration_date: r.registrationDate,
  is_paid: r.isPaid ?? false,
  payment_proof: r.paymentProof || null,
  transferred_from: r.transferredFrom || null,
  transferred_at: r.transferredAt || null,
  coupon_code: r.couponCode || null,
  coupon_discount: r.couponDiscount ?? null,
});

export const getRunners = async (): Promise<Runner[]> => {
  const { data, error } = await supabase
    .from('runners')
    .select('*')
    .order('registration_date', { ascending: false });
  if (error) throw friendlyError(error, 'Erro ao carregar inscrições');
  return (data as RunnerRow[]).map(runnerFromRow);
};

export const saveRunner = async (runner: Runner): Promise<void> => {
  const { error } = await supabase.from('runners').insert(runnerToRow(runner));
  if (error) throw friendlyError(error, 'Erro ao salvar inscrição');
};

export const updateRunner = async (runner: Runner): Promise<void> => {
  const { id, ...row } = runnerToRow(runner);
  const { error } = await supabase.from('runners').update(row).eq('id', id);
  if (error) throw friendlyError(error, 'Erro ao atualizar inscrição');
};

export const deleteRunner = async (id: string): Promise<void> => {
  const { error } = await supabase.from('runners').delete().eq('id', id);
  if (error) throw friendlyError(error, 'Erro ao remover inscrição');
};

// Busca/anexo de comprovante pelo CPF (telas públicas) — via RPC com
// security definer, sem expor a tabela inteira a anônimos
export const findRunnerByCpf = async (cpf: string): Promise<Partial<Runner> | null> => {
  const { data, error } = await supabase.rpc('find_runner_by_cpf', { p_cpf: cpf });
  if (error) throw friendlyError(error, 'Erro ao buscar inscrição');
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name,
    cpf: row.cpf,
    teamName: row.team_name ?? '',
    city: row.city ?? '',
    isPaid: row.is_paid,
    paymentProof: row.payment_proof || undefined,
  };
};

export const attachPaymentProof = async (cpf: string, proof: string): Promise<void> => {
  const { error } = await supabase.rpc('attach_payment_proof', { p_cpf: cpf, p_proof: proof });
  if (error) throw friendlyError(error, 'Erro ao enviar comprovante');
};

// --- Sponsors ---

interface SponsorRow {
  id: string;
  name: string;
  amount: number;
  type: string;
  position: string | null;
  is_paid: boolean;
  receipt_image: string | null;
}

const sponsorFromRow = (s: SponsorRow): Sponsor => ({
  id: s.id,
  name: s.name,
  amount: Number(s.amount),
  type: s.type as Sponsor['type'],
  position: s.position || undefined,
  isPaid: s.is_paid,
  receiptImage: s.receipt_image || undefined,
});

const sponsorToRow = (s: Sponsor) => ({
  id: s.id,
  name: s.name,
  amount: s.amount,
  type: s.type,
  position: s.position || null,
  is_paid: s.isPaid,
  receipt_image: s.receiptImage || null,
});

export const getSponsors = async (): Promise<Sponsor[]> => {
  const { data, error } = await supabase.from('sponsors').select('*').order('created_at');
  if (error) throw friendlyError(error, 'Erro ao carregar patrocinadores');
  return (data as SponsorRow[]).map(sponsorFromRow);
};

export const saveSponsor = async (sponsor: Sponsor): Promise<void> => {
  const { error } = await supabase.from('sponsors').insert(sponsorToRow(sponsor));
  if (error) throw friendlyError(error, 'Erro ao salvar patrocinador');
};

export const updateSponsor = async (sponsor: Sponsor): Promise<void> => {
  const { id, ...row } = sponsorToRow(sponsor);
  const { error } = await supabase.from('sponsors').update(row).eq('id', id);
  if (error) throw friendlyError(error, 'Erro ao atualizar patrocinador');
};

export const deleteSponsor = async (id: string): Promise<void> => {
  const { error } = await supabase.from('sponsors').delete().eq('id', id);
  if (error) throw friendlyError(error, 'Erro ao remover patrocinador');
};

// --- Expenses ---

interface ExpenseRow {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
}

const expenseFromRow = (e: ExpenseRow): Expense => ({
  id: e.id,
  description: e.description,
  amount: Number(e.amount),
  category: e.category as Expense['category'],
  date: e.date,
});

export const getExpenses = async (): Promise<Expense[]> => {
  const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
  if (error) throw friendlyError(error, 'Erro ao carregar despesas');
  return (data as ExpenseRow[]).map(expenseFromRow);
};

export const saveExpense = async (expense: Expense): Promise<void> => {
  const { error } = await supabase.from('expenses').insert({
    id: expense.id,
    description: expense.description,
    amount: expense.amount,
    category: expense.category,
    date: expense.date,
  });
  if (error) throw friendlyError(error, 'Erro ao salvar despesa');
};

export const deleteExpense = async (id: string): Promise<void> => {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw friendlyError(error, 'Erro ao remover despesa');
};

// --- Extra Revenues ---

interface ExtraRevenueRow {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string | null;
}

const extraRevenueFromRow = (r: ExtraRevenueRow): ExtraRevenue => ({
  id: r.id,
  description: r.description,
  amount: Number(r.amount),
  date: r.date,
  category: r.category || undefined,
});

export const getExtraRevenues = async (): Promise<ExtraRevenue[]> => {
  const { data, error } = await supabase.from('extra_revenues').select('*').order('date', { ascending: false });
  if (error) throw friendlyError(error, 'Erro ao carregar receitas extras');
  return (data as ExtraRevenueRow[]).map(extraRevenueFromRow);
};

export const saveExtraRevenue = async (revenue: ExtraRevenue): Promise<void> => {
  const { error } = await supabase.from('extra_revenues').insert({
    id: revenue.id,
    description: revenue.description,
    amount: revenue.amount,
    date: revenue.date,
    category: revenue.category || null,
  });
  if (error) throw friendlyError(error, 'Erro ao salvar receita');
};

export const deleteExtraRevenue = async (id: string): Promise<void> => {
  const { error } = await supabase.from('extra_revenues').delete().eq('id', id);
  if (error) throw friendlyError(error, 'Erro ao remover receita');
};

// --- Organizers ---
// Perfis vinculados ao Supabase Auth. A criação de um NOVO login é feita
// pelo SQL Editor (admin_create_login) — o site só lê/edita/remove perfis.

interface OrganizerRow {
  id: string;
  name: string;
  team_name: string;
  username: string;
  role: 'admin' | 'team_leader';
  phone: string | null;
}

const organizerFromRow = (o: OrganizerRow): Organizer => ({
  id: o.id,
  name: o.name,
  teamName: o.team_name,
  username: o.username,
  role: o.role,
  phone: o.phone || undefined,
});

export const getOrganizers = async (): Promise<Organizer[]> => {
  const { data, error } = await supabase.from('organizers').select('*').order('name');
  if (error) throw friendlyError(error, 'Erro ao carregar organizadores');
  return (data as OrganizerRow[]).map(organizerFromRow);
};

export const updateOrganizer = async (organizer: Organizer): Promise<void> => {
  const { error } = await supabase
    .from('organizers')
    .update({
      name: organizer.name,
      team_name: organizer.teamName,
      username: organizer.username,
      phone: organizer.phone || null,
    })
    .eq('id', organizer.id);
  if (error) throw friendlyError(error, 'Erro ao atualizar organizador');
};

export const deleteOrganizer = async (id: string): Promise<void> => {
  const { error } = await supabase.from('organizers').delete().eq('id', id);
  if (error) throw friendlyError(error, 'Erro ao remover organizador');
};

// Cria um novo login de organizador (líder de equipe ou admin) direto pelo
// site. A checagem de permissão (só admin pode) é feita dentro da função no
// banco — ver admin_create_login em supabase/atualizacao_app.sql.
export const createOrganizerLogin = async (params: {
  email: string;
  password: string;
  name: string;
  username: string;
  teamName: string;
  role: 'admin' | 'team_leader';
  phone?: string;
}): Promise<void> => {
  const { data, error } = await supabase.rpc('admin_create_login', {
    p_email: params.email,
    p_password: params.password,
    p_name: params.name,
    p_username: params.username,
    p_team_name: params.teamName,
    p_role: params.role,
    p_phone: params.phone || null,
  });
  if (error) throw friendlyError(error, 'Erro ao criar login');
  if (typeof data === 'string' && data.startsWith('Já existia')) {
    throw new Error('Já existe um login cadastrado com este e-mail.');
  }
};

// --- Cupons de Desconto (por academia) ---

interface CouponRow {
  id: string;
  team_name: string;
  code: string;
  discount_type: 'fixed' | 'percent';
  value: number;
}

const couponFromRow = (c: CouponRow): TeamCoupon => ({
  id: c.id,
  teamName: c.team_name,
  code: c.code,
  discountType: c.discount_type,
  value: Number(c.value),
});

export const getCoupons = async (): Promise<TeamCoupon[]> => {
  const { data, error } = await supabase.from('team_coupons').select('*').order('team_name');
  if (error) throw friendlyError(error, 'Erro ao carregar cupons');
  return (data as CouponRow[]).map(couponFromRow);
};

export const saveCoupon = async (coupon: TeamCoupon): Promise<void> => {
  const { error } = await supabase.from('team_coupons').insert({
    id: coupon.id,
    team_name: coupon.teamName,
    code: coupon.code,
    discount_type: coupon.discountType,
    value: coupon.value,
  });
  if (error) throw friendlyError(error, 'Erro ao salvar cupom');
};

export const updateCoupon = async (coupon: TeamCoupon): Promise<void> => {
  const { error } = await supabase
    .from('team_coupons')
    .update({
      team_name: coupon.teamName,
      code: coupon.code,
      discount_type: coupon.discountType,
      value: coupon.value,
    })
    .eq('id', coupon.id);
  if (error) throw friendlyError(error, 'Erro ao atualizar cupom');
};

export const deleteCoupon = async (id: string): Promise<void> => {
  const { error } = await supabase.from('team_coupons').delete().eq('id', id);
  if (error) throw friendlyError(error, 'Erro ao remover cupom');
};

// Validação pública de cupom (formulário de inscrição) — busca pelo código
// via RPC, sem expor a lista completa de cupons a visitantes
export const findCouponByCode = async (code: string): Promise<TeamCoupon | null> => {
  const { data, error } = await supabase.rpc('find_coupon_by_code', { p_code: code });
  if (error) throw friendlyError(error, 'Erro ao validar cupom');
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    id: row.id ?? '',
    teamName: row.team_name,
    code: row.code,
    discountType: row.discount_type,
    value: Number(row.value),
  };
};

// --- Configurações de Transferência (prazo/bloqueio definidos pelo admin) ---

interface AppSettingsRow {
  transfer_deadline: string | null;
  transfers_blocked: boolean;
}

export const getTransferSettings = async (): Promise<TransferSettings> => {
  const { data, error } = await supabase
    .from('app_settings')
    .select('transfer_deadline, transfers_blocked')
    .limit(1)
    .maybeSingle();
  if (error) throw friendlyError(error, 'Erro ao carregar configurações de transferência');
  const row = data as AppSettingsRow | null;
  return {
    transferDeadline: row?.transfer_deadline || undefined,
    transfersBlocked: row?.transfers_blocked ?? false,
  };
};

export const updateTransferSettings = async (settings: TransferSettings): Promise<void> => {
  const { error } = await supabase
    .from('app_settings')
    .update({
      transfer_deadline: settings.transferDeadline || null,
      transfers_blocked: settings.transfersBlocked,
    })
    .eq('id', true);
  if (error) throw friendlyError(error, 'Erro ao salvar configurações de transferência');
};
