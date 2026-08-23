import { expenseCategories } from './fallbacks';
import {
  buildCashFlowSummary,
  formatCents,
  parseMoneyToCents,
} from './cashFlowUtils';
import {
  ensureTenantOps,
  listStaffAccounts,
  patchTenantOpsSection,
  subscribeTenantOpsStore,
} from '../store/tenantOpsStore';
import { DEFAULT_STAFF_PERMISSIONS } from './staffPermissions';

const CATEGORY_NATURE_FALLBACK = {
  Bebidas: 'variable',
  Freelancer: 'variable',
  Suprimentos: 'variable',
  Utilidades: 'fixed',
  Aluguel: 'fixed',
  Software: 'fixed',
  Salários: 'fixed',
  Manutenção: 'variable',
};

const DEFAULT_AVATAR = '';

const STATUS_MAP = {
  available: 'Disponível',
  on_shift: 'Em turno',
  pending_payment: 'Pendente Pgto',
};

function formatExpenseDate(isoDate) {
  if (!isoDate) {
    return new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }
  const date = new Date(`${isoDate}T12:00:00`);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function migrateCashFlow(raw) {
  const categories = raw.categories?.length ? raw.categories : expenseCategories;
  const incomes = (raw.incomes || []).map((row, index) => ({
    ...row,
    id: row.id || `inc-${index + 1}`,
    amount: row.amount ?? parseMoneyToCents(row.value),
  }));
  const expenses = (raw.expenses || []).map((row, index) => {
    const categoryMeta = categories.find(
      (item) => item.id === row.categoryId || item.name === row.category
    );
    const nature =
      row.nature ||
      categoryMeta?.defaultNature ||
      CATEGORY_NATURE_FALLBACK[row.category] ||
      'variable';
    return {
      ...row,
      id: row.id || `exp-${index + 1}`,
      categoryId: row.categoryId || categoryMeta?.id || row.category?.toLowerCase(),
      categoryIcon: row.categoryIcon || categoryMeta?.icon || 'payments',
      nature,
      amount: row.amount ?? parseMoneyToCents(row.value),
      recurrence: row.recurrence ?? null,
      source: row.source || 'manual',
    };
  });
  const summary = buildCashFlowSummary(incomes, expenses, {
    revenueDelta: raw.summary?.revenueDelta,
    expensesDelta: raw.summary?.expensesDelta,
  });
  return {
    ...raw,
    period: raw.period || new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    categories,
    incomes,
    expenses,
    summary: { ...raw.summary, ...summary },
  };
}

function parseStockLabel(label) {
  const match = String(label || '').trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!match) return { qty: 0, unit: 'un' };
  return { qty: Number(match[1].replace(',', '.')), unit: match[2]?.trim() || 'un' };
}

function formatStockLabel(qty, unit) {
  return `${qty} ${unit}`.trim();
}

function recomputeInventoryMetrics(items) {
  const lowCount = items.filter((item) => item.status === 'low').length;
  const totalValueCents = items.reduce((sum, item) => {
    const { qty } = parseStockLabel(item.stock);
    return sum + qty * parseMoneyToCents(item.cost);
  }, 0);
  return [
    {
      id: 'low-stock',
      tone: 'error',
      badge: lowCount ? 'Ação' : 'Ok',
      icon: 'warning',
      label: 'Itens em estoque baixo',
      value: String(lowCount),
      progress: Math.min(100, lowCount * 10),
    },
    {
      id: 'inventory-value',
      tone: 'secondary',
      badge: 'Ativo',
      icon: 'inventory',
      label: 'Valor do inventário',
      value: formatCents(totalValueCents),
      progress: 45,
    },
    {
      id: 'turnover',
      tone: 'tertiary',
      badge: 'Giro',
      icon: 'trending_up',
      label: 'Giro de estoque (mês)',
      value: items.length ? '—' : '—',
      progress: 0,
    },
  ];
}

function teamSummary(people = [], expenses = []) {
  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const todayCents = expenses
    .filter(
      (row) =>
        (row.categoryId === 'freelancer' || row.source === 'freelancer_daily' || row.source === 'platform_daily') &&
        row.date === today
    )
    .reduce((sum, row) => sum + (row.amount || 0), 0);
  const active = people.filter((person) => person.status === 'on_shift').length;
  return {
    costsToday: formatCents(todayCents).replace(',00', ''),
    activeNow: String(active).padStart(2, '0'),
  };
}

