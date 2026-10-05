import {
  compareDesc,
  format,
  formatISO,
  isBefore,
  isEqual,
  isValid,
  isWithinInterval,
  parse,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseMoneyToCents } from './cashFlowUtils';

const DATE_TIME = "yyyy-MM-dd'T'HH:mm";

export function assertPrice(value) {
  if (value == null || value === '') throw new Error('Informe o valor.');
  const price = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  if (!Number.isFinite(price) || price < 0) throw new Error('Valor inválido.');
  return Math.round(price * 100) / 100;
}

export function assertPromotionWindow(inicio, termino) {
  const dataInicio = parse(String(inicio || ''), DATE_TIME, new Date(0));
  const dataTermino = parse(String(termino || ''), DATE_TIME, new Date(0));
  if (!isValid(dataInicio) || !isValid(dataTermino)) {
    throw new Error('Informe início e término válidos.');
  }
  if (!isBefore(dataInicio, dataTermino)) {
    throw new Error('O término precisa ser depois do início.');
  }
  return {
    data_inicio: formatISO(dataInicio),
    data_termino: formatISO(dataTermino),
  };
}

export function promotionStatus(promotion, now) {
  const start = parseISO(String(promotion?.data_inicio || ''));
  const end = parseISO(String(promotion?.data_termino || ''));
  if (!isValid(start) || !isValid(end)) return 'Inativa';
  if (!(isBefore(start, end) || isEqual(start, end))) return 'Inativa';
  if (!isWithinInterval(now, { start, end })) return 'Inativa';
  return 'Ativa';
}

export function toDateTimeLocal(value) {
  const parsed = parseISO(String(value || ''));
  if (!isValid(parsed)) return '';
  return format(parsed, DATE_TIME);
}

export function promotionPriceAt(promotions, produtoId, now = new Date()) {
  const matches = (promotions || []).filter((row) => {
    if (String(row.produto_id) !== String(produtoId)) return false;
    const start = parseISO(String(row.data_inicio || ''));
    const end = parseISO(String(row.data_termino || ''));
    if (!isValid(start) || !isValid(end)) return false;
    if (!(isBefore(start, end) || isEqual(start, end))) return false;
    return isWithinInterval(now, { start, end });
  });
  if (!matches.length) return null;
  matches.sort((left, right) =>
    compareDesc(parseISO(left.data_inicio), parseISO(right.data_inicio))
  );
  const price = Number(matches[0].preco_promocional);
  return Number.isFinite(price) ? price : null;
}

export function saleUnitPrice(item, promotions, now = new Date()) {
  const promo = promotionPriceAt(promotions, item?.id, now);
  if (promo != null) return promo;
  return parseMoneyToCents(item?.valor_unitario || item?.cost || 0) / 100;
}

export function formatCatalogDate(value) {
  const parsed = parseISO(String(value || ''));
  if (!isValid(parsed)) return '—';
  return format(parsed, 'dd/MM/yyyy HH:mm', { locale: ptBR });
}
