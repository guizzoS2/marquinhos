import { format, formatISO, isBefore, isValid, parse, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

export function formatCatalogDate(value) {
  const parsed = parseISO(String(value || ''));
  if (!isValid(parsed)) return '—';
  return format(parsed, 'dd/MM/yyyy HH:mm', { locale: ptBR });
}