function buildOverview(state) {
  const cash = migrateCashFlow(state.cashFlow || {});
  const items = state.inventory?.items || [];
  const people = state.freelancers?.people || [];
  const low = items.filter((item) => item.status === 'low').length;
  const freelaCents = (cash.expenses || [])
    .filter(
      (row) =>
        row.categoryId === 'freelancer' ||
        row.source === 'freelancer_daily' ||
        row.source === 'platform_daily'
    )
    .reduce((sum, row) => sum + (row.amount || 0), 0);
  const revenue = cash.summary.revenueCents || 0;
  const expense = cash.summary.expenseCents || 0;
  const profit = cash.summary.estimatedCents || 0;
  let verdict = { id: 'sobra', label: 'SOBRA' };
  if (!revenue && !expense) verdict = { id: 'vazio', label: 'SEM MOVIMENTO' };
  else if (profit < 0) verdict = { id: 'vermelho', label: 'NO VERMELHO' };
  else if (revenue > 0 && expense / revenue >= 0.8) verdict = { id: 'limite', label: 'NO LIMITE' };

  return {
    metrics: [
      {
        id: 'revenue',
        label: 'Faturamento',
        value: cash.summary.totalRevenue,
        badge: cash.summary.revenueDelta || '0%',
        badgeTone: 'positive',
      },
      {
        id: 'freela-cost',
        label: 'Custo de equipe',
        value: formatCents(freelaCents),
        badge: `${people.filter((p) => p.status === 'on_shift').length} em turno`,
        badgeTone: 'neutral',
      },
      {
        id: 'stock-alert',
        label: 'Estoque baixo',
        value: String(low),
        badge: low ? 'ATENÇÃO' : 'OK',
        badgeTone: low ? 'critical' : 'neutral',
      },
    ],
    weeklyPerformance: state.overview?.weeklyPerformance || [],
    topSold: state.overview?.topSold || [],
    suggestion: state.overview?.suggestion || null,
    verdict,
    summary: cash.summary,
  };
}

function stockCategoryToExpense(category) {
  if (category === 'Insumos') return 'suprimentos';
  if (['Cervejas', 'Destilados', 'Soft Drinks'].includes(category)) return 'bebidas';
  return 'suprimentos';
}

function reaisToCents(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 0;
  if (Number.isInteger(n) && Math.abs(n) >= 1000) return n;
  return Math.round(n * 100);
}

