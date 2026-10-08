import {
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

export const WEEKDAYS = [
  { value: 1, label: 'Segunda', phrase: 'segunda-feira' },
  { value: 2, label: 'Terça', phrase: 'terça-feira' },
  { value: 3, label: 'Quarta', phrase: 'quarta-feira' },
  { value: 4, label: 'Quinta', phrase: 'quinta-feira' },
  { value: 5, label: 'Sexta', phrase: 'sexta-feira' },
  { value: 6, label: 'Sábado', phrase: 'sábado' },
  { value: 0, label: 'Domingo', phrase: 'domingo' },
];

export function isWeekdayPromotion(promotion) {
  return promotion?.vigencia === 'semana';
}

export function weekdayByValue(value) {
  return WEEKDAYS.find((item) => item.value === Number(value)) || null;
}

function promotionApplies(promotion, now) {
  if (isWeekdayPromotion(promotion)) {
    const day = weekdayByValue(promotion.dia_semana);
    return Boolean(day) && now.getDay() === day.value;
  }
  const start = parseISO(String(promotion?.data_inicio || ''));
  const end = parseISO(String(promotion?.data_termino || ''));
  if (!isValid(start) || !isValid(end)) return false;
  if (!(isBefore(start, end) || isEqual(start, end))) return false;
  return isWithinInterval(now, { start, end });
}

function promotionRank(promotion) {
  if (isWeekdayPromotion(promotion)) return 0;
  const start = parseISO(String(promotion?.data_inicio || ''));
  return isValid(start) ? start.getTime() : 0;
}

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

export function assertWeekday(value) {
  const day = weekdayByValue(value);
  if (!day) throw new Error('Escolha um dia da semana.');
  return day.value;
}

export function promotionSchedule(payload) {
  if (payload?.vigencia === 'semana') {
    return {
      vigencia: 'semana',
      dia_semana: assertWeekday(payload.dia_semana),
      data_inicio: null,
      data_termino: null,
    };
  }
  const janela = assertPromotionWindow(payload?.data_inicio, payload?.data_termino);
  return {
    vigencia: 'periodo',
    dia_semana: null,
    data_inicio: janela.data_inicio,
    data_termino: janela.data_termino,
  };
}

export function promotionStatus(promotion, now) {
  return promotionApplies(promotion, now) ? 'Ativa' : 'Inativa';
}

export function toDateTimeLocal(value) {
  const parsed = parseISO(String(value || ''));
  if (!isValid(parsed)) return '';
  return format(parsed, DATE_TIME);
}

export function promotionPriceAt(promotions, produtoId, now = new Date()) {
  const matches = (promotions || []).filter((row) => {
    if (String(row.produto_id) !== String(produtoId)) return false;
    return promotionApplies(row, now);
  });
  if (!matches.length) return null;
  matches.sort((left, right) => promotionRank(right) - promotionRank(left));
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

export function formatPromotionStart(promotion) {
  if (isWeekdayPromotion(promotion)) {
    const day = weekdayByValue(promotion.dia_semana);
    return day ? `Toda ${day.phrase}` : '—';
  }
  return formatCatalogDate(promotion?.data_inicio);
}

export function formatPromotionEnd(promotion) {
  if (isWeekdayPromotion(promotion)) return 'Sempre';
  return formatCatalogDate(promotion?.data_termino);
}
