import { Runner, Sponsor, Expense, Organizer, ExtraRevenue, TeamCoupon, TransferSettings, Gender, ShirtSize, SponsorLogo } from '../types';
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
    if (msg.includes('teams_pkey')) return new Error('Já existe uma equipe com este nome.');
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
  phone?: string;
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
  guardian_name?: string | null;
  authorization_doc?: string | null;
  modality?: string | null;
}

const runnerFromRow = (r: RunnerRow): Runner => ({
  id: r.id,
  fullName: r.full_name,
  email: r.email,
  phone: r.phone || undefined,
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
  guardianName: r.guardian_name || undefined,
  authorizationDoc: r.authorization_doc || undefined,
  modality: (r.modality as Runner['modality']) || undefined,
  kitDelivered: (r as any).kit_delivered ?? undefined,
  kitDeliveredAt: (r as any).kit_delivered_at || undefined,
});

const runnerToRow = (r: Runner) => {
  // Colunas base — existem desde o setup inicial
  const row: Record<string, unknown> = {
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
  };
  // Colunas adicionadas pela migração (transferência/cupom/telefone): só são enviadas
  // quando realmente têm valor. Assim, cadastro e upload de comprovante
  // continuam funcionando mesmo que a migração ainda não tenha sido rodada.
  if (r.phone) row.phone = r.phone;
  if (r.transferredFrom) row.transferred_from = r.transferredFrom;
  if (r.transferredAt) row.transferred_at = r.transferredAt;
  if (r.couponCode) row.coupon_code = r.couponCode;
  if (r.couponDiscount != null) row.coupon_discount = r.couponDiscount;
  if (r.guardianName) row.guardian_name = r.guardianName;
  if (r.authorizationDoc) row.authorization_doc = r.authorizationDoc;
  if (r.modality) row.modality = r.modality;
  return row;
};

// Colunas adicionadas por migração: se o banco ainda não as tem, o insert/update
// falha com "coluna não encontrada". Nesse caso removemos essas colunas e
// tentamos de novo, para a inscrição continuar funcionando antes da migração.
const MIGRATION_COLUMNS = [
  'phone', 'modality', 'transferred_from', 'transferred_at',
  'coupon_code', 'coupon_discount', 'guardian_name', 'authorization_doc',
];

const isUnknownColumnError = (error: any): boolean =>
  error?.code === 'PGRST204'
  || /could not find the .* column|schema cache|column .* does not exist/i.test(error?.message || '');

const stripMigrationColumns = (row: Record<string, unknown>): Record<string, unknown> => {
  const base = { ...row };
  for (const c of MIGRATION_COLUMNS) delete base[c];
  return base;
};

export const getRunners = async (): Promise<Runner[]> => {
  const { data, error } = await supabase
    .from('runners')
    .select('*')
    .order('registration_date', { ascending: false });
  if (error) throw friendlyError(error, 'Erro ao carregar inscrições');
  return (data as RunnerRow[]).map(runnerFromRow);
};

export const saveRunner = async (runner: Runner): Promise<void> => {
  const row = runnerToRow(runner);
  let { error } = await supabase.from('runners').insert(row);
  if (error && isUnknownColumnError(error)) {
    ({ error } = await supabase.from('runners').insert(stripMigrationColumns(row)));
  }
  if (error) throw friendlyError(error, 'Erro ao salvar inscrição');
};

export const updateRunner = async (runner: Runner): Promise<void> => {
  const { id, ...row } = runnerToRow(runner);
  let { error } = await supabase.from('runners').update(row).eq('id', id);
  if (error && isUnknownColumnError(error)) {
    ({ error } = await supabase.from('runners').update(stripMigrationColumns(row)).eq('id', id));
  }
  if (error) throw friendlyError(error, 'Erro ao atualizar inscrição');
};

export const deleteRunner = async (id: string): Promise<void> => {
  const { error } = await supabase.from('runners').delete().eq('id', id);
  if (error) throw friendlyError(error, 'Erro ao remover inscrição');
};

// --- Entrega de Kits (via RPC: admin ou quem tem a permissão 'kits') ---
export interface KitRunner {
  id: string;
  fullName: string;
  cpf: string;
  teamName: string;
  modality?: string;
  shirtSize: string;
  isPaid: boolean;
  kitDelivered: boolean;
  kitDeliveredAt?: string;
}

