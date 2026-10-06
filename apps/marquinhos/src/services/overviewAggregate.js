import {
  eachDayOfInterval,
  eachHourOfInterval,
  eachMonthOfInterval,
  endOfDay,
  endOfHour,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  isValid,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfHour,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCents, parseCashFlowDate, parseMoneyToCents } from './cashFlowUtils';

const PERIODS = ['hoje', 'semana', 'mes', 'ano'];

export function resolvePeriod(period, now = new Date()) {
  const id = PERIODS.includes(period) ? period : 'mes';
  if (id === 'hoje') {
    return { id, start: startOfDay(now), end: endOfDay(now), unit: 'hour' };
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

function bucketKey(date, unit) {
  if (unit === 'hour') return format(date, 'yyyy-MM-dd-HH');
  if (unit === 'month') return format(date, 'yyyy-MM');
  return format(date, 'yyyy-MM-dd');
}

function bucketLabel(date, range) {
  if (range.unit === 'hour') return format(date, 'HH');
  if (range.unit === 'month') return format(date, 'MMM', { locale: ptBR }).replace('.', '');
  if (range.id === 'mes') return format(date, 'dd');
  return format(date, 'EEE', { locale: ptBR }).replace('.', '');
}

function bucketsFor(range) {
  if (range.unit === 'hour') {
    return eachHourOfInterval({ start: range.start, end: range.end }).map((date) => ({
      key: bucketKey(date, 'hour'),
      label: bucketLabel(date, range),
      start: startOfHour(date),
      end: endOfHour(date),
      revenue: 0,
      expense: 0,
    }));
  }
  if (range.unit === 'month') {
    return eachMonthOfInterval({ start: range.start, end: range.end }).map((date) => ({
      key: bucketKey(date, 'month'),
      label: bucketLabel(date, range),
      start: startOfMonth(date),
      end: endOfMonth(date),
      revenue: 0,
      expense: 0,
    }));
  }
  return eachDayOfInterval({ start: range.start, end: range.end }).map((date) => ({
    key: bucketKey(date, 'day'),
    label: bucketLabel(date, range),
    start: startOfDay(date),
    end: endOfDay(date),
    revenue: 0,
    expense: 0,
  }));
}

function lineCents(line) {
  if (line?.valor_total != null && line.valor_total !== '') return reaisToCents(line.valor_total);
  const qty = Number(line?.quantidade) || 0;
  return reaisToCents(line?.valor_unitario) * qty;
}

function withPercents(rows) {
  const total = rows.reduce((sum, row) => sum + row.cents, 0);
  if (!total) return { total: 0, rows: [] };
  const raw = rows.map((row) => (row.cents / total) * 100);
  const percents = raw.map((value) => Math.floor(value));
  let left = 100 - percents.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((leftRow, rightRow) => rightRow.frac - leftRow.frac);
  for (let index = 0; index < left; index += 1) {
    percents[order[index].index] += 1;
  }
  return {
    total,
    rows: rows.map((row, index) => ({
      id: row.name,
      name: row.name,
      value: formatCents(row.cents),
      share: percents[index] / 100,
      percent: percents[index],
    })),
  };
}

export function aggregateOverview(period, sources, now = new Date()) {
  const range = resolvePeriod(period, now);
  const inventory = sources?.inventory || {};
  const cash = sources?.cash || {};
  const items = (inventory.items || []).filter((item) => item.tipo !== 'combo');
  const catalog = new Map((inventory.items || []).map((item) => [String(item.id), item]));
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

  const buckets = bucketsFor(range);
  const bucketByKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  sales.forEach((sale) => {
    const date = rowDate(sale);
    const bucket = date ? bucketByKey.get(bucketKey(date, range.unit)) : null;
    if (bucket) bucket.revenue += reaisToCents(sale.total);
  });
  expenses.forEach((row) => {
    const date = rowDate(row);
    const bucket = date ? bucketByKey.get(bucketKey(date, range.unit)) : null;
    if (bucket) bucket.expense += expenseCents(row);
  });
  const series = buckets.map((bucket) => ({
    label: bucket.label,
    revenue: bucket.revenue,
    expense: bucket.expense,
    revenueLabel: formatCents(bucket.revenue),
    expenseLabel: formatCents(bucket.expense),
  }));

  const sold = new Map();
  const categories = new Map();
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

      const product = catalog.get(String(line.produto_id));
      const category = String(product?.categoria || product?.category || 'Outros').trim() || 'Outros';
      const bucket = categories.get(category) || { name: category, cents: 0 };
      bucket.cents += lineCents(line);
      categories.set(category, bucket);
    });
  });
  const categoryChart = withPercents(
    [...categories.values()]
      .filter((row) => row.cents > 0)
      .sort((left, right) => right.cents - left.cents || left.name.localeCompare(right.name))
  );
  const topSold = [...sold.values()]
    .sort((left, right) => right.qty - left.qty || left.name.localeCompare(right.name))
    .slice(0, 5)
    .map((row, index) => {
      const product = catalog.get(row.id);
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
  const seriesUnit = range.unit === 'hour' ? 'hora' : range.unit === 'month' ? 'mês' : 'dia';

  return {
    period: range.id,
    seriesUnit,
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
      {
        id: 'orders',
        label: 'Qtd. de Pedidos',
        value: new Intl.NumberFormat('pt-BR').format(sales.length),
        icon: 'point_of_sale',
      },
    ],
    series,
    categories: categoryChart.rows,
    categoriesTotal: formatCents(categoryChart.total),
    alerts,
    topSold,
  };
}
