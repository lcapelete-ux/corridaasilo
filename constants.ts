import { Runner, TeamCoupon, TransferSettings } from './types';

// Valores da inscrição da 2ª Corrida Noturna LSC
export const REGISTRATION_PRICE = 69.90;
export const REGISTRATION_PRICE_SENIOR = 35.00; // Desconto 60+
export const SENIOR_AGE = 60;

// Regras de idade do regulamento (2ª Corrida Night Run – Asilo São Cristóvão)
export const EVENT_DATE = '2026-09-19';   // data da prova
export const MIN_AGE = 14;                // idade mínima (Confederação Brasileira de Atletismo)
export const MINOR_AGE = 18;              // abaixo disso: precisa de autorização do responsável

// Idade que a pessoa terá numa data de referência (ambas em YYYY-MM-DD).
// Aritmética pura de inteiros: imune a fuso horário (sem new Date()).
export const ageOnDate = (birthDate: string, refIso: string): number => {
  if (!birthDate || !refIso) return 0;
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [ry, rm, rd] = refIso.split('-').map(Number);
  if (!by || !bm || !bd || !ry || !rm || !rd) return 0;
  let age = ry - by;
  if (rm < bm || (rm === bm && rd < bd)) age--;
  return age;
};

// Menor de idade na data da prova → exige autorização do pai/responsável.
export const isMinorAtEvent = (birthDate: string): boolean =>
  !!birthDate && ageOnDate(birthDate, EVENT_DATE) < MINOR_AGE;

// Formata "YYYY-MM-DD" (data do banco) como "DD/MM" sem sofrer com fuso horário.
// (new Date('2026-08-23') vira meia-noite UTC e pode "voltar" um dia no Brasil)
export const formatBrDate = (isoDate?: string | null, withYear = false): string => {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return '';
  return withYear ? `${d}/${m}/${y}` : `${d}/${m}`;
};

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