export function createTenantOpsApi(tenantId) {
  const id = String(tenantId || '').trim();
  if (!id) {
    throw new Error('tenantId obrigatório.');
  }

  function state() {
    return ensureTenantOps(id);
  }

  function saveCashFlow(current, patch) {
    const nextBase = { ...current, ...patch };
    const summary = buildCashFlowSummary(nextBase.incomes || [], nextBase.expenses || [], {
      revenueDelta: current.summary?.revenueDelta,
      expensesDelta: current.summary?.expensesDelta,
    });
    const next = { ...nextBase, summary: { ...current.summary, ...summary } };
    patchTenantOpsSection(id, 'cashFlow', next);
    return next;
  }

  async function fetchCashFlow() {
    return migrateCashFlow(state().cashFlow || {});
  }

  async function fetchInventory() {
    const inventory = state().inventory || { items: [], filters: ['Todos'], metrics: [] };
    return {
      ...inventory,
      metrics: recomputeInventoryMetrics(inventory.items || []),
    };
  }

  async function fetchFreelancers() {
    const current = state();
    const cash = migrateCashFlow(current.cashFlow || {});
    const team = current.freelancers || { people: [], dailies: [], roles: ['Barman'] };
    return {
      ...team,
      summary: teamSummary(team.people, cash.expenses),
    };
  }

  async function fetchSuppliers() {
    return state().suppliers || { suppliers: [] };
  }

  async function fetchOverview() {
    return buildOverview(state());
  }

  async function recordSupplierPurchase({ supplierId, date, category, value, amount, expenseId }) {
    if (!supplierId) return null;
    const current = await fetchSuppliers();
    const suppliers = (current.suppliers || []).map((item) => {
      if (String(item.id) !== String(supplierId)) return item;
      const entry = {
        id: expenseId || `hist-${Date.now()}`,
        date,
        category: category || 'Despesa',
        value,
        amount,
      };
      return {
        ...item,
        lastPurchase: date,
        lastValue: value,
        lastAmount: amount,
        history: [entry, ...(item.history || [])],
      };
    });
    patchTenantOpsSection(id, 'suppliers', { ...current, suppliers });
    return { suppliers };
  }

  async function createCashExpense(payload) {
    const current = await fetchCashFlow();
    const category =
      (current.categories || expenseCategories).find((item) => item.id === payload.categoryId) ||
      expenseCategories[0];
    const amountCents = payload.amount ?? parseMoneyToCents(payload.value ?? payload.dailyRate);
    const nature = payload.nature || category.defaultNature || 'variable';
    const expense = {
      id: payload.id || `exp-${Date.now()}`,
      date: formatExpenseDate(payload.date),
      isoDate: payload.date || new Date().toISOString().slice(0, 10),
      supplier: String(payload.supplier || '').trim() || 'Despesa',
      supplierId: payload.supplierId || null,
      category: category.name,
      categoryId: category.id,
      categoryIcon: category.icon,
      nature,
      value: formatCents(amountCents),
      amount: amountCents,
      recurrence: payload.recurrence || null,
      source: payload.source || 'manual',
      proposalId: payload.proposalId || null,
      createdAt: new Date().toISOString(),
    };
    const expenses = [expense, ...(current.expenses || [])];
    saveCashFlow(current, { expenses });
    if (payload.supplierId) {
      await recordSupplierPurchase({
        supplierId: payload.supplierId,
        date: expense.date,
        category: category.name,
        value: expense.value,
        amount: amountCents,
        expenseId: expense.id,
      });
    }
    return expense;
  }

  async function removeCashExpense(expenseId) {
    const current = await fetchCashFlow();
    return saveCashFlow(current, {
      expenses: (current.expenses || []).filter((row) => String(row.id) !== String(expenseId)),
    });
  }

  async function createCashIncome(payload) {
    const current = await fetchCashFlow();
    const amountCents = payload.amount ?? parseMoneyToCents(payload.value);
    const income = {
      id: `inc-${Date.now()}`,
      date: formatExpenseDate(payload.date),
      isoDate: payload.date || new Date().toISOString().slice(0, 10),
      description: String(payload.description || '').trim(),
      category: payload.category || 'Varejo',
      categoryIcon: payload.categoryIcon || 'payments',
      categoryTone: payload.categoryTone || 'secondary',
      value: formatCents(amountCents),
      amount: amountCents,
      createdAt: new Date().toISOString(),
    };
    saveCashFlow(current, { incomes: [income, ...(current.incomes || [])] });
    return income;
  }

  async function updateCashIncome(incomeId, payload) {
    const current = await fetchCashFlow();
    const amountCents =
      payload.amount ??
      (payload.value != null ? parseMoneyToCents(payload.value) : null);
    const incomes = (current.incomes || []).map((row) => {
      if (String(row.id) !== String(incomeId)) return row;
      return {
        ...row,
        date: payload.date ? formatExpenseDate(payload.date) : row.date,
        isoDate: payload.date || row.isoDate,
        description:
          payload.description != null ? String(payload.description).trim() : row.description,
        category: payload.category || row.category,
        value: amountCents != null ? formatCents(amountCents) : row.value,
        amount: amountCents != null ? amountCents : row.amount,
      };
    });
    return saveCashFlow(current, { incomes });
  }

  async function addStockEntry(payload) {
    const current = await fetchInventory();
    const items = [...(current.items || [])];
    const index = items.findIndex((item) => String(item.id) === String(payload.itemId));
    if (index < 0) throw new Error('Item não encontrado.');
    const item = items[index];
    const parsed = parseStockLabel(item.stock);
    const minParsed = parseStockLabel(item.minStock);
    const addQty = Number(payload.quantity);
    if (!Number.isFinite(addQty) || addQty <= 0) throw new Error('Quantidade inválida.');
    const amountCents = payload.amount ?? parseMoneyToCents(payload.value);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      throw new Error('Informe o valor da compra.');
    }
    const supplierName = String(payload.supplier || '').trim();
    if (!supplierName) throw new Error('Informe o fornecedor.');
    const nextQty = parsed.qty + addQty;
    const unit = parsed.unit || minParsed.unit || 'un';
    const status = nextQty < minParsed.qty ? 'low' : 'stable';
    items[index] = {
      ...item,
      stock: formatStockLabel(nextQty, unit),
      status,
      statusLabel: status === 'low' ? 'Estoque baixo' : 'Estável',
    };
    patchTenantOpsSection(id, 'inventory', {
      ...current,
      items,
      metrics: recomputeInventoryMetrics(items),
    });
    await createCashExpense({
      date: payload.date || new Date().toISOString().slice(0, 10),
      supplier: supplierName,
      supplierId: payload.supplierId || null,
      categoryId: stockCategoryToExpense(item.category),
      nature: 'variable',
      amount: amountCents,
      source: 'stock_entry',
    });
    return items[index];
  }

  async function createInventoryItem(payload) {
    const current = await fetchInventory();
    const items = [...(current.items || [])];
    const nextId =
      items.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
    const qty = Number(payload.quantity || payload.stock || 0);
    const min = Number(payload.minStock || 0);
    const unit = payload.unit || 'un';
    const status = qty < min ? 'low' : 'stable';
    const item = {
      id: nextId,
      name: String(payload.name || '').trim(),
      subtitle: String(payload.subtitle || '').trim(),
      category: payload.category || 'Insumos',
      stock: formatStockLabel(qty || 0, unit),
      minStock: formatStockLabel(min || 0, unit),
      cost: formatCents(payload.amount ?? parseMoneyToCents(payload.cost || payload.value || 0)),
      status,
      statusLabel: status === 'low' ? 'Estoque baixo' : 'Estável',
      image: payload.image || '',
    };
    if (!item.name) throw new Error('Nome do item obrigatório.');
    const next = [...items, item];
    patchTenantOpsSection(id, 'inventory', {
      ...current,
      items: next,
      metrics: recomputeInventoryMetrics(next),
    });
    return item;
  }

  async function removeInventoryItem(itemId) {
    const current = await fetchInventory();
    const items = (current.items || []).filter((item) => String(item.id) !== String(itemId));
    const next = { ...current, items, metrics: recomputeInventoryMetrics(items) };
    patchTenantOpsSection(id, 'inventory', next);
    return next;
  }

  async function createFreelancer(payload) {
    const current = await fetchFreelancers();
    const nextId =
      (current.people || []).reduce((max, person) => Math.max(max, Number(person.id) || 0), 0) + 1;
    const status = payload.status || 'available';
    const person = {
      id: nextId,
      name: String(payload.name || '').trim(),
      role: String(payload.role || 'Barman').trim(),
      status,
      statusLabel: STATUS_MAP[status] || STATUS_MAP.available,
      dailyRate: String(payload.dailyRate || '').startsWith('R$')
        ? String(payload.dailyRate)
        : formatCents(Math.round(Number(payload.dailyRate || 0) * 100)),
      image: payload.image?.trim() || DEFAULT_AVATAR,
    };
    const next = { ...current, people: [...(current.people || []), person] };
    patchTenantOpsSection(id, 'freelancers', next);
    return person;
  }

  async function removeFreelancer(freelancerId) {
    const current = await fetchFreelancers();
    const next = {
      ...current,
      people: (current.people || []).filter((person) => String(person.id) !== String(freelancerId)),
    };
    patchTenantOpsSection(id, 'freelancers', next);
    return next;
  }

  async function settleFreelancer(freelancerId) {
    const current = await fetchFreelancers();
    const people = (current.people || []).map((person) => {
      if (String(person.id) !== String(freelancerId)) return person;
      return { ...person, status: 'available', statusLabel: STATUS_MAP.available };
    });
    const next = { ...current, people };
    patchTenantOpsSection(id, 'freelancers', next);
    return people.find((person) => String(person.id) === String(freelancerId));
  }

  async function createDaily(payload) {
    const current = await fetchFreelancers();
    const next = {
      ...current,
      dailies: [...(current.dailies || []), { ...payload, createdAt: new Date().toISOString() }],
    };
    patchTenantOpsSection(id, 'freelancers', next);
    const person = (current.people || []).find(
      (item) => String(item.id) === String(payload.freelancerId)
    );
    const amountCents =
      payload.value != null
        ? Math.round(Number(payload.value) * 100)
        : parseMoneyToCents(person?.dailyRate);
    await createCashExpense({
      date: payload.date,
      supplier: person?.name || `Equipe #${payload.freelancerId}`,
      categoryId: 'freelancer',
      nature: 'variable',
      amount: amountCents,
      source: 'freelancer_daily',
    });
    return next;
  }

  async function fetchStaff() {
    return state().staff || { people: [] };
  }

  async function createStaff(payload) {
    const email = String(payload.email || '').trim().toLowerCase();
    const name = String(payload.name || '').trim();
    const password = String(payload.password || '');
    const title = String(payload.title || 'Equipe').trim();
    if (!email || !name || !password) {
      throw new Error('Preencha nome, e-mail e senha.');
    }
    if (listStaffAccounts().some((item) => item.email === email)) {
      throw new Error('E-mail já cadastrado.');
    }
    const current = await fetchStaff();
    const nextId =
      (current.people || []).reduce((max, person) => Math.max(max, Number(person.id) || 0), 0) + 1;
    const person = {
      id: nextId,
      name,
      email,
      password,
      title,
      permissions: Array.isArray(payload.permissions)
        ? payload.permissions
        : DEFAULT_STAFF_PERMISSIONS,
      createdAt: new Date().toISOString(),
    };
    const next = { people: [...(current.people || []), person] };
    patchTenantOpsSection(id, 'staff', next);
    return person;
  }

  async function updateStaff(staffId, payload) {
    const current = await fetchStaff();
    const email = payload.email != null ? String(payload.email).trim().toLowerCase() : null;
    if (email && listStaffAccounts().some((item) => item.email === email && String(item.id) !== String(staffId))) {
      throw new Error('E-mail já cadastrado.');
    }
    const people = (current.people || []).map((person) => {
      if (String(person.id) !== String(staffId)) return person;
      return {
        ...person,
        name: payload.name != null ? String(payload.name).trim() : person.name,
        email: email || person.email,
        password: payload.password ? String(payload.password) : person.password,
        title: payload.title != null ? String(payload.title).trim() : person.title,
        permissions: Array.isArray(payload.permissions) ? payload.permissions : person.permissions,
      };
    });
    const next = { people };
    patchTenantOpsSection(id, 'staff', next);
    return people.find((person) => String(person.id) === String(staffId));
  }

  async function removeStaff(staffId) {
    const current = await fetchStaff();
    const next = {
      people: (current.people || []).filter((person) => String(person.id) !== String(staffId)),
    };
    patchTenantOpsSection(id, 'staff', next);
    return next;
  }

  async function createSupplier(payload) {
    const current = await fetchSuppliers();
    const nextId =
      (current.suppliers || []).reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
    const supplier = {
      id: nextId,
      name: String(payload.name || '').trim(),
      contact: String(payload.contact || '').trim(),
      cnpj: String(payload.cnpj || '').trim(),
      lastPurchase: '',
      lastValue: '',
      lastAmount: 0,
      history: [],
    };
    const next = { ...current, suppliers: [...(current.suppliers || []), supplier] };
    patchTenantOpsSection(id, 'suppliers', next);
    return supplier;
  }

  async function removeSupplier(supplierId) {
    const current = await fetchSuppliers();
    const next = {
      ...current,
      suppliers: (current.suppliers || []).filter((item) => String(item.id) !== String(supplierId)),
    };
    patchTenantOpsSection(id, 'suppliers', next);
    return next;
  }

  return {
    tenantId: id,
    fetchOverview,
    fetchCashFlow,
    fetchInventory,
    fetchFreelancers,
    fetchSuppliers,
    createCashExpense,
    removeCashExpense,
    createCashIncome,
    updateCashIncome,
    fetchStaff,
    createStaff,
    updateStaff,
    removeStaff,
    addStockEntry,
    createInventoryItem,
    removeInventoryItem,
    createDaily,
    createFreelancer,
    removeFreelancer,
    settleFreelancer,
    createSupplier,
    removeSupplier,
  };
}

export function mirrorPlatformDailyToCashFlow(tenantId, payload) {
  const api = createTenantOpsApi(tenantId);
  return api.fetchCashFlow().then((cash) => {
    const already = (cash.expenses || []).some(
      (row) => row.source === 'platform_daily' && String(row.proposalId) === String(payload.proposalId)
    );
    if (already) return null;
    return api.createCashExpense({
      id: `exp-plat-${payload.proposalId}`,
      date: payload.date,
      supplier: payload.freelaName || 'Freela plataforma',
      categoryId: 'freelancer',
      nature: 'variable',
      amount: reaisToCents(payload.amount),
      source: 'platform_daily',
      proposalId: payload.proposalId,
    });
  });
}

export { subscribeTenantOpsStore };
