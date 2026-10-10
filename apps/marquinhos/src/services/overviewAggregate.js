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
import { stockGroupOf } from './catalogTaxonomy';

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

function expenseIso(row, purchase) {
  const purchaseDate = String(purchase?.date || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) return purchaseDate;
  const iso = String(row?.isoDate || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const parsed = parseCashFlowDate(row?.date);
  if (parsed) return parsed;
  const created = rowDate(row);
  return created ? format(created, 'yyyy-MM-dd') : '';
}

function isoInPeriod(iso, range) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return false;
  const start = format(range.start, 'yyyy-MM-dd');
  const end = format(range.end, 'yyyy-MM-dd');
  return iso >= start && iso <= end;
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

function isStaffCost(row) {
  const id = String(row?.categoryId || '').toLowerCase();
  const name = String(row?.category || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return row?.source === 'staff_payroll' || id === 'funcionarios' || id === 'salarios' || name === 'funcionarios' || name === 'salarios';
}

function stamp(row) {
  const date = rowDate(row);
  return date ? format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR }) : row?.date || '—';
}

function saleTitle(sale) {
  if (sale?.numero_comanda) return `Comanda ${sale.numero_comanda}`;
  return sale?.cliente_nome || 'Venda';
}

function saleDetail(sale) {
  const names = (sale?.itens || []).map((item) => item?.nome).filter(Boolean);
  if (!names.length) return '—';
  if (names.length <= 3) return names.join(', ');
  return `${names.slice(0, 3).join(', ')} e mais ${names.length - 3}`;
}

function saleEntry(sale) {
  return {
    id: `sale-${sale.id}`,
    sort: sale.created_at || sale.updated_at || '',
    when: stamp(sale),
    title: saleTitle(sale),
    detail: saleDetail(sale),
    value: formatCents(reaisToCents(sale.total)),
    tone: 'positive',
  };
}

function expenseEntry(row) {
  const title = row?.description || row?.supplier || row?.category || 'Despesa';
  const detail = row?.supplier && row.supplier !== title ? row.supplier : row?.category || '';
  return {
    id: `exp-${row.id}`,
    sort: row?.createdAt || row?.date || '',
    when: stamp(row),
    title,
    detail,
    value: formatCents(expenseCents(row)),
    tone: 'danger',
  };
}

function byNewest(rows) {
  return rows.slice().sort((left, right) => String(right.sort).localeCompare(String(left.sort)));
}

function countLabel(count, singular, plural) {
  const total = new Intl.NumberFormat('pt-BR').format(count);
  return `${total} ${count === 1 ? singular : plural}`;
}

function lineUnitCents(line) {
  const qty = Number(line?.quantidade);
  const fromUnit = reaisToCents(line?.valor_unitario);
  const totalCents = reaisToCents(line?.valor_total);
  const fromTotal = Number.isFinite(qty) && qty > 0 && totalCents > 0 ? Math.round(totalCents / qty) : 0;
  return Math.max(fromUnit, fromTotal);
}