export const listKitRunners = async (): Promise<KitRunner[]> => {
  const { data, error } = await supabase.rpc('list_kit_runners');
  if (error) throw friendlyError(error, 'Erro ao carregar atletas para entrega de kits');
  return ((data as any[]) || []).map(r => ({
    id: r.id,
    fullName: r.full_name,
    cpf: r.cpf,
    teamName: r.team_name,
    modality: r.modality || undefined,
    shirtSize: r.shirt_size,
    isPaid: r.is_paid,
    kitDelivered: r.kit_delivered ?? false,
    kitDeliveredAt: r.kit_delivered_at || undefined,
  }));
};

export const setKitDelivered = async (runnerId: string, delivered: boolean): Promise<void> => {
  const { error } = await supabase.rpc('set_kit_delivered', { p_runner_id: runnerId, p_delivered: delivered });
  if (error) throw friendlyError(error, 'Erro ao registrar a entrega do kit');
};

// Busca/anexo de comprovante pelo CPF (telas públicas) — via RPC com
// security definer, sem expor a tabela inteira a anônimos
// Retorno da busca por CPF: além dos dados do atleta, traz birth_date (para a
// tela saber se é menor), o nome do responsável e se já há autorização anexada.
export type RunnerLookup = Partial<Runner> & { hasAuthorization?: boolean };

export const findRunnerByCpf = async (cpf: string): Promise<RunnerLookup | null> => {
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
    birthDate: row.birth_date || undefined,   // pode não vir se a migração não rodou
    guardianName: row.guardian_name || undefined,
    hasAuthorization: row.has_authorization ?? undefined,
  };
};

// Anexa o comprovante e, para menores de 18, também a autorização do responsável.
export const attachPaymentProof = async (cpf: string, proof: string, authorization?: string): Promise<void> => {
  const { error } = await supabase.rpc('attach_payment_proof', {
    p_cpf: cpf,
    p_proof: proof,
    p_authorization: authorization || null,
  });
  if (!error) return;

  // Se a migração ainda não rodou, o banco só tem a versão de 2 parâmetros.
  // Faz o fallback (sem autorização) para não travar o envio dos demais.
  const missingFn = error.code === 'PGRST202'
    || /could not find the function|attach_payment_proof/i.test(error.message || '');
  if (missingFn) {
    const retry = await supabase.rpc('attach_payment_proof', { p_cpf: cpf, p_proof: proof });
    if (retry.error) throw friendlyError(retry.error, 'Erro ao enviar comprovante');
    return;
  }
  throw friendlyError(error, 'Erro ao enviar comprovante');
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
  permissions: (o as any).permissions ?? [],
});

export const getOrganizers = async (): Promise<Organizer[]> => {
  const { data, error } = await supabase.from('organizers').select('*').order('name');
  if (error) throw friendlyError(error, 'Erro ao carregar organizadores');
  return (data as OrganizerRow[]).map(organizerFromRow);
};

export const updateOrganizer = async (organizer: Organizer): Promise<void> => {
  const row: Record<string, unknown> = {
    name: organizer.name,
    team_name: organizer.teamName,
    username: organizer.username,
    phone: organizer.phone || null,
  };
  if (organizer.permissions) row.permissions = organizer.permissions;
  let { error } = await supabase.from('organizers').update(row).eq('id', organizer.id);
  if (error && isUnknownColumnError(error)) {
    // Coluna permissions ainda não existe (migração pendente): salva sem ela
    const { permissions, ...base } = row;
    ({ error } = await supabase.from('organizers').update(base).eq('id', organizer.id));
  }
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
  blocked?: boolean;
  is_global?: boolean;
}

const couponFromRow = (c: CouponRow): TeamCoupon => ({
  id: c.id,
  teamName: c.team_name,
  code: c.code,
  discountType: c.discount_type,
  value: Number(c.value),
  blocked: c.blocked ?? false,
  isGlobal: c.is_global ?? false,
});

