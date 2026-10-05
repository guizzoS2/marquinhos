export const PRODUCT_MEASURES = ['UN', 'ML', 'L', 'G', 'KG'];

export const PAYMENT_METHODS = ['dinheiro', 'cartao_credito', 'cartao_debito', 'pix'];

export const PAYMENT_OPTIONS = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao_credito', label: 'Cartão de crédito' },
  { value: 'cartao_debito', label: 'Cartão de débito' },
  { value: 'pix', label: 'PIX' },
];

export function assertPaymentMethod(value) {
  if (!PAYMENT_METHODS.includes(value)) {
    throw new Error('Forma de pagamento inválida.');
  }
  return value;
}

export const CARD_INSTALLMENTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export function assertInstallments(value) {
  const parcelas = Number(value);
  if (!CARD_INSTALLMENTS.includes(parcelas)) throw new Error('Parcelas inválidas.');
  return parcelas;
}

const MEASURE_ALIASES = {
  UNIDADE: 'UN',
  UNID: 'UN',
  LT: 'L',
  LITRO: 'L',
  LITROS: 'L',
  GR: 'G',
  GRAMA: 'G',
  GRAMAS: 'G',
  QUILO: 'KG',
  KILO: 'KG',
};

export function normalizeMedida(value) {
  const token = String(value || '').trim().toUpperCase();
  if (!token) return '';
  const medida = MEASURE_ALIASES[token] || token;
  return PRODUCT_MEASURES.includes(medida) ? medida : '';
}

export function assertMedida(value) {
  if (!PRODUCT_MEASURES.includes(value)) {
    throw new Error('Medida inválida. Use UN, ML, L, G ou KG.');
  }
  return value;
}

export function assertVolumePeso(value) {
  if (value == null || value === '') throw new Error('Volume / peso inválido.');
  const volume = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  if (!Number.isFinite(volume) || volume < 0) {
    throw new Error('Volume / peso inválido.');
  }
  return volume;
}

export function isLowStock(atual, sugerido) {
  const current = Number(atual);
  const suggested = Number(sugerido);
  if (!Number.isFinite(current) || !Number.isFinite(suggested)) return false;
  return current <= suggested;
}

export function formatProductCode(value) {
  const number = Number(String(value || '').replace(/\D/g, ''));
  if (!Number.isFinite(number) || number <= 0) return '';
  return String(number).padStart(4, '0');
}

export function maxProductCode(items) {
  return (items || []).reduce((max, item) => {
    const number = Number(String(item?.codigo || '').replace(/\D/g, ''));
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 0);
}

export function nextProductCode(items) {
  return formatProductCode(maxProductCode(items) + 1);
}

export function parseReaisInput(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return 0;
  if (raw.includes(',')) {
    const amount = Number(raw.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(amount) ? amount : NaN;
  }
  const amount = Number(raw.replace(/[^\d.-]/g, ''));
  return Number.isFinite(amount) ? amount : NaN;
}

export function moneyInputValue(value) {
  if (value == null || value === '') return '';
  if (typeof value === 'number' && Number.isFinite(value)) return value.toFixed(2);
  const digits = String(value).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  const amount = Number(digits);
  return Number.isFinite(amount) ? amount.toFixed(2) : '';
}