function paidUnitCents(purchase, line) {
  const unit = lineUnitCents(line);
  if (!unit) return 0;
  const lines = purchase?.itens || [];
  let sum = 0;
  lines.forEach((row) => {
    const qty = Number(row?.quantidade);
    if (!Number.isFinite(qty) || qty <= 0) return;
    sum += lineUnitCents(row) * qty;
  });
  const paid = reaisToCents(purchase?.total);
  if (paid > 0 && sum > 0 && paid !== sum) return Math.round(unit * (paid / sum));
  return unit;
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
    const cents = paidUnitCents(purchase, line);
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
  if (range.unit === 'hour') return `hora ${format(date, 'H')}`;
  if (range.unit === 'month') return format(date, 'MMM', { locale: ptBR }).replace('.', '');
  if (range.id === 'mes') return `dia ${format(date, 'd')}`;
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

function splitLineGroups(product, cents, catalog, groups, comboItems) {
  if (!product || !cents) return [];
  if (product.tipo !== 'combo') {
    const group = stockGroupOf(product, groups);
    return group ? [{ group, cents }] : [];
  }
  const parts = (comboItems || []).filter((row) => String(row.combo_id) === String(product.id));
  const weighted = parts
    .map((part) => {
      const child = catalog.get(String(part.produto_associado_id));
      const group = stockGroupOf(child, groups);
      if (!group) return null;
      const qty = Number(part.quantidade) || 1;
      const price = Math.max(parseMoneyToCents(child?.valor_unitario), 1);
      return { group, weight: price * qty };
    })
    .filter(Boolean);
  const totalWeight = weighted.reduce((sum, row) => sum + row.weight, 0);
  if (!totalWeight) return [];
  return weighted.map((row) => ({ group: row.group, cents: Math.round((cents * row.weight) / totalWeight) }));
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
      id: row.id || row.name,
      name: row.name,
      cents: row.cents,
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
  const saleRows = [];
  sales.forEach((sale) => {
    revenueCents += reaisToCents(sale.total);
    saleRows.push(saleEntry(sale));
  });

  let productCents = 0;
  let freelaCents = 0;
  let freelaCount = 0;
  let staffCents = 0;
  let staffCount = 0;
  const costRows = [];
  const freelaRows = [];
  const staffRows = [];
  expenses.forEach((row) => {
    const cents = expenseCents(row);
    const entry = expenseEntry(row);
    if (isProductCost(row)) {
      productCents += cents;
      costRows.push(entry);
    } else if (isFreelaCost(row)) {
      freelaCents += cents;
      costRows.push(entry);
    }
    if (isFreelaCost(row)) {
      freelaCount += 1;
      freelaRows.push(entry);
    }
    if (isStaffCost(row)) {
      staffCents += cents;
      staffCount += 1;
      staffRows.push(entry);
    }
  });
  const purchaseByExpense = new Map(
    (inventory.purchases || [])
      .filter((purchase) => purchase?.expenseId)
      .map((purchase) => [String(purchase.expenseId), purchase])
  );
  let fixedCents = 0;
  let variableCents = 0;
  const fixedRows = [];
  const variableRows = [];
  (cash.expenses || []).forEach((row) => {
    const purchase = purchaseByExpense.get(String(row.id));
    if (purchase?.status === 'cancelada' || row?.source === 'comanda_saldo') return;
    if (!isoInPeriod(expenseIso(row, purchase), range)) return;
    const cents = expenseCents(row);
    const entry = expenseEntry(row);
    if (row?.nature === 'fixed') {
      fixedCents += cents;
      fixedRows.push(entry);
    } else {
      variableCents += cents;
      variableRows.push(entry);
    }
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
      splitLineGroups(product, lineCents(line), catalog, inventory.groups, inventory.comboItems).forEach((part) => {
        const key = part.group.id || part.group.name;
        const bucket = categories.get(key) || { id: key, name: part.group.name, cents: 0 };
        bucket.cents += part.cents;
        categories.set(key, bucket);
      });
    });
  });
  const categoryChart = withPercents(
    [...categories.values()]
      .filter((row) => row.cents > 0)
      .sort((left, right) => right.cents - left.cents || left.name.localeCompare(right.name))
  );
  const groups = categoryChart.rows.slice(0, 5);
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
        productId: item.id,
        name: item.nome || item.name,
        detail: `Estoque ${atual} / sugerido ${sugerido}`,
        icon: 'warning',
      });
    }
    const purchaseCost = latestUnitCostCents(inventory.purchases, item.id) || 0;
    const catalogCost = parseMoneyToCents(item.custo_compra);
    const cost = Math.max(purchaseCost, catalogCost);
    const price = parseMoneyToCents(item.valor_unitario || item.cost);
    if (cost > 0 && price < cost) {
      alerts.push({
        id: `${item.id}-margin`,
        productId: item.id,
        name: item.nome || item.name,
        detail: 'Margem negativa',
        icon: 'trending_down',
      });
    }
  });
  alerts.sort((left, right) => {
    const margin = Number(left.detail !== 'Margem negativa') - Number(right.detail !== 'Margem negativa');
    if (margin) return margin;
    return String(left.name).localeCompare(String(right.name), 'pt-BR');
  });

  const profitTone = profitCents < 0 ? 'negative' : profitCents > 0 ? 'positive' : undefined;
  const seriesUnit = range.unit === 'hour' ? 'hora' : range.unit === 'month' ? 'mês' : 'dia';

  return {
    period: range.id,
    seriesUnit,
    kpis: [
      { id: 'revenue', label: 'Faturamento', value: formatCents(revenueCents), icon: 'payments', entries: byNewest(saleRows) },
      { id: 'cost', label: 'Custos', value: formatCents(costCents), icon: 'engineering', entries: byNewest(costRows) },
      {
        id: 'profit',
        label: 'Lucro líquido',
        value: formatCents(profitCents),
        icon: profitCents < 0 ? 'trending_down' : 'trending_up',
        valueTone: profitTone,
        entries: byNewest([...saleRows, ...costRows]),
      },
      { id: 'ticket', label: 'Ticket médio', value: formatCents(ticketCents), icon: 'receipt_long', entries: byNewest(saleRows) },
      {
        id: 'orders',
        label: 'Qtd. de pedidos',
        value: new Intl.NumberFormat('pt-BR').format(sales.length),
        icon: 'point_of_sale',
        entries: byNewest(saleRows),
      },
      {
        id: 'freela',
        label: 'Freelas',
        value: formatCents(freelaCents),
        badge: countLabel(freelaCount, 'diária', 'diárias'),
        badgeTone: 'neutral',
        icon: 'group',
        entries: byNewest(freelaRows),
      },
      {
        id: 'staff',
        label: 'Funcionários',
        value: formatCents(staffCents),
        badge: countLabel(staffCount, 'lançamento', 'lançamentos'),
        badgeTone: 'neutral',
        icon: 'badge',
        entries: byNewest(staffRows),
      },
      {
        id: 'fixed',
        label: 'Despesas fixas',
        value: formatCents(fixedCents),
        icon: 'lock',
        entries: byNewest(fixedRows),
      },
      {
        id: 'variable',
        label: 'Despesas variáveis',
        value: formatCents(variableCents),
        icon: 'tune',
        entries: byNewest(variableRows),
      },
    ],
    series,
    groups,
    alerts,
    topSold,
  };
}
