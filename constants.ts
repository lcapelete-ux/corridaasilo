// Valores da inscrição da 2ª Corrida Noturna LSC
export const REGISTRATION_PRICE = 69.90;
export const REGISTRATION_PRICE_SENIOR = 35.00; // Desconto 60+
export const SENIOR_AGE = 60;

export const getRegistrationFee = (age: number): number =>
  age >= SENIOR_AGE ? REGISTRATION_PRICE_SENIOR : REGISTRATION_PRICE;
