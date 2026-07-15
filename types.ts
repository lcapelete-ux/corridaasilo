
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

export interface Runner {
  id: string;
  fullName: string;
  email: string;
  cpf: string;
  city: string;
  birthDate: string;
  age: number;
  gender: Gender;
  teamName: string;
  shirtSize: ShirtSize;
  registrationDate: string;
  isPaid?: boolean;
  paymentProof?: string; // Base64 image string
  transferredFrom?: string; // Nome do titular anterior (inscrição transferida)
  transferredAt?: string;   // Data ISO da transferência
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
  password: string;  // Senha simples
  phone?: string;    // Contato
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
}

export type ViewState = 'dashboard' | 'registration' | 'runners' | 'teams' | 'sponsors' | 'expenses' | 'organizers' | 'extra_revenue';