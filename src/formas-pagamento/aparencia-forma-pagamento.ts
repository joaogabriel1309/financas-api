export const COR_FORMA_PAGAMENTO_PADRAO = '#0874df';
export const ICONES_FORMA_PAGAMENTO = [
  'card',
  'wallet',
  'banknote',
  'bank',
  'pix',
  'receipt',
  'phone',
  'loan',
] as const;

export type IconeFormaPagamento = (typeof ICONES_FORMA_PAGAMENTO)[number];
