import { format, isSameDay, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PAYMENT_METHODS } from './inventoryProduct';

export const SALE_STATUSES = ['aberta', 'paga', 'cancelada'];

export function assertSaleStatus(value) {
  if (!SALE_STATUSES.includes(value)) throw new Error('Status da venda inválido.');
  return value;
}

export function assertComanda(value) {
  const numero = Number(value);
  if (!Number.isInteger(numero) || numero <= 0) throw new Error('Número da comanda inválido.');
  return numero;
}

export function optionalComanda(value) {
  if (value == null || value === '') return null;
  return assertComanda(value);
}

export function normalizeSale(sale) {
  const numero = Number(sale?.numero_comanda);
  return {
    ...sale,
    numero_comanda: Number.isInteger(numero) && numero > 0 ? numero : null,
    status: SALE_STATUSES.includes(sale?.status) ? sale.status : 'paga',
  };
}

export function isSaleOnDay(sale, day = new Date()) {
  const date = parseISO(String(sale?.created_at || ''));
  if (!isValid(date)) return false;
  return isSameDay(date, day);
}

export function formatSaleStamp(value) {
  const date = parseISO(String(value || ''));
  if (!isValid(date)) return { data: '—', hora: '—' };
  return {
    data: format(date, 'dd/MM/yyyy', { locale: ptBR }),
    hora: format(date, 'HH:mm', { locale: ptBR }),
  };
}

export function paidSalesOnDay(sales, day = new Date()) {
  return (sales || []).filter((sale) => sale.status === 'paga' && isSaleOnDay(sale, day));
}

export function totalsByPayment(sales) {
  const byMethod = Object.fromEntries(PAYMENT_METHODS.map((method) => [method, 0]));
  (sales || []).forEach((sale) => {
    if (sale.status !== 'paga') return;
    if (byMethod[sale.forma_pagamento] == null) return;
    byMethod[sale.forma_pagamento] =
      Math.round((byMethod[sale.forma_pagamento] + Number(sale.total || 0)) * 100) / 100;
  });
  const total = Math.round(Object.values(byMethod).reduce((sum, value) => sum + value, 0) * 100) / 100;
  return { byMethod, total };
}

export function productTotals(sales) {
  const grouped = new Map();
  (sales || []).forEach((sale) => {
    (sale.itens || []).forEach((item) => {
      const key = String(item.produto_id || item.nome || '');
      const quantidade = Number(item.quantidade || 0);
      const valor = Number(item.valor_total || 0);
      const prev = grouped.get(key);
      if (prev) {
        prev.quantidade += quantidade;
        prev.valor_total = Math.round((prev.valor_total + valor) * 100) / 100;
        return;
      }
      grouped.set(key, {
        produto_id: item.produto_id || null,
        nome: item.nome || 'Produto',
        quantidade,
        valor_total: Math.round(valor * 100) / 100,
      });
    });
  });
  return [...grouped.values()];
}

export function shiftAlreadyClosed(closings, day = new Date()) {
  return (closings || []).some((closing) => {
    const date = parseISO(String(closing.closed_at || ''));
    return isValid(date) && isSameDay(date, day);
  });
}
