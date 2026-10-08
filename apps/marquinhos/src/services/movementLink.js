import { PAYMENT_OPTIONS } from './inventoryProduct';

export function payLabel(value) {
  return PAYMENT_OPTIONS.find((item) => item.value === value)?.label || '';
}

export function linkedSale(sales, row) {
  if (!row) return null;
  if (row.saleId) {
    const found = (sales || []).find((sale) => String(sale.id) === String(row.saleId));
    if (found) return found;
  }
  const payId = String(row.id || '').replace(/^inc-/, '');
  if (!payId || payId === String(row.id || '')) return null;
  return (
    (sales || []).find((sale) => {
      const current = (sale.pagamentos || []).some((pay) => String(pay.id) === payId);
      const past = (sale.historico || []).some((cycle) =>
        (cycle.pagamentos || []).some((pay) => String(pay.id) === payId)
      );
      return current || past;
    }) || null
  );
}

export function linkedPurchase(purchases, expenseId) {
  if (!expenseId) return null;
  return (purchases || []).find((item) => String(item.expenseId) === String(expenseId)) || null;
}

export function movementCycle(sale, row) {
  if (!sale) return null;
  const payId = String(row?.id || '').replace(/^inc-/, '');
  const canMatch = payId && payId !== String(row?.id || '');
  if (canMatch) {
    const past = (sale.historico || []).find((cycle) =>
      (cycle.pagamentos || []).some((pay) => String(pay.id) === payId)
    );
    if (past) {
      return {
        past: true,
        itens: past.itens || [],
        pagamento: (past.pagamentos || []).find((pay) => String(pay.id) === payId) || null,
        total: past.total,
      };
    }
    const current = (sale.pagamentos || []).find((pay) => String(pay.id) === payId);
    if (current) {
      return { past: false, itens: sale.itens || [], pagamento: current, total: sale.total };
    }
  }
  return { past: false, itens: sale.itens || [], pagamento: null, total: sale.total };
}

export function productText(sale, row) {
  const cycle = movementCycle(sale, row);
  const itens = cycle?.itens?.length ? cycle.itens : sale?.itens || [];
  const line = itens.map((item) => `${item.nome || 'Produto'} × ${item.quantidade}`).join(', ');
  return line || '—';
}

export function paymentText(sale, row) {
  return payLabel(movementCycle(sale, row)?.pagamento?.forma_pagamento) || '—';
}
