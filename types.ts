
export enum Gender {
  MALE = 'Masculino',
  FEMALE = 'Feminino'
}

export enum ShirtSize {
  S = 'P',
  M = 'M',
  L = 'G',
  XL = 'GG',
  XXL = 'EXG'
}

// Modalidade da prova: corrida de 5 km ou caminhada de 3 km
export type RaceModality = '5k' | '3k';

export interface Runner {
  id: string;
  fullName: string;
  email: string;
  cpf: string;
  phone?: string;
  city: string;
  birthDate: string;
  age: number;
  gender: Gender;
  teamName: string;
  shirtSize: ShirtSize;
  modality?: RaceModality; // '5k' corrida (padrão) ou '3k' caminhada
  registrationDate: string;
  isPaid?: boolean;
  paymentProof?: string; // Base64 image string
  transferredFrom?: string; // Nome do titular anterior (inscrição transferida)
  transferredAt?: string;   // Data ISO da transferência
  couponCode?: string;      // Cupom de desconto aplicado na inscrição
  couponDiscount?: number;  // Valor do desconto em R$ efetivamente aplicado
  guardianName?: string;    // Nome do pai/mãe/responsável (obrigatório p/ menor de 18)
  authorizationDoc?: string; // Autorização assinada (base64), anexada junto ao comprovante
  kitDelivered?: boolean;   // Kit já entregue ao atleta
  kitDeliveredAt?: string;  // Quando o kit foi entregue (ISO)
}

export interface TeamCoupon {
  id: string;
  teamName: string;               // Academia/equipe dona do cupom ('Geral' quando isGlobal)
  code: string;                   // Ex: LUSO10
  discountType: 'fixed' | 'percent';
  value: number;                  // R$ (fixed) ou % (percent)
  blocked?: boolean;              // Bloqueado pelo admin: fica inativo na inscrição
  isGlobal?: boolean;             // Vale para todos (independe da equipe selecionada)
}

export type SponsorType = 'Camiseta' | 'Medalha';

export interface Sponsor {
  id: string;
  name: string;
  amount: number;
  type: SponsorType;
  position?: string; // Ex: Costas, Manga, Peito
  isPaid: boolean;
  receiptImage?: string; // Base64 string for demo purposes
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: 'Estrutura' | 'Kit' | 'Marketing' | 'Premiação' | 'Outros';
  date: string;
}

export interface ExtraRevenue {
  id: string;
  description: string;
  amount: number;
  date: string;
  category?: string; // Ex: Venda Extra, Doação, etc.
}

export interface Organizer {
  id: string;
  name: string;      // Nome do responsável (ex: Diego)
  teamName: string;  // Equipe que ele gerencia (ex: Luso)
  username: string;  // Login
  role?: 'admin' | 'team_leader';
  password?: string; // Legado (autenticação agora é pelo Supabase Auth)
  phone?: string;    // Contato
  permissions?: string[]; // Telas extras liberadas pelo admin (ex.: ['kits'])
}

export interface TeamStats {
  name: string;
  count: number;
  avgAge: number;
}

export interface UserSession {
  username: string;
  role: 'admin' | 'team_leader';
  teamAccess?: string; // Se for team_leader, qual equipe ele gerencia
  permissions?: string[]; // Telas extras liberadas pelo admin (ex.: ['kits'])
}

export interface TransferSettings {
  transferDeadline?: string; // Data (YYYY-MM-DD) até quando líderes podem transferir; sem valor = sem prazo
  transfersBlocked: boolean; // Bloqueio manual imediato definido pelo admin
}

export type ViewState = 'dashboard' | 'registration' | 'runners' | 'teams' | 'sponsors' | 'expenses' | 'organizers' | 'extra_revenue' | 'coupons' | 'settings' | 'kits';