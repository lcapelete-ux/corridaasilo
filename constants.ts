import { Runner, TeamCoupon, TransferSettings } from './types';

// Valores da inscrição da 2ª Corrida Noturna LSC
export const REGISTRATION_PRICE = 69.90;
export const REGISTRATION_PRICE_SENIOR = 35.00; // Desconto 60+
export const SENIOR_AGE = 60;

export const getRegistrationFee = (age: number): number =>
  age >= SENIOR_AGE ? REGISTRATION_PRICE_SENIOR : REGISTRATION_PRICE;

// Academias/equipes oficiais do evento
export const PREDEFINED_TEAMS = [
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

// Desconto do cupom em R$, limitado ao valor da inscrição
export const calcCouponDiscount = (fee: number, coupon: Pick<TeamCoupon, 'discountType' | 'value'>): number => {
  const raw = coupon.discountType === 'percent' ? (fee * coupon.value) / 100 : coupon.value;
  return Math.min(fee, Math.round(raw * 100) / 100);
};

// Valor efetivamente devido pelo inscrito (inscrição - cupom)
export const getRunnerPaidValue = (runner: Pick<Runner, 'age' | 'couponDiscount'>): number => {
  const fee = getRegistrationFee(runner.age);
  return Math.max(0, Math.round((fee - (runner.couponDiscount || 0)) * 100) / 100);
};

// Se, agora, um líder de equipe pode transferir inscrições (admin sempre pode,
// independente destas configurações — a regra só limita o líder)
export const canTransferNow = (settings: TransferSettings | null | undefined): boolean => {
  if (!settings) return true; // ainda carregando: não bloqueia otimisticamente na tela
  if (settings.transfersBlocked) return false;
  if (settings.transferDeadline) {
    const deadline = new Date(`${settings.transferDeadline}T23:59:59`);
    if (new Date() > deadline) return false;
  }
  return true;
};
