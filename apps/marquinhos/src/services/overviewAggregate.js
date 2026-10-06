import {
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCents, parseCashFlowDate, parseMoneyToCents } from './cashFlowUtils';

const PERIODS = ['hoje', 'semana', 'mes', 'ano'];
const HEIGHTS = [0, 30, 35, 40, 45, 50, 65, 75, 80, 85, 90, 95, 98];

export function resolvePeriod(period, now = new Date()) {
  const id = PERIODS.includes(period) ? period : 'mes';
  if (id === 'hoje') {
    return { id, start: startOfDay(now), end: endOfDay(now), unit: 'day' };
  }
  if (id === 'semana') {
    return {
      id,
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 }),
      unit: 'day',
    };
  }
  if (id === 'ano') {
    return { id, start: startOfYear(now), end: endOfYear(now), unit: 'month' };
  }
  return { id: 'mes', start: startOfMonth(now), end: endOfMonth(now), unit: 'day' };
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

function bucketsFor(range, now) {
  if (range.unit === 'month') {
    return eachMonthOfInterval({ start: range.start, end: range.end }).map((date) => ({
      key: format(date, 'yyyy-MM'),
      day: format(date, 'MMM', { locale: ptBR }).replace('.', ''),
      start: startOfMonth(date),
      end: endOfMonth(date),
      revenue: 0,
      expense: 0,
      highlight: isSameMonth(date, now),
    }));
  }
  return eachDayOfInterval({ start: range.start, end: range.end }).map((date) => ({
    key: format(date, 'yyyy-MM-dd'),
    day:
      range.id === 'mes'
        ? format(date, 'dd')
        : format(date, 'EEE', { locale: ptBR }).replace('.', ''),
    start: startOfDay(date),
    end: endOfDay(date),
    revenue: 0,
    expense: 0,
    highlight: isSameDay(date, now),
  }));
}

function snapHeight(value, max) {
  if (!max || !value) return 0;
  const pct = Math.round((value / max) * 100);
  return HEIGHTS.reduce((best, key) => (Math.abs(key - pct) < Math.abs(best - pct) ? key : best));
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
  let expenseCentsTotal = 0;
  expenses.forEach((row) => {
    const cents = expenseCents(row);
    expenseCentsTotal += cents;
    if (isProductCost(row)) productCents += cents;
    else if (isFreelaCost(row)) freelaCents += cents;
  });
  const costCents = productCents + freelaCents;
  const profitCents = revenueCents - costCents;
  const ticketCents = sales.length ? Math.round(revenueCents / sales.length) : 0;

  const buckets = bucketsFor(range, now);
  const bucketOf = (date) => buckets.find((bucket) => inPeriod(date, bucket));
  sales.forEach((sale) => {
    const bucket = bucketOf(rowDate(sale));
    if (bucket) bucket.revenue += reaisToCents(sale.total);
  });
  expenses.forEach((row) => {
    const bucket = bucketOf(rowDate(row));
    if (bucket) bucket.expense += expenseCents(row);
  });
  const maxBar = buckets.reduce((max, bucket) => Math.max(max, bucket.revenue, bucket.expense), 0);
  const series = buckets.map((bucket) => ({
    day: bucket.day,
    revenue: snapHeight(bucket.revenue, maxBar),
    expense: snapHeight(bucket.expense, maxBar),
    highlight: bucket.highlight,
  }));

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
    series,
    alerts,
    topSold,
  };
}