export const getCoupons = async (): Promise<TeamCoupon[]> => {
  const { data, error } = await supabase.from('team_coupons').select('*').order('team_name');
  if (error) throw friendlyError(error, 'Erro ao carregar cupons');
  return (data as CouponRow[]).map(couponFromRow);
};

export const saveCoupon = async (coupon: TeamCoupon): Promise<void> => {
  const row: Record<string, unknown> = {
    id: coupon.id,
    team_name: coupon.teamName,
    code: coupon.code,
    discount_type: coupon.discountType,
    value: coupon.value,
    is_global: coupon.isGlobal ?? false,
  };
  let { error } = await supabase.from('team_coupons').insert(row);
  if (error && isUnknownColumnError(error)) {
    // Migração do cupom geral ainda não rodou: salva sem is_global
    const { is_global, ...base } = row;
    ({ error } = await supabase.from('team_coupons').insert(base));
  }
  if (error) throw friendlyError(error, 'Erro ao salvar cupom');
};

export const updateCoupon = async (coupon: TeamCoupon): Promise<void> => {
  const row: Record<string, unknown> = {
    team_name: coupon.teamName,
    code: coupon.code,
    discount_type: coupon.discountType,
    value: coupon.value,
    is_global: coupon.isGlobal ?? false,
  };
  let { error } = await supabase.from('team_coupons').update(row).eq('id', coupon.id);
  if (error && isUnknownColumnError(error)) {
    const { is_global, ...base } = row;
    ({ error } = await supabase.from('team_coupons').update(base).eq('id', coupon.id));
  }
  if (error) throw friendlyError(error, 'Erro ao atualizar cupom');
};

export const deleteCoupon = async (id: string): Promise<void> => {
  const { error } = await supabase.from('team_coupons').delete().eq('id', id);
  if (error) throw friendlyError(error, 'Erro ao remover cupom');
};

