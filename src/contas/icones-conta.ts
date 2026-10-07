export const ICONES_CONTA = [
  'wallet',
  'home',
  'car',
  'motorcycle',
  'fuel',
  'loan',
  'health-plan',
  'cart',
  'heart',
  'book',
  'wifi',
  'bolt',
  'coffee',
  'phone',
  'card',
  'receipt',
] as const;

export type IconeConta = (typeof ICONES_CONTA)[number];
