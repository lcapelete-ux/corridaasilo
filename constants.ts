import { Runner, TeamCoupon, TransferSettings, RaceModality } from './types';

// Modalidades da prova (seleção no topo da inscrição)
export const MODALITIES: { value: RaceModality; label: string; distance: string; emoji: string }[] = [
  { value: '5k', label: 'Corrida', distance: '5 km', emoji: '🏃' },
  { value: '3k', label: 'Caminhada', distance: '3 km', emoji: '🚶' },
];

export const modalityLabel = (m?: string): string =>
  m === '3k' ? 'Caminhada 3 km' : 'Corrida 5 km';

// Telas da área restrita que o admin pode "liberar" para um organizador.
// (chave = ViewState). Extensível: basta acrescentar itens aqui.
export const GRANTABLE_VIEWS: { key: string; label: string }[] = [
  { key: 'kits', label: 'Entrega de Kits' },
];

// Valores da inscrição da 2ª Corrida Noturna LSC
export const REGISTRATION_PRICE = 74.90;
export const REGISTRATION_PRICE_SENIOR = 37.45; // Idoso 60+: metade de 74,90 (não acumula cupom)
export const SENIOR_AGE = 60;
// Idoso 60+ pode abrir mão da meia-inscrição e pagar o valor cheio (menos este
// desconto de apoiador) para ajudar o Lar São Cristóvão: 74,90 − 10 = 64,90.
export const SENIOR_SUPPORTER_DISCOUNT = 10;

// Regras de idade do regulamento (2ª Corrida Night Run – Asilo São Cristóvão)
export const EVENT_DATE = '2026-09-19';   // data da prova
export const AGE_REF_DATE = '2026-12-31'; // "idade considerada" p/ mínimo e categoria (regulamento)
export const MIN_AGE = 14;                // idade mínima (Confederação Brasileira de Atletismo)
export const MINOR_AGE = 18;              // abaixo disso: precisa de autorização do responsável
export const MAX_ATHLETES = 500;          // limite de inscritos (regulamento)

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

// Idade considerada para mínimo/categoria (a que o atleta terá em 31/12/2026).
export const ageForCategory = (birthDate: string): number => ageOnDate(birthDate, AGE_REF_DATE);

// Faixas etárias do regulamento (Corrida 5K)
const AGE_BRACKETS: [number, number][] = [
  [14, 19], [20, 24], [25, 29], [30, 34], [35, 39], [40, 44],
  [45, 49], [50, 54], [55, 59], [60, 64], [65, 69],
];

// Categoria de faixa etária do atleta (ex.: "30 a 34 anos"), conforme 31/12/2026.
export const getAgeCategory = (birthDate: string): string => {
  const age = ageForCategory(birthDate);
  if (!age || age < MIN_AGE) return '';
  if (age >= 70) return '70+';
  const bracket = AGE_BRACKETS.find(([lo, hi]) => age >= lo && age <= hi);
  return bracket ? `${bracket[0]} a ${bracket[1]} anos` : '';
};

// Categoria completa com o sexo (ex.: "Masculino · 30 a 34 anos")
export const getFullCategory = (birthDate: string, gender?: string): string => {
  const faixa = getAgeCategory(birthDate);
  if (!faixa) return '';
  return gender ? `${gender} · ${faixa}` : faixa;
};

// Categoria conforme a modalidade: a corrida 5K tem faixas etárias (regulamento);
// a caminhada 3K não disputa faixa, então mostra apenas "Caminhada 3 km".
export const getRunnerCategory = (birthDate: string, modality?: string): string => {
  if (modality === '3k') return 'Caminhada 3 km';
  return getAgeCategory(birthDate);
};

// Formata "YYYY-MM-DD" (data do banco) como "DD/MM" sem sofrer com fuso horário.
// (new Date('2026-08-23') vira meia-noite UTC e pode "voltar" um dia no Brasil)
export const formatBrDate = (isoDate?: string | null, withYear = false): string => {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  if (!y || !m || !d) return '';
  return withYear ? `${d}/${m}/${y}` : `${d}/${m}`;
};

// seniorFullPrice: idoso 60+ que optou por não usar a meia-inscrição (paga o
// valor cheio, com o desconto de apoiador aplicado à parte, como um cupom).
export const getRegistrationFee = (age: number, seniorFullPrice?: boolean): number =>
  (age >= SENIOR_AGE && !seniorFullPrice) ? REGISTRATION_PRICE_SENIOR : REGISTRATION_PRICE;

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

// Valor efetivamente devido pelo inscrito (inscrição - cupom/desconto de apoiador + contribuição extra)
export const getRunnerPaidValue = (runner: Pick<Runner, 'age' | 'couponDiscount' | 'seniorFullPrice' | 'extraDonation'>): number => {
  const fee = getRegistrationFee(runner.age, runner.seniorFullPrice);
  const afterDiscount = Math.max(0, fee - (runner.couponDiscount || 0));
  return Math.round((afterDiscount + (runner.extraDonation || 0)) * 100) / 100;
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