// Bloqueia/desbloqueia o cupom (só admin, via RLS). Função separada de
// updateCoupon para não exigir a coluna "blocked" na edição normal do cupom:
// só quem usa este toggle depende da migração que criou a coluna.
export const setCouponBlocked = async (id: string, blocked: boolean): Promise<void> => {
  const { error } = await supabase.from('team_coupons').update({ blocked }).eq('id', id);
  if (error) throw friendlyError(error, 'Erro ao alterar o bloqueio do cupom');
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
    isGlobal: row.is_global ?? false,
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

export const getRaceGroupName = async (): Promise<string> => {
  const { data, error } = await supabase
    .from('app_settings')
    .select('race_group_name')
    .limit(1)
    .maybeSingle();
  if (error) throw friendlyError(error, 'Erro ao carregar nome do grupo');
  return (data as { race_group_name: string } | null)?.race_group_name || '2ª CORRIDA NOTURNA LSC';
};

export const updateRaceGroupName = async (name: string): Promise<void> => {
  const { error } = await supabase
    .from('app_settings')
    .update({ race_group_name: name.trim() })
    .eq('id', true);
  if (error) throw friendlyError(error, 'Erro ao salvar nome do grupo');
};

// --- Lote promocional: data final do desconto (mostrada na página inicial) ---

export const getPromoDeadline = async (): Promise<string> => {
  const { data, error } = await supabase
    .from('app_settings')
    .select('promo_deadline')
    .limit(1)
    .maybeSingle();
  if (error) throw friendlyError(error, 'Erro ao carregar data do lote promocional');
  return (data as { promo_deadline: string | null } | null)?.promo_deadline || '2026-08-23';
};

export const updatePromoDeadline = async (date: string): Promise<void> => {
  const { error } = await supabase
    .from('app_settings')
    .update({ promo_deadline: date || null })
    .eq('id', true);
  if (error) throw friendlyError(error, 'Erro ao salvar data do lote promocional');
};

// --- Prazo de inscrição: data final definida pelo admin (fecha o formulário público) ---

export const getRegistrationDeadline = async (): Promise<string> => {
  const { data, error } = await supabase
    .from('app_settings')
    .select('registration_deadline')
    .limit(1)
    .maybeSingle();
  if (error) throw friendlyError(error, 'Erro ao carregar prazo de inscrição');
  return (data as { registration_deadline: string | null } | null)?.registration_deadline || '';
};

export const updateRegistrationDeadline = async (date: string): Promise<void> => {
  const { error } = await supabase
    .from('app_settings')
    .update({ registration_deadline: date || null })
    .eq('id', true);
  if (error) throw friendlyError(error, 'Erro ao salvar prazo de inscrição');
};

// --- Equipes/Academias oficiais (lista usada pelos formulários) ---
// Tabela pública de leitura livre (RLS: select para todos, escrita só admin)

export const getTeams = async (): Promise<string[]> => {
  const { data, error } = await supabase.from('teams').select('name').order('name');
  if (error) throw friendlyError(error, 'Erro ao carregar equipes');
  return (data as { name: string }[]).map(t => t.name);
};

export const createTeam = async (name: string): Promise<void> => {
  const { error } = await supabase.from('teams').insert({ name: name.trim() });
  if (error) throw friendlyError(error, 'Erro ao criar equipe');
};

export const deleteTeam = async (name: string): Promise<void> => {
  const { error } = await supabase.from('teams').delete().eq('name', name);
  if (error) throw friendlyError(error, 'Erro ao remover equipe');
};

// Renomeia uma equipe e leva junto quem depende do nome dela.
// Como não há foreign key (team_name é texto livre), atualizamos manualmente:
// corredores, líderes de equipe e cupons. Fazemos os "filhos" primeiro e a
// tabela teams por último — assim, se algo falhar no meio, os inscritos já
// ficam sob o novo nome (correto) e resta no máximo uma equipe vazia antiga.
// Admin tem permissão (RLS) para atualizar todas essas tabelas, então não
// depende de migração nova.
export const renameTeam = async (oldName: string, newName: string): Promise<void> => {
  const from = oldName;
  const to = newName.trim();
  if (!to) throw new Error('O novo nome da equipe não pode ser vazio.');
  if (to === from) return;

  // 1. Corredores dessa equipe passam a apontar para o novo nome
  const r = await supabase.from('runners').update({ team_name: to }).eq('team_name', from);
  if (r.error) throw friendlyError(r.error, 'Erro ao atualizar os inscritos da equipe');

  // 2. Líder de equipe (organizador) ligado a essa academia
  const o = await supabase.from('organizers').update({ team_name: to }).eq('team_name', from);
  if (o.error) throw friendlyError(o.error, 'Erro ao atualizar o líder da equipe');

  // 3. Cupons da academia — melhor esforço (tabela pode não existir se a
  //    migração de cupons ainda não tiver sido rodada; nesse caso, ignoramos)
  await supabase.from('team_coupons').update({ team_name: to }).eq('team_name', from);

  // 4. Por fim, renomeia a equipe na lista oficial
  const t = await supabase.from('teams').update({ name: to }).eq('name', from);
  if (t.error) throw friendlyError(t.error, 'Erro ao renomear a equipe');
};

// --- Logos de patrocinadores do rodapé (leitura pública, escrita só admin) ---

interface SponsorLogoRow {
  id: string;
  name: string | null;
  image_data: string;
  sort_order: number | null;
}

const sponsorLogoFromRow = (l: SponsorLogoRow): SponsorLogo => ({
  id: l.id,
  name: l.name || undefined,
  imageData: l.image_data,
  sortOrder: l.sort_order ?? 0,
});

export const getSponsorLogos = async (): Promise<SponsorLogo[]> => {
  const { data, error } = await supabase
    .from('sponsor_logos')
    .select('*')
    .order('sort_order')
    .order('created_at');
  if (error) throw friendlyError(error, 'Erro ao carregar logos de patrocinadores');
  return (data as SponsorLogoRow[]).map(sponsorLogoFromRow);
};

export const addSponsorLogo = async (imageData: string, name?: string): Promise<void> => {
  const { error } = await supabase
    .from('sponsor_logos')
    .insert({ image_data: imageData, name: name?.trim() || null });
  if (error) throw friendlyError(error, 'Erro ao salvar o logo');
};

export const deleteSponsorLogo = async (id: string): Promise<void> => {
  const { error } = await supabase.from('sponsor_logos').delete().eq('id', id);
  if (error) throw friendlyError(error, 'Erro ao remover o logo');
};
