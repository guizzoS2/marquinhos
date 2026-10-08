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
  const pagamentos = Array.isArray(sale?.pagamentos)
    ? sale.pagamentos.filter((row) => Number(row?.valor) > 0)
    : [];
  return {
    ...sale,
    numero_comanda: Number.isInteger(numero) && numero > 0 ? numero : null,
    status: SALE_STATUSES.includes(sale?.status) ? sale.status : 'paga',
    pagamentos,
  };
}

export function salePaidAmount(sale) {
  return Math.round(
    (sale?.pagamentos || []).reduce((sum, row) => sum + Number(row.valor || 0), 0) * 100
  ) / 100;
}

export function saleBalance(sale) {
  return Math.round((Number(sale?.total || 0) - salePaidAmount(sale)) * 100) / 100;
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

function addMethod(byMethod, method, amount) {
  if (byMethod[method] == null) return;
  byMethod[method] = Math.round((byMethod[method] + Number(amount || 0)) * 100) / 100;
}

export function salesWithReceiptsOnDay(sales, day = new Date()) {
  return (sales || []).filter((sale) => {
    const payments = Array.isArray(sale.pagamentos) ? sale.pagamentos : [];
    if (payments.some((payment) => isSaleOnDay({ created_at: payment.created_at }, day))) return true;
    return !payments.length && sale.status === 'paga' && isSaleOnDay(sale, day);
  });
}

export function totalsByPayment(sales, day = null) {
  const byMethod = Object.fromEntries(PAYMENT_METHODS.map((method) => [method, 0]));
  (sales || []).forEach((sale) => {
    const payments = Array.isArray(sale.pagamentos) ? sale.pagamentos : [];
    if (payments.length) {
      payments.forEach((payment) => {
        if (day && !isSaleOnDay({ created_at: payment.created_at }, day)) return;
        addMethod(byMethod, payment.forma_pagamento, payment.valor);
      });
      return;
    }
    if (sale.status !== 'paga') return;
    if (day && !isSaleOnDay(sale, day)) return;
    addMethod(byMethod, sale.forma_pagamento, sale.total);
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
