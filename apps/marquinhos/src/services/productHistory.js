import { formatCents, parseCashFlowDate, parseMoneyToCents } from './cashFlowUtils';

function millis(value) {
  const direct = Date.parse(String(value || ''));
  return Number.isFinite(direct) ? direct : 0;
}

function movementMillis(row) {
  const created = millis(row?.createdAt || row?.created_at);
  if (created) return created;
  const iso = parseCashFlowDate(row?.date);
  return iso ? millis(`${iso}T12:00:00`) : 0;
}

function amountCents(row) {
  const amount = Number(row?.amount);
  if (Number.isFinite(amount)) return amount;
  return parseMoneyToCents(row?.value);
}

function reais(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'string' && value.includes('R$')) return value;
  const cents = parseMoneyToCents(value);
  if (!cents && value !== 0 && value !== '0') {
    const number = Number(String(value).replace(',', '.'));
    if (!Number.isFinite(number)) return null;
    return number.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
  return formatCents(cents);
}

function stamp(at) {
  if (!at) return '—';
  return new Date(at).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sameProduct(line, item) {
  return String(line?.produto_id || '') === String(item?.id || '');
}

export function cashBalanceAt(cash, at) {
  let cents = 0;
  (cash?.incomes || []).forEach((row) => {
    if (movementMillis(row) && movementMillis(row) <= at) cents += amountCents(row);
  });
  (cash?.expenses || []).forEach((row) => {
    if (movementMillis(row) && movementMillis(row) <= at) cents -= amountCents(row);
  });
  return cents;
}

export function productPriceHistory(item, inventory) {
  if (!item) return { compra: '—', venda: '—', events: [] };
  const events = [];
  (inventory?.purchases || []).forEach((purchase) => {
    if (purchase?.status === 'cancelada') return;
    const at = millis(purchase.created_at) || millis(`${purchase.date || ''}T12:00:00`);
    (purchase.itens || []).forEach((line, index) => {
      if (!sameProduct(line, item)) return;
      events.push({
        id: `buy-${purchase.id}-${index}`,
        at,
        when: stamp(at),
        kind: 'Compra',
        price: reais(line.valor_unitario) || '—',
        qty: line.quantidade,
      });
    });
  });
  (inventory?.sales || []).forEach((sale) => {
    if (sale?.status === 'cancelada') return;
    const cycles = [
      { id: sale.id, at: millis(sale.created_at || sale.updated_at), itens: sale.itens || [] },
      ...(sale.historico || []).map((cycle) => ({
        id: cycle.id,
        at: millis(cycle.quitado_em || sale.created_at),
        itens: cycle.itens || [],
      })),
    ];
    cycles.forEach((cycle) => {
      cycle.itens.forEach((line, index) => {
        if (!sameProduct(line, item)) return;
        events.push({
          id: `sale-${cycle.id}-${index}`,
          at: cycle.at,
          when: stamp(cycle.at),
          kind: 'Venda',
          price: reais(line.valor_unitario) || '—',
          qty: line.quantidade,
        });
      });
    });
  });
  events.sort((left, right) => right.at - left.at);
  return {
    compra: reais(item.custo_compra) || events.find((row) => row.kind === 'Compra')?.price || '—',
    venda: reais(item.valor_unitario || item.cost) || '—',
    events,
  };
}

export function productSaleHistory(item, inventory, cash) {
  if (!item) return [];
  const rows = [];
  (inventory?.sales || []).forEach((sale) => {
    if (sale?.status === 'cancelada') return;
    const cycles = [
      { id: `open-${sale.id}`, at: millis(sale.updated_at || sale.created_at), itens: sale.itens || [] },
      ...(sale.historico || []).map((cycle) => ({
        id: cycle.id,
        at: millis(cycle.quitado_em || sale.created_at),
        itens: cycle.itens || [],
      })),
    ];
    cycles.forEach((cycle) => {
      const lines = (cycle.itens || []).filter((line) => sameProduct(line, item));
      if (!lines.length) return;
      const qty = lines.reduce((sum, line) => sum + (Number(line.quantidade) || 0), 0);
      const total = lines.reduce((sum, line) => sum + (Number(line.valor_total) || 0), 0);
      rows.push({
        id: `${sale.id}-${cycle.id}`,
        at: cycle.at,
        when: stamp(cycle.at),
        qty,
        total: reais(total) || '—',
        cash: formatCents(cashBalanceAt(cash, cycle.at || 0)),
      });
    });
  });
  return rows.sort((left, right) => right.at - left.at);
}
