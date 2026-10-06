import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  isValid,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import { formatCents, parseCashFlowDate, parseMoneyToCents } from './cashFlowUtils';

const PERIODS = ['hoje', 'semana', 'mes', 'ano'];

export function resolvePeriod(period, now = new Date()) {
  const id = PERIODS.includes(period) ? period : 'mes';
  if (id === 'hoje') {
    return { id, start: startOfDay(now), end: endOfDay(now) };
  }
  if (id === 'semana') {
    return {
      id,
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
    };
  }
  if (id === 'ano') {
    return { id, start: startOfYear(now), end: endOfYear(now) };
  }
  return { id: 'mes', start: startOfMonth(now), end: endOfMonth(now) };
}

function reaisToCents(value) {
  const number = Number(value);
  if (Number.isFinite(number) && typeof value !== 'string') return Math.round(number * 100);
  return parseMoneyToCents(value);
}

function expenseCents(row) {
  const amount = Number(row?.amount);
  if (Number.isFinite(amount)) return amount;
  return parseMoneyToCents(row?.value);
}

function rowDate(row) {
  const created = parseISO(String(row?.createdAt || row?.created_at || ''));
  if (isValid(created)) return created;
  const iso = parseCashFlowDate(row?.date);
  if (!iso) return null;
  const parsed = parseISO(`${iso}T12:00:00`);
  return isValid(parsed) ? parsed : null;
}

function inPeriod(date, range) {
  return date && isWithinInterval(date, { start: range.start, end: range.end });
}

function isProductCost(row) {
  return row?.source === 'purchase';
}

function isFreelaCost(row) {
  return (
    row?.source === 'freelancer_daily' ||
    row?.source === 'platform_daily' ||
    row?.categoryId === 'freelancer'
  );
}

function latestUnitCostCents(purchases, productId) {
  const rows = (purchases || [])
    .filter((purchase) => purchase?.status !== 'cancelada')
    .slice()
    .sort((left, right) => {
      const a = rowDate(left)?.getTime() || 0;
      const b = rowDate(right)?.getTime() || 0;
      return b - a;
    });
  for (const purchase of rows) {
    const line = (purchase.itens || []).find((item) => String(item.produto_id) === String(productId));
    if (!line) continue;
    const cents = reaisToCents(line.valor_unitario);
    if (cents > 0) return cents;
  }
  return null;
}

export function aggregateOverview(period, sources, now = new Date()) {
  const range = resolvePeriod(period, now);
  const inventory = sources?.inventory || {};
  const cash = sources?.cash || {};
  const items = (inventory.items || []).filter((item) => item.tipo !== 'combo');
  const sales = (inventory.sales || []).filter((sale) => {
    if (sale?.status && sale.status !== 'paga') return false;
    return inPeriod(rowDate(sale), range);
  });
  const expenses = (cash.expenses || []).filter((row) => inPeriod(rowDate(row), range));

  let revenueCents = 0;
  sales.forEach((sale) => {
    revenueCents += reaisToCents(sale.total);
  });

  let productCents = 0;
  let freelaCents = 0;
  expenses.forEach((row) => {
    const cents = expenseCents(row);
    if (isProductCost(row)) productCents += cents;
    else if (isFreelaCost(row)) freelaCents += cents;
  });
  const costCents = productCents + freelaCents;
  const profitCents = revenueCents - costCents;
  const ticketCents = sales.length ? Math.round(revenueCents / sales.length) : 0;

  const sold = new Map();
  sales.forEach((sale) => {
    (sale.itens || []).forEach((line) => {
      const id = String(line.produto_id || line.nome || '');
      if (!id) return;
      const current = sold.get(id) || {
        id,
        name: line.nome || 'Produto',
        qty: 0,
      };
      current.qty += Number(line.quantidade) || 0;
      if (line.nome) current.name = line.nome;
      sold.set(id, current);
    });
  });
  const topSold = [...sold.values()]
    .sort((left, right) => right.qty - left.qty || left.name.localeCompare(right.name))
    .slice(0, 5)
    .map((row, index) => {
      const product = (inventory.items || []).find((item) => String(item.id) === row.id);
      return {
        id: row.id,
        name: product?.nome || product?.name || row.name,
        category: product?.categoria || product?.category || '',
        orders: String(row.qty),
        image: product?.image || product?.foto || '',
        rankTone: index === 0 ? 'secondary' : index === 1 ? 'slate' : 'muted',
      };
    });

  const alerts = [];
  items.forEach((item) => {
    const atual = Number(item.estoque_atual);
    const sugerido = Number(item.estoque_sugerido);
    if (Number.isFinite(atual) && Number.isFinite(sugerido) && atual <= sugerido) {
      alerts.push({
        id: `${item.id}-stock`,
        name: item.nome || item.name,
        detail: `Estoque ${atual} / sugerido ${sugerido}`,
        icon: 'warning',
      });
    }
    const cost = latestUnitCostCents(inventory.purchases, item.id);
    const price = parseMoneyToCents(item.valor_unitario);
    if (cost != null && price < cost) {
      alerts.push({
        id: `${item.id}-margin`,
        name: item.nome || item.name,
        detail: 'Margem negativa',
        icon: 'trending_down',
      });
    }
  });

  const profitTone = profitCents < 0 ? 'negative' : profitCents > 0 ? 'positive' : undefined;

  return {
    period: range.id,
    kpis: [
      { id: 'revenue', label: 'Faturamento', value: formatCents(revenueCents), icon: 'payments' },
      { id: 'cost', label: 'Custos', value: formatCents(costCents), icon: 'engineering' },
      {
        id: 'profit',
        label: 'Lucro líquido',
        value: formatCents(profitCents),
        icon: profitCents < 0 ? 'trending_down' : 'trending_up',
        valueTone: profitTone,
      },
      { id: 'ticket', label: 'Ticket médio', value: formatCents(ticketCents), icon: 'receipt_long' },
    ],
    alerts,
    topSold,
  };
}
