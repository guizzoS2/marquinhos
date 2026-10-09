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

function endStillOpen(value, now) {
  if (value == null || String(value).trim() === '') return true;
  const end = parseISO(String(value));
  if (!isValid(end)) return false;
  return isBefore(now, end) || isEqual(now, end);
}

function promotionWindowOpen(promotion, now) {
  const start = parseISO(String(promotion?.data_inicio || ''));
  const end = parseISO(String(promotion?.data_termino || ''));
  if (!isValid(start) || !isValid(end)) return false;
  if (!(isBefore(start, end) || isEqual(start, end))) return false;
  return isWithinInterval(now, { start, end });
}

export function promotionIsActive(promotion, now) {
  if (promotion?.inativa) return false;
  if (isWeekdayPromotion(promotion)) return endStillOpen(promotion?.data_termino, now);
  return promotionWindowOpen(promotion, now);
}

export function promotionDays(promotion) {
  const raw =
    Array.isArray(promotion?.dias_semana) && promotion.dias_semana.length
      ? promotion.dias_semana
      : [promotion?.dia_semana];
  const values = raw
    .map((value) => weekdayByValue(value)?.value)
    .filter((value) => value === 0 || value);
  const unique = new Set(values);
  return WEEKDAYS.map((day) => day.value).filter((value) => unique.has(value));
}

function promotionApplies(promotion, now) {
  if (!promotionIsActive(promotion, now)) return false;
  if (!isWeekdayPromotion(promotion)) return true;
  return promotionDays(promotion).includes(now.getDay());
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

export function assertWeekdays(values) {
  const days = promotionDays({ dias_semana: Array.isArray(values) ? values : [values] });
  if (!days.length) throw new Error('Escolha ao menos um dia da semana.');
  return days;
}

export function assertOptionalEnd(value) {
  if (value == null || String(value).trim() === '') return null;
  const parsed = parse(String(value), DATE_TIME, new Date(0));
  if (!isValid(parsed)) throw new Error('Informe um fim válido.');
  return formatISO(parsed);
}

export function promotionSchedule(payload) {
  if (payload?.vigencia === 'semana') {
    const days = assertWeekdays(
      Array.isArray(payload.dias_semana) && payload.dias_semana.length ? payload.dias_semana : payload.dia_semana
    );
    return {
      vigencia: 'semana',
      dia_semana: days[0],
      dias_semana: days,
      data_inicio: null,
      data_termino: assertOptionalEnd(payload.data_termino),
    };
  }
  const janela = assertPromotionWindow(payload?.data_inicio, payload?.data_termino);
  return {
    vigencia: 'periodo',
    dia_semana: null,
    dias_semana: [],
    data_inicio: janela.data_inicio,
    data_termino: janela.data_termino,
  };
}

export function promotionStatus(promotion, now) {
  return promotionIsActive(promotion, now) ? 'Ativa' : 'Inativa';
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

function weekdayPhrase(days) {
  const phrases = days.map((value) => weekdayByValue(value)?.phrase).filter(Boolean);
  if (!phrases.length) return '—';
  if (phrases.length === 1) return `Toda ${phrases[0]}`;
  if (phrases.length === 2) return `Toda ${phrases[0]} e ${phrases[1]}`;
  return `Toda ${phrases.slice(0, -1).join(', ')} e ${phrases[phrases.length - 1]}`;
}

export function formatPromotionStart(promotion) {
  if (isWeekdayPromotion(promotion)) return weekdayPhrase(promotionDays(promotion));
  return formatCatalogDate(promotion?.data_inicio);
}

export function formatPromotionEnd(promotion) {
  if (isWeekdayPromotion(promotion) && !promotion?.data_termino) return 'Sempre';
  return formatCatalogDate(promotion?.data_termino);
}
