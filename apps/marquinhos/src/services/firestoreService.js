import { doc, getDoc, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { createAuthUserRest } from './identity';
import {
  overviewFallback,
  cashFlowFallback,
  inventoryFallback,
  freelancersFallback,
  suppliersFallback,
  expenseCategories,
} from './fallbacks';
import {
  buildCashFlowSummary,
  formatCents,
  parseMoneyToCents,
} from './cashFlowUtils';
import {
  assertInstallments,
  assertMedida,
  assertPaymentMethod,
  assertVolumePeso,
  formatProductCode,
  isLowStock,
  maxProductCode,
  nextProductCode,
  normalizeMedida,
} from './inventoryProduct';
import { assertPrice, assertPromotionWindow, promotionStatus, saleUnitPrice } from './catalogRules';
import {
  assertComanda,
  optionalComanda,
  normalizeSale,
  paidSalesOnDay,
  shiftAlreadyClosed,
  totalsByPayment,
} from './saleRules';
import { format } from 'date-fns';
import { isValidPhone, maskPhone } from './freelancerSchedule';

const TENANT_ID = 'marquinhos';
const OPS_COLLECTION = ['tenants', TENANT_ID, 'data', 'ops'];
const SECTION_KEYS = ['overview', 'cashFlow', 'inventory', 'freelancers', 'suppliers', 'staff'];
const USER_FIELDS = [
  'email',
  'name',
  'roles',
  'role',
  'tenantId',
  'freelaId',
  'barRole',
  'title',
  'phone',
  'company',
  'photoURL',
  'permissions',
  'createdAt',
  'updatedAt',
  'uid',
];

const DOCS = {
  overview: 'dashboard/overview',
  cashFlow: 'dashboard/cashFlow',
  inventory: 'dashboard/inventory',
  freelancers: 'dashboard/freelancers',
  suppliers: 'dashboard/suppliers',
  staff: 'dashboard/staff',
  customers: 'dashboard/customers',
};

const DEFAULT_PRODUCT_IMAGE =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuATrb95GgrifNn5ZTFGKBOO3ST2xuzttKMuPO21tPew8Bzeb3UowFhw7W7JPuHD03armjXVgDMfWq79f_IxkS6Ant9g94kkvwghZGZz1tY_d-a1jqeZXTPyjUoEuQj3UzPK_KUKPOtL0yJA_Jqp9HA2EAh3wnjfpNPk8OEGoMmnqpuQ4txI8OKgIIPruQWqYtqLABnNoiIjSvCr1J3TujAb_QMUY71yBS2sQvj2j9OfKsyH2lckNOcmk1Lp6U5MJeVvbUlS7b3z4cVl';

export const staffFallback = {
  members: [],
};

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

let opsCache = null;

function requireDb() {
  if (!isFirebaseConfigured() || !db) {
    throw new Error('Firebase não configurado.');
  }
}

function toDocRef(path) {
  const segments = path.split('/').filter(Boolean);
  return doc(db, ...segments);
}

function pickUserFields(data) {
  const next = {};
  USER_FIELDS.forEach((key) => {
    if (data[key] !== undefined) next[key] = data[key];
  });
  return next;
}

function staffAsPeople(staff) {
  const source = staff?.people || staff?.members || [];
  return {
    people: source.map((item, index) => {
      const { password: _ignored, ...safe } = item;
      return {
        id: safe.id || index + 1,
        uid: safe.uid || null,
        name: safe.name,
        email: safe.email,
        title: safe.title || 'Equipe',
        permissions: Array.isArray(safe.permissions)
          ? safe.permissions
          : safe.role === 'admin' || safe.barRole === 'admin'
            ? ['overview', 'caixa', 'estoque', 'fornecedores', 'equipe']
            : ['estoque'],
        barRole: safe.barRole || safe.role || 'stock',
        createdAt: safe.createdAt || new Date().toISOString(),
      };
    }),
  };
}

function staffAsMembers(staff) {
  return {
    members: staffAsPeople(staff).people.map((item) => ({
      uid: item.uid,
      email: item.email,
      name: item.name,
      title: item.title,
      role: item.barRole === 'admin' ? 'admin' : 'stock',
      createdAt: item.createdAt,
    })),
  };
}

function emptyOps() {
  return {
    overview: overviewFallback,
    cashFlow: cashFlowFallback,
    inventory: inventoryFallback,
    freelancers: freelancersFallback,
    suppliers: suppliersFallback,
    staff: { people: [] },
  };
}

function sectionKey(path) {
  if (path.startsWith('dashboard/')) return path.slice('dashboard/'.length);
  return null;
}

async function readOps() {
  requireDb();
  if (opsCache) return opsCache;
  const snap = await getDoc(doc(db, ...OPS_COLLECTION));
  if (snap.exists()) {
    opsCache = snap.data();
    return opsCache;
  }

  const migrated = emptyOps();
  await Promise.all(
    SECTION_KEYS.map(async (key) => {
      const legacy = await getDoc(doc(db, 'dashboard', key));
      if (legacy.exists()) {
        migrated[key] = key === 'staff' ? staffAsPeople(legacy.data()) : legacy.data();
      }
    })
  );
  if (migrated.staff?.members && !migrated.staff.people) {
    migrated.staff = staffAsPeople(migrated.staff);
  }
  await setDoc(doc(db, ...OPS_COLLECTION), migrated);
  opsCache = migrated;
  return opsCache;
}

function omitUndefined(value) {
  if (Array.isArray(value)) return value.map(omitUndefined);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .map(([key, entry]) => [key, omitUndefined(entry)])
    );
  }
  return value;
}

async function writeOps(next) {
  requireDb();
  const payload = omitUndefined(next);
  opsCache = payload;
  await setDoc(doc(db, ...OPS_COLLECTION), payload);
  return payload;
}

async function commitOps(mutator) {
  requireDb();
  const ref = doc(db, ...OPS_COLLECTION);
  const outcome = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    const ops = snap.exists() ? snap.data() : emptyOps();
    const produced = mutator(ops);
    const payload = omitUndefined(produced.ops);
    transaction.set(ref, payload);
    return { payload, value: produced.value };
  });
  opsCache = outcome.payload;
  return outcome.value;
}

async function writeEmailLock(email, uid) {
  requireDb();
  const id = String(email || '').trim().toLowerCase();
  if (!id) return;
  await setDoc(doc(db, 'emails', id), { uid, email: id });
}

async function emailTaken(email) {
  requireDb();
  const id = String(email || '').trim().toLowerCase();
  const snap = await getDoc(doc(db, 'emails', id));
  return snap.exists();
}

async function readDocument(path) {
  requireDb();
  if (path.startsWith('users/')) {
    const snap = await getDoc(toDocRef(path));
    return snap.exists() ? snap.data() : null;
  }
  const key = sectionKey(path);
  if (key) {
    const ops = await readOps();
    if (key === 'staff') return staffAsMembers(ops.staff);
    return ops[key] || null;
  }
  const snap = await getDoc(toDocRef(path));
  return snap.exists() ? snap.data() : null;
}

async function writeDocument(path, data, merge = false) {
  requireDb();
  if (path.startsWith('users/')) {
    const payload = pickUserFields(merge ? { ...(await readDocument(path)), ...data } : data);
    await setDoc(toDocRef(path), payload);
    return payload;
  }
  const key = sectionKey(path);
  if (key) {
    const ops = await readOps();
    const current = ops[key] || {};
    const nextSection =
      key === 'staff'
        ? staffAsPeople(merge ? { ...current, ...data } : data)
        : merge
          ? { ...current, ...data }
          : data;
    await writeOps({ ...ops, [key]: nextSection });
    return key === 'staff' ? staffAsMembers(nextSection) : nextSection;
  }
  await setDoc(toDocRef(path), data, { merge });
  return data;
}

async function patchDocument(path, data) {
  requireDb();
  if (path.startsWith('users/')) {
    return writeDocument(path, data, true);
  }
  const key = sectionKey(path);
  if (key) {
    return writeDocument(path, data, true);
  }
  await updateDoc(toDocRef(path), data);
  return data;
}

function migrateCashFlow(raw) {
  if (!raw) return cashFlowFallback;

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
    period: raw.period || cashFlowFallback.period,
    categories,
    incomes,
    expenses,
    summary: {
      ...raw.summary,
      ...summary,
    },
  };
}

export async function ensureDashboardSeed() {
  const ops = await readOps();
  const cashFlow = ops.cashFlow;
  if (!cashFlow) return;
  const migrated = migrateCashFlow(cashFlow);
  const needsWrite =
    !cashFlow.categories?.length ||
    (cashFlow.expenses || []).some((row) => !row.nature || row.amount == null);
  if (needsWrite) {
    await writeDocument(DOCS.cashFlow, migrated);
  }
}

function unwrapOverview(raw) {
  if (!raw || typeof raw !== 'object') return {};
  if (Array.isArray(raw.metrics) || Array.isArray(raw.weeklyPerformance) || 'topSold' in raw) {
    return raw;
  }
  if (raw.overview && typeof raw.overview === 'object') {
    return raw.overview;
  }
  return raw;
}

function buildOverview(rawOverview, rawCash, rawInventory, rawFreelancers) {
  const source = unwrapOverview(rawOverview);
  const cash = migrateCashFlow(rawCash || cashFlowFallback);
  const items = Array.isArray(rawInventory?.items) ? rawInventory.items : [];
  const people = Array.isArray(rawFreelancers?.people) ? rawFreelancers.people : [];
  const low = items.filter((item) => item.status === 'low').length;
  const freelaCents = (cash.expenses || [])
    .filter(
      (row) =>
        row.categoryId === 'freelancer' ||
        row.source === 'freelancer_daily' ||
        row.source === 'platform_daily'
    )
    .reduce((sum, row) => sum + (row.amount || 0), 0);

  return {
    ...overviewFallback,
    ...source,
    metrics: [
      {
        id: 'revenue',
        label: 'Faturamento Diário',
        value: cash.summary?.totalRevenue || 'R$ 0',
        badge: cash.summary?.revenueDelta || '',
        badgeTone: 'positive',
        icon: 'payments',
      },
      {
        id: 'freela-cost',
        label: 'Custo de Freelas Hoje',
        value: formatCents(freelaCents),
        badge: `${people.filter((p) => p.status === 'on_shift').length} em turno`,
        badgeTone: 'neutral',
        icon: 'engineering',
      },
      {
        id: 'stock-alert',
        label: 'Alerta de Estoque',
        value: `${low} ${low === 1 ? 'Item' : 'Itens'}`,
        badge: low ? 'ATENÇÃO' : '',
        badgeTone: low ? 'critical' : 'neutral',
        icon: 'warning',
      },
    ],
    weeklyPerformance: Array.isArray(source.weeklyPerformance)
      ? source.weeklyPerformance
      : overviewFallback.weeklyPerformance,
    topSold: Array.isArray(source.topSold) ? source.topSold : [],
    suggestion: source.suggestion ?? overviewFallback.suggestion,
  };
}

function normalizeInventory(raw) {
  const current = raw && typeof raw === 'object' ? raw : inventoryFallback;
  const source = Array.isArray(current.items) ? current.items : [];
  let max = maxProductCode(source);
  const items = source.map((item) => {
    const codigo = item.codigo || formatProductCode(max + 1);
    if (!item.codigo) max += 1;
    return presentProduct(item, codigo);
  });
  return {
    ...inventoryFallback,
    ...current,
    filters: current.filters?.length ? current.filters : inventoryFallback.filters,
    items,
    entries: Array.isArray(current.entries) ? current.entries : [],
    productions: Array.isArray(current.productions) ? current.productions : [],
    promotions: Array.isArray(current.promotions) ? current.promotions : [],
    comboItems: Array.isArray(current.comboItems) ? current.comboItems : [],
    sales: (Array.isArray(current.sales) ? current.sales : []).map(normalizeSale),
    closings: Array.isArray(current.closings) ? current.closings : [],
    purchases: Array.isArray(current.purchases) ? current.purchases : [],
    metrics: recomputeInventoryMetrics(items),
  };
}

export async function getOverview() {
  await ensureDashboardSeed();
  const [overview, cashFlow, inventory, freelancers] = await Promise.all([
    readDocument(DOCS.overview),
    readDocument(DOCS.cashFlow),
    readDocument(DOCS.inventory),
    readDocument(DOCS.freelancers),
  ]);
  return buildOverview(overview, cashFlow, inventory, freelancers);
}

export async function getCashFlow() {
  await ensureDashboardSeed();
  const raw = (await readDocument(DOCS.cashFlow)) || cashFlowFallback;
  return migrateCashFlow(raw);
}

export async function getInventory() {
  await ensureDashboardSeed();
  const now = await readServerNow();
  const inventory = normalizeInventory((await readDocument(DOCS.inventory)) || inventoryFallback);
  return {
    ...inventory,
    promotions: (inventory.promotions || []).map((row) => ({
      ...promotionRecord(row),
      status: promotionStatus(row, now),
    })),
    serverNow: now.toISOString(),
  };
}

function normalizeFreelancers(raw) {
  const current = raw && typeof raw === 'object' ? raw : freelancersFallback;
  return {
    ...freelancersFallback,
    ...current,
    roles: current.roles?.length ? current.roles : freelancersFallback.roles,
    people: Array.isArray(current.people) ? current.people : [],
    dailies: Array.isArray(current.dailies) ? current.dailies : [],
    summary: current.summary || freelancersFallback.summary,
  };
}

export async function getFreelancers() {
  await ensureDashboardSeed();
  return normalizeFreelancers((await readDocument(DOCS.freelancers)) || freelancersFallback);
}

export async function getSuppliers() {
  await ensureDashboardSeed();
  return (await readDocument(DOCS.suppliers)) || suppliersFallback;
}

const DEFAULT_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBLUK_0nt1iOMXY4isHF_UpbtSOlSxkTjnXRly3vOscbot3g3xAhqe0vcX6FsT9wnRS-r_knQw4sOkeihz8A__vWSS8JWNI9jxJFSNElJiRdcnXwzvH73D6LasUeIDTtc7la-RFta_Y-vYvnZ5qnLjjEv00bo7bahCl3F5TXPB3WVC-KUTwTnVm59MA9_cq3tADmM3BepB4xfTwYQfswxZR7OHski_jooCy-Y1RiShLxne-taSYSbfkK-y6d8xkyDrOu8A6wczWf63E';

const STATUS_MAP = {
  available: 'Disponível',
  on_shift: 'Em turno',
  pending_payment: 'Pendente Pgto',
};

function formatExpenseDate(isoDate) {
  if (!isoDate) {
    const now = new Date();
    return now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }
  const date = new Date(`${isoDate}T12:00:00`);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export async function createExpense(payload) {
  const current = await getCashFlow();
  const category =
    (current.categories || expenseCategories).find(
      (item) => item.id === payload.categoryId
    ) || expenseCategories[0];

  const amountCents =
    payload.amount ?? parseMoneyToCents(payload.value ?? payload.dailyRate);
  const nature = payload.nature || category.defaultNature || 'variable';

  const expense = {
    id: payload.id || `exp-${Date.now()}`,
    date: formatExpenseDate(payload.date),
    supplier: payload.supplier.trim(),
    supplierId: payload.supplierId || null,
    category: category.name,
    categoryId: category.id,
    categoryIcon: category.icon,
    nature,
    value: formatCents(amountCents),
    amount: amountCents,
    recurrence: payload.recurrence || null,
    source: payload.source || 'manual',
    importKey: payload.importKey || null,
    createdAt: new Date().toISOString(),
  };

  const expenses = [expense, ...(current.expenses || [])];
  const summary = buildCashFlowSummary(current.incomes, expenses, {
    revenueDelta: current.summary?.revenueDelta,
    expensesDelta: current.summary?.expensesDelta,
  });

  const next = {
    ...current,
    expenses,
    summary: {
      ...current.summary,
      ...summary,
    },
  };

  await writeDocument(DOCS.cashFlow, next);

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

async function saveCashFlow(current, patch) {
  const nextBase = { ...current, ...patch };
  const summary = buildCashFlowSummary(nextBase.incomes || [], nextBase.expenses || [], {
    revenueDelta: current.summary?.revenueDelta,
    expensesDelta: current.summary?.expensesDelta,
  });
  const next = {
    ...nextBase,
    summary: {
      ...current.summary,
      ...summary,
    },
  };
  await writeDocument(DOCS.cashFlow, next);
  return next;
}

export async function deleteExpense(expenseId) {
  const current = await getCashFlow();
  const expenses = (current.expenses || []).filter((row) => String(row.id) !== String(expenseId));
  return saveCashFlow(current, { expenses });
}

export async function createIncome(payload) {
  const current = await getCashFlow();
  const amountCents =
    payload.amount ?? parseMoneyToCents(payload.value);
  const income = {
    id: payload.id || `inc-${Date.now()}`,
    date: formatExpenseDate(payload.date),
    description: payload.description.trim(),
    category: payload.category || 'Varejo',
    categoryIcon: payload.categoryIcon || 'payments',
    categoryTone: payload.categoryTone || 'secondary',
    value: formatCents(amountCents),
    amount: amountCents,
    source: payload.source || 'manual',
    importKey: payload.importKey || null,
    createdAt: new Date().toISOString(),
  };
  return saveCashFlow(current, {
    incomes: [income, ...(current.incomes || [])],
  }).then(() => income);
}

function parseStockLabel(label) {
  const match = String(label || '').trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!match) {
    return { qty: 0, unit: 'un' };
  }
  return {
    qty: Number(match[1].replace(',', '.')),
    unit: match[2]?.trim() || 'un',
  };
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
      badge: 'Ação Necessária',
      icon: 'warning',
      label: 'Itens em Estoque Baixo',
      value: String(lowCount),
      progress: Math.min(100, lowCount * 10),
    },
    {
      id: 'inventory-value',
      tone: 'secondary',
      badge: 'Ativo',
      icon: 'inventory',
      label: 'Valor Total do Inventário',
      value: formatCents(totalValueCents),
      progress: 45,
    },
    {
      id: 'turnover',
      tone: 'tertiary',
      badge: 'Eficiência',
      icon: 'trending_up',
      label: 'Giro de Estoque (Mês)',
      value: '4.2x',
      progress: 80,
    },
  ];
}

function promotionRecord(row) {
  return {
    id: row.id,
    produto_id: row.produto_id,
    preco_promocional: row.preco_promocional,
    data_inicio: row.data_inicio,
    data_termino: row.data_termino,
  };
}

async function saveInventory(current, items) {
  const { serverNow: _serverNow, ...rest } = current || {};
  const next = {
    ...rest,
    items,
    promotions: (rest.promotions || []).map(promotionRecord),
    metrics: recomputeInventoryMetrics(items),
  };
  await writeDocument(DOCS.inventory, next);
  return next;
}

const CLOCK_DOC = ['tenants', TENANT_ID, 'data', 'clock'];
let clockOffsetMs = null;
let clockSampledAt = 0;

async function readServerNow() {
  requireDb();
  if (clockOffsetMs != null && Date.now() - clockSampledAt < 60_000) {
    return new Date(Date.now() + clockOffsetMs);
  }
  const ref = doc(db, ...CLOCK_DOC);
  await setDoc(ref, { at: serverTimestamp() });
  const snap = await getDoc(ref);
  const at = snap.data()?.at;
  if (!at || typeof at.toDate !== 'function') {
    throw new Error('Não foi possível ler o horário do servidor.');
  }
  const serverDate = at.toDate();
  clockOffsetMs = serverDate.getTime() - Date.now();
  clockSampledAt = Date.now();
  return serverDate;
}

function presentProduct(item, codigo) {
  const parsed = parseStockLabel(item.stock);
  const minParsed = parseStockLabel(item.minStock);
  const medida = normalizeMedida(item.medida) || normalizeMedida(item.unidade) || 'UN';
  const volumeNumber = Number(item.volume_peso);
  const volumePeso = Number.isFinite(volumeNumber) ? volumeNumber : 0;
  const stockUnit = item.stock ? parsed.unit || 'un' : 'un';
  const estoqueAtual = item.stock ? parsed.qty : Number(item.estoque_atual) || 0;
  const estoqueSugerido =
    item.estoque_sugerido != null && item.estoque_sugerido !== ''
      ? Number(item.estoque_sugerido)
      : minParsed.qty;
  const lowStock = isLowStock(estoqueAtual, estoqueSugerido);
  const nome = String(item.nome || item.name || '').trim();
  const categoria = String(item.categoria || item.category || 'Insumos').trim() || 'Insumos';
  const descricao = String(item.descricao || item.subtitle || '').trim();
  const foto = item.foto || item.image || DEFAULT_PRODUCT_IMAGE;
  const valor =
    item.valor_unitario != null && item.valor_unitario !== ''
      ? item.valor_unitario
      : item.cost || formatCents(0);
  const cost = String(valor).includes('R$') ? String(valor) : formatCents(parseMoneyToCents(valor));
  const rest = { ...item };
  delete rest.unidade;
  return {
    ...rest,
    codigo: formatProductCode(item.codigo || codigo),
    nome,
    name: nome,
    marca: String(item.marca || '').trim(),
    descricao,
    subtitle: descricao,
    categoria,
    category: categoria,
    volume_peso: volumePeso,
    medida,
    tipo: item.tipo === 'combo' ? 'combo' : 'simples',
    estoque_atual: estoqueAtual,
    estoque_sugerido: estoqueSugerido,
    valor_unitario: cost,
    cost,
    foto,
    image: foto,
    stock: formatStockLabel(estoqueAtual, stockUnit),
    minStock: formatStockLabel(estoqueSugerido, item.minStock ? minParsed.unit || stockUnit : stockUnit),
    lowStock,
    status: lowStock ? 'low' : 'stable',
    statusLabel: lowStock ? 'Estoque Baixo' : 'Estável',
  };
}

async function actorId() {
  const { getCurrentUser } = await import('./authService');
  return getCurrentUser()?.uid || null;
}

function persistProduct(item) {
  const nome = item.nome || '';
  const descricao = item.descricao || '';
  const categoria = item.categoria || '';
  const foto = item.foto || '';
  const valor = item.valor_unitario ?? '';
  return {
    id: item.id,
    codigo: item.codigo || '',
    nome,
    name: nome,
    marca: item.marca || '',
    descricao,
    subtitle: descricao,
    categoria,
    category: categoria,
    volume_peso: Number.isFinite(Number(item.volume_peso)) ? Number(item.volume_peso) : 0,
    medida: normalizeMedida(item.medida) || 'UN',
    tipo: item.tipo === 'combo' ? 'combo' : 'simples',
    estoque_atual: Number.isFinite(Number(item.estoque_atual)) ? Number(item.estoque_atual) : 0,
    estoque_sugerido: Number.isFinite(Number(item.estoque_sugerido)) ? Number(item.estoque_sugerido) : 0,
    valor_unitario: valor,
    cost: valor,
    foto,
    image: foto,
    stock: item.stock || '',
    minStock: item.minStock || '',
    status: item.status || 'stable',
    statusLabel: item.statusLabel || 'Estável',
    created_at: item.created_at || null,
    updated_at: item.updated_at || null,
    created_by: item.created_by || null,
    updated_by: item.updated_by || null,
  };
}

export async function peekNextProductCode() {
  const current = await getInventory();
  return nextProductCode(current.items || []);
}

export async function addInventoryCategory(name) {
  await ensureDashboardSeed();
  const raw = (await readDocument(DOCS.inventory)) || inventoryFallback;
  const current = normalizeInventory(raw);
  const label = String(name || '').trim().replace(/\s+/g, ' ');
  if (!label) throw new Error('Informe o nome da categoria.');
  if (label.toLowerCase() === 'todos') throw new Error('Use outro nome para a categoria.');
  const filters = current.filters?.length ? [...current.filters] : [...inventoryFallback.filters];
  if (filters.some((item) => item.toLowerCase() === label.toLowerCase())) {
    throw new Error('Essa categoria já existe.');
  }
  const next = {
    ...raw,
    filters: [...filters, label],
    items: Array.isArray(raw.items) ? raw.items : [],
  };
  await writeDocument(DOCS.inventory, next);
  return { name: label, inventory: normalizeInventory(next) };
}

export async function createInventoryItem(payload) {
  const current = await getInventory();
  const nome = String(payload.nome || payload.name || '').trim();
  if (!nome) throw new Error('Informe o nome do produto.');

  const estoqueAtual = Number(payload.estoque_atual ?? payload.qty);
  const estoqueSugerido = Number(payload.estoque_sugerido ?? payload.minQty);
  if (!Number.isFinite(estoqueAtual) || estoqueAtual < 0) throw new Error('Estoque atual inválido.');
  if (!Number.isFinite(estoqueSugerido) || estoqueSugerido < 0) {
    throw new Error('Estoque sugerido inválido.');
  }

  const categoria = String(payload.categoria || payload.category || 'Insumos').trim() || 'Insumos';
  const medida = assertMedida(payload.medida);
  const volumePeso = assertVolumePeso(payload.volume_peso);
  const now = new Date().toISOString();
  const actor = await actorId();
  const stored = (current.items || []).map((item) => persistProduct(presentProduct(item, item.codigo)));
  let max = maxProductCode(stored);
  const coded = stored.map((item) => {
    if (item.codigo) return item;
    max += 1;
    return { ...item, codigo: formatProductCode(max) };
  });
  const codigo = formatProductCode(max + 1);
  const draft = presentProduct(
    {
      id: `inv-${Date.now()}`,
      codigo,
      nome,
      marca: payload.marca,
      descricao: payload.descricao,
      categoria,
      volume_peso: volumePeso,
      medida,
      estoque_atual: estoqueAtual,
      estoque_sugerido: estoqueSugerido,
      valor_unitario: payload.valor_unitario ?? payload.cost,
      foto: payload.foto || payload.image || '',
      stock: formatStockLabel(estoqueAtual, 'un'),
      minStock: formatStockLabel(estoqueSugerido, 'un'),
      created_at: now,
      updated_at: now,
      created_by: actor,
      updated_by: actor,
    },
    codigo
  );

  const filters = current.filters?.includes(categoria)
    ? current.filters
    : [...(current.filters || ['Todos']), categoria];
  const next = await saveInventory({ ...current, filters }, [...coded, persistProduct(draft)]);
  return { item: presentProduct(draft, codigo), inventory: next };
}

export async function updateInventoryItem(itemId, payload) {
  const current = await getInventory();
  const items = (current.items || []).map((item) => persistProduct(presentProduct(item, item.codigo)));
  const index = items.findIndex((item) => String(item.id) === String(itemId));
  if (index < 0) throw new Error('Item não encontrado.');

  const currentItem = items[index];
  const nome = String(payload.nome || payload.name || currentItem.nome).trim();
  if (!nome) throw new Error('Informe o nome do produto.');
  const medida = assertMedida(payload.medida);
  const volumePeso = assertVolumePeso(payload.volume_peso);
  const estoqueAtual = Number(payload.estoque_atual ?? payload.qty ?? currentItem.estoque_atual);
  const estoqueSugerido = Number(
    payload.estoque_sugerido ?? payload.minQty ?? currentItem.estoque_sugerido
  );
  if (!Number.isFinite(estoqueAtual) || estoqueAtual < 0) throw new Error('Estoque atual inválido.');
  if (!Number.isFinite(estoqueSugerido) || estoqueSugerido < 0) {
    throw new Error('Estoque sugerido inválido.');
  }

  const now = new Date().toISOString();
  const actor = await actorId();
  const draft = presentProduct(
    {
      ...currentItem,
      nome,
      marca: payload.marca ?? currentItem.marca,
      descricao: payload.descricao ?? currentItem.descricao,
      categoria: payload.categoria || payload.category || currentItem.categoria,
      volume_peso: volumePeso,
      medida,
      estoque_atual: estoqueAtual,
      estoque_sugerido: estoqueSugerido,
      valor_unitario: payload.valor_unitario ?? payload.cost ?? currentItem.valor_unitario,
      foto: payload.foto || payload.image || currentItem.foto,
      stock: formatStockLabel(estoqueAtual, parseStockLabel(currentItem.stock).unit || 'un'),
      minStock: formatStockLabel(estoqueSugerido, parseStockLabel(currentItem.minStock).unit || 'un'),
      codigo: currentItem.codigo,
      created_at: currentItem.created_at || now,
      created_by: currentItem.created_by || actor,
      updated_at: now,
      updated_by: actor,
    },
    currentItem.codigo
  );
  items[index] = persistProduct(draft);
  const next = await saveInventory(current, items);
  return { item: draft, inventory: next };
}

export async function registerStockEntry(payload) {
  const current = await getInventory();
  const items = [...(current.items || [])];
  const index = items.findIndex((item) => String(item.id) === String(payload.itemId));
  if (index < 0) {
    throw new Error('Item não encontrado.');
  }

  const item = items[index];
  const parsed = parseStockLabel(item.stock);
  const minParsed = parseStockLabel(item.minStock);
  const addQty = Number(payload.quantity);
  if (!Number.isFinite(addQty) || addQty <= 0) {
    throw new Error('Quantidade inválida.');
  }
  const formaPagamento = assertPaymentMethod(payload.forma_pagamento);

  const linkCash = payload.linkCash !== false;
  let amountCents = 0;
  let supplierName = String(payload.supplier || '').trim();

  if (linkCash) {
    amountCents = payload.amount ?? parseMoneyToCents(payload.value);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      throw new Error('Informe o valor da compra.');
    }
    if (!supplierName) {
      throw new Error('Informe o fornecedor.');
    }
  }

  const nextQty = parsed.qty + addQty;
  const unit = parsed.unit || minParsed.unit || 'un';
  const status = nextQty < minParsed.qty ? 'low' : 'stable';

  items[index] = {
    ...item,
    stock: formatStockLabel(nextQty, unit),
    estoque_atual: nextQty,
    status,
    statusLabel: status === 'low' ? 'Estoque Baixo' : 'Estável',
  };

  const entry = {
    id: `buy-${Date.now()}`,
    itemId: String(item.id),
    quantity: addQty,
    forma_pagamento: formaPagamento,
    date: payload.date || new Date().toISOString().slice(0, 10),
    created_at: new Date().toISOString(),
  };

  await saveInventory(
    { ...current, entries: [entry, ...(current.entries || [])] },
    items
  );

  if (linkCash) {
    await createExpense({
      date: payload.date || new Date().toISOString().slice(0, 10),
      supplier: supplierName,
      supplierId: payload.supplierId || null,
      categoryId: stockCategoryToExpense(item.category),
      nature: 'variable',
      amount: amountCents,
      source: 'stock_entry',
    });
  }

  return items[index];
}

export async function registerPurchase(payload) {
  await ensureDashboardSeed();
  const date = String(payload.date || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Informe a data.');
  const linhas = Array.isArray(payload.itens) ? payload.itens : [];
  if (!linhas.length) throw new Error('Adicione ao menos um produto.');

  return commitOps((ops) => {
    const inventory = normalizeInventory(ops.inventory);
    const cash = migrateCashFlow(ops.cashFlow || cashFlowFallback);
    const suppliersWrap =
      ops.suppliers && Array.isArray(ops.suppliers.suppliers) ? ops.suppliers : { suppliers: [] };
    const supplier = (suppliersWrap.suppliers || []).find(
      (item) => String(item.id) === String(payload.supplierId)
    );
    if (!supplier) throw new Error('Selecione o fornecedor.');
    const categories = cash.categories?.length ? cash.categories : expenseCategories;
    const category = categories.find((item) => item.id === payload.categoryId);
    if (!category) throw new Error('Selecione a categoria.');

    const grouped = new Map();
    linhas.forEach((linha) => {
      const produtoId = String(linha.produto_id || '').trim();
      const quantidade = Number(linha.quantidade);
      if (!produtoId) throw new Error('Selecione o produto.');
      if (!Number.isInteger(quantidade) || quantidade <= 0) throw new Error('Quantidade inválida.');
      const produto = (inventory.items || []).find(
        (item) => String(item.id) === produtoId && item.tipo !== 'combo'
      );
      if (!produto) throw new Error('Produto não encontrado.');
      const prev = grouped.get(produtoId);
      if (prev) prev.quantidade += quantidade;
      else {
        grouped.set(produtoId, {
          produto_id: produtoId,
          nome: produto.nome || produto.name,
          quantidade,
          valor_unitario: parseMoneyToCents(produto.valor_unitario || produto.cost || 0) / 100,
        });
      }
    });
    const itens = [...grouped.values()].map((linha) => ({
      ...linha,
      valor_total: Math.round(linha.valor_unitario * linha.quantidade * 100) / 100,
    }));
    const calculado = Math.round(itens.reduce((sum, linha) => sum + linha.valor_total, 0) * 100) / 100;
    const total =
      payload.valor_total == null || payload.valor_total === ''
        ? calculado
        : assertPrice(payload.valor_total);
    if (!Number.isFinite(total) || total <= 0) throw new Error('Informe o valor total.');

    let items = [...(inventory.items || [])];
    itens.forEach((linha) => {
      const item = items.find((row) => String(row.id) === linha.produto_id);
      if (!item) throw new Error('Produto não encontrado.');
      items = replaceItem(items, linha.produto_id, applyStockDelta(item, linha.quantidade));
    });
    const stored = items.map((item) => persistProduct(presentProduct(item, item.codigo)));

    const now = new Date().toISOString();
    const purchaseId = `purchase-${Date.now()}`;
    const expenseId = `exp-${purchaseId}`;
    const purchase = {
      id: purchaseId,
      date,
      supplierId: supplier.id,
      supplierName: supplier.name,
      categoryId: category.id,
      categoryName: category.name,
      total,
      itens,
      expenseId,
      created_at: now,
    };
    const entries = itens.map((linha, index) => ({
      id: `buy-${purchaseId}-${index}`,
      itemId: linha.produto_id,
      quantity: linha.quantidade,
      purchaseId,
      date,
      created_at: now,
    }));
    const amountCents = Math.round(total * 100);
    const expense = {
      id: expenseId,
      date: formatExpenseDate(date),
      supplier: supplier.name,
      supplierId: supplier.id,
      category: category.name,
      categoryId: category.id,
      categoryIcon: category.icon,
      nature: category.defaultNature || 'variable',
      value: formatCents(amountCents),
      amount: amountCents,
      source: 'purchase',
      importKey: null,
      createdAt: now,
    };
    const expenses = [expense, ...(cash.expenses || [])];
    const summary = buildCashFlowSummary(cash.incomes || [], expenses, {
      revenueDelta: cash.summary?.revenueDelta,
      expensesDelta: cash.summary?.expensesDelta,
    });
    const displayDate = expense.date;
    const suppliers = (suppliersWrap.suppliers || []).map((item) => {
      if (String(item.id) !== String(supplier.id)) return item;
      return {
        ...item,
        lastPurchase: displayDate,
        lastValue: expense.value,
        lastAmount: amountCents,
        history: [
          {
            id: expenseId,
            date: displayDate,
            category: category.name,
            value: expense.value,
            amount: amountCents,
            purchaseId,
          },
          ...(item.history || []),
        ],
      };
    });

    return {
      ops: {
        ...ops,
        inventory: {
          ...inventory,
          items: stored,
          entries: [...entries, ...(inventory.entries || [])],
          purchases: [purchase, ...(inventory.purchases || [])],
          metrics: recomputeInventoryMetrics(stored),
        },
        cashFlow: {
          ...cash,
          expenses,
          summary: { ...cash.summary, ...summary },
        },
        suppliers: { ...suppliersWrap, suppliers },
      },
      value: purchase,
    };
  });
}

export async function cancelPurchase(purchaseId) {
  await ensureDashboardSeed();
  const id = String(purchaseId || '').trim();
  if (!id) throw new Error('Compra não encontrada.');

  return commitOps((ops) => {
    const inventory = normalizeInventory(ops.inventory);
    const purchase = (inventory.purchases || []).find((row) => String(row.id) === id);
    if (!purchase) throw new Error('Compra não encontrada.');
    if (purchase.status === 'cancelada') throw new Error('Esta compra já foi cancelada.');

    const cash = migrateCashFlow(ops.cashFlow || cashFlowFallback);
    const suppliersWrap =
      ops.suppliers && Array.isArray(ops.suppliers.suppliers) ? ops.suppliers : { suppliers: [] };
    let items = [...(inventory.items || [])];

    (purchase.itens || []).forEach((linha) => {
      const item = items.find((row) => String(row.id) === String(linha.produto_id));
      if (!item) throw new Error('Produto não encontrado.');
      const parsed = parseStockLabel(item.stock);
      const quantidade = Number(linha.quantidade);
      if (parsed.qty - quantidade < 0) {
        throw new Error(`Produto já consumido: ${linha.nome || item.nome || item.name}.`);
      }
    });

    (purchase.itens || []).forEach((linha) => {
      const item = items.find((row) => String(row.id) === String(linha.produto_id));
      items = replaceItem(items, linha.produto_id, applyStockDelta(item, -Number(linha.quantidade)));
    });
    const stored = items.map((item) => persistProduct(presentProduct(item, item.codigo)));

    const now = new Date().toISOString();
    const purchases = inventory.purchases.map((row) =>
      String(row.id) === id
        ? {
            ...row,
            status: 'cancelada',
            cancelled_at: now,
          }
        : row
    );
    const expenses = (cash.expenses || []).filter((row) => String(row.id) !== String(purchase.expenseId));
    const summary = buildCashFlowSummary(cash.incomes || [], expenses, {
      revenueDelta: cash.summary?.revenueDelta,
      expensesDelta: cash.summary?.expensesDelta,
    });
    const suppliers = (suppliersWrap.suppliers || []).map((item) => {
      if (String(item.id) !== String(purchase.supplierId)) return item;
      const history = (item.history || []).filter(
        (row) =>
          String(row.purchaseId) !== id && String(row.id) !== String(purchase.expenseId)
      );
      const latest = history[0];
      return {
        ...item,
        history,
        lastPurchase: latest?.date || '',
        lastValue: latest?.value || '',
        lastAmount: latest?.amount || 0,
      };
    });

    return {
      ops: {
        ...ops,
        inventory: {
          ...inventory,
          items: stored,
          entries: (inventory.entries || []).filter((row) => String(row.purchaseId) !== id),
          purchases,
          metrics: recomputeInventoryMetrics(stored),
        },
        cashFlow: {
          ...cash,
          expenses,
          summary: { ...cash.summary, ...summary },
        },
        suppliers: { ...suppliersWrap, suppliers },
      },
      value: purchases.find((row) => String(row.id) === id),
    };
  });
}

export async function createProduction(payload) {
  const current = await getInventory();
  const produtoId = String(payload.produto_id || '').trim();
  const quantidade = Number(payload.quantidade);
  if (!produtoId) throw new Error('Selecione o produto.');
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    throw new Error('Quantidade inválida.');
  }

  const usuarioId = await actorId();
  if (!usuarioId) throw new Error('Sessão inválida.');

  const items = [...(current.items || [])];
  const index = items.findIndex((item) => String(item.id) === produtoId);
  if (index < 0) throw new Error('Item não encontrado.');

  const item = items[index];
  const parsed = parseStockLabel(item.stock);
  const minParsed = parseStockLabel(item.minStock);
  const nextQty = parsed.qty + quantidade;
  const unit = parsed.unit || minParsed.unit || 'un';
  const status = nextQty < minParsed.qty ? 'low' : 'stable';

  items[index] = {
    ...item,
    estoque_atual: nextQty,
    stock: formatStockLabel(nextQty, unit),
    status,
    statusLabel: status === 'low' ? 'Estoque Baixo' : 'Estável',
  };

  const production = {
    id: `prod-${Date.now()}`,
    produto_id: produtoId,
    quantidade,
    data_producao: new Date().toISOString(),
    usuario_id: usuarioId,
  };

  const next = await saveInventory(
    { ...current, productions: [production, ...(current.productions || [])] },
    items
  );
  return { production, inventory: next };
}

function replaceItem(items, produtoId, nextItem) {
  const index = items.findIndex((item) => String(item.id) === String(produtoId));
  if (index < 0) throw new Error('Item não encontrado.');
  const copy = [...items];
  copy[index] = nextItem;
  return copy;
}

export async function updateProduction(productionId, payload) {
  const current = await getInventory();
  const existing = (current.productions || []).find((row) => String(row.id) === String(productionId));
  if (!existing) throw new Error('Produção não encontrada.');
  const produtoId = String(payload.produto_id || '').trim();
  const quantidade = Number(payload.quantidade);
  if (!produtoId) throw new Error('Selecione o produto.');
  if (!Number.isInteger(quantidade) || quantidade <= 0) throw new Error('Quantidade inválida.');

  let items = [...(current.items || [])];
  if (produtoId === String(existing.produto_id)) {
    const item = items.find((row) => String(row.id) === produtoId);
    if (!item) throw new Error('Item não encontrado.');
    items = replaceItem(items, produtoId, applyStockDelta(item, quantidade - Number(existing.quantidade)));
  } else {
    const previous = items.find((row) => String(row.id) === String(existing.produto_id));
    if (!previous) throw new Error('Item não encontrado.');
    items = replaceItem(items, existing.produto_id, applyStockDelta(previous, -Number(existing.quantidade)));
    const nextItem = items.find((row) => String(row.id) === produtoId);
    if (!nextItem) throw new Error('Item não encontrado.');
    items = replaceItem(items, produtoId, applyStockDelta(nextItem, quantidade));
  }

  const production = {
    ...existing,
    produto_id: produtoId,
    quantidade,
  };
  const productions = current.productions.map((row) => (row.id === existing.id ? production : row));
  const next = await saveInventory({ ...current, productions }, items);
  return { production, inventory: next };
}

export async function deleteProduction(productionId) {
  const current = await getInventory();
  const existing = (current.productions || []).find((row) => String(row.id) === String(productionId));
  if (!existing) throw new Error('Produção não encontrada.');
  const item = (current.items || []).find((row) => String(row.id) === String(existing.produto_id));
  if (!item) throw new Error('Item não encontrado.');
  const items = replaceItem(
    current.items || [],
    existing.produto_id,
    applyStockDelta(item, -Number(existing.quantidade))
  );
  const productions = current.productions.filter((row) => row.id !== existing.id);
  const next = await saveInventory({ ...current, productions }, items);
  return next;
}

export async function createPromotion(payload) {
  const current = await getInventory();
  const produtoId = String(payload.produto_id || '').trim();
  const produto = (current.items || []).find((item) => String(item.id) === produtoId);
  if (!produto) throw new Error('Produto não encontrado. Cadastre em Estoque.');

  const preco = assertPrice(payload.preco_promocional);
  const janela = assertPromotionWindow(payload.data_inicio, payload.data_termino);
  const promotion = {
    id: `promo-${Date.now()}`,
    produto_id: produtoId,
    preco_promocional: preco,
    data_inicio: janela.data_inicio,
    data_termino: janela.data_termino,
  };
  const stored = (current.items || []).map((item) => persistProduct(presentProduct(item, item.codigo)));
  const next = await saveInventory(
    { ...current, promotions: [promotion, ...(current.promotions || [])] },
    stored
  );
  return { promotion, inventory: next };
}

export async function updatePromotion(promotionId, payload) {
  const current = await getInventory();
  const existing = (current.promotions || []).find((row) => String(row.id) === String(promotionId));
  if (!existing) throw new Error('Promoção não encontrada.');
  const produtoId = String(payload.produto_id || '').trim();
  const produto = (current.items || []).find((item) => String(item.id) === produtoId);
  if (!produto) throw new Error('Produto não encontrado. Cadastre em Estoque.');
  const preco = assertPrice(payload.preco_promocional);
  const janela = assertPromotionWindow(payload.data_inicio, payload.data_termino);
  const promotion = {
    id: existing.id,
    produto_id: produtoId,
    preco_promocional: preco,
    data_inicio: janela.data_inicio,
    data_termino: janela.data_termino,
  };
  const promotions = current.promotions.map((row) => (row.id === existing.id ? promotion : row));
  const stored = (current.items || []).map((item) => persistProduct(presentProduct(item, item.codigo)));
  const next = await saveInventory({ ...current, promotions }, stored);
  return { promotion, inventory: next };
}

export async function deletePromotion(promotionId) {
  const current = await getInventory();
  const existing = (current.promotions || []).find((row) => String(row.id) === String(promotionId));
  if (!existing) throw new Error('Promoção não encontrada.');
  const promotions = current.promotions.filter((row) => row.id !== existing.id);
  const stored = (current.items || []).map((item) => persistProduct(presentProduct(item, item.codigo)));
  return saveInventory({ ...current, promotions }, stored);
}

export async function createCombo(payload) {
  const current = await getInventory();
  const nome = String(payload.nome || '').trim();
  if (!nome) throw new Error('Informe o nome do combo.');
  const preco = assertPrice(payload.valor ?? payload.valor_unitario);
  const linhas = Array.isArray(payload.itens) ? payload.itens : [];
  if (!linhas.length) throw new Error('Adicione ao menos um produto ao combo.');

  const simples = (current.items || []).filter((item) => item.tipo !== 'combo');
  const seen = new Set();
  const linhasOk = linhas.map((linha) => {
    const produtoId = String(linha.produto_associado_id || '').trim();
    if (!simples.some((item) => String(item.id) === produtoId)) {
      throw new Error('Produto não encontrado. Cadastre em Estoque.');
    }
    if (seen.has(produtoId)) throw new Error('Produto repetido no combo.');
    seen.add(produtoId);
    const quantidade = Number(linha.quantidade);
    if (!Number.isInteger(quantidade) || quantidade <= 0) throw new Error('Quantidade inválida.');
    if (typeof linha.deduz_estoque_integral !== 'boolean') {
      throw new Error('Informe se o item deduz o estoque integral.');
    }
    return {
      produto_associado_id: produtoId,
      quantidade,
      deduz_estoque_integral: linha.deduz_estoque_integral,
    };
  });

  const now = new Date().toISOString();
  const actor = await actorId();
  const stored = (current.items || []).map((item) => persistProduct(presentProduct(item, item.codigo)));
  let max = maxProductCode(stored);
  const coded = stored.map((item) => {
    if (item.codigo) return item;
    max += 1;
    return { ...item, codigo: formatProductCode(max) };
  });
  const codigo = formatProductCode(max + 1);
  const comboId = `combo-${Date.now()}`;
  const primeiro = simples.find((item) => String(item.id) === linhasOk[0].produto_associado_id);
  const draft = presentProduct(
    {
      id: comboId,
      codigo,
      nome,
      marca: '',
      descricao: '',
      categoria: 'Combos',
      volume_peso: 1,
      medida: 'UN',
      tipo: 'combo',
      estoque_atual: 0,
      estoque_sugerido: 0,
      valor_unitario: preco,
      foto: primeiro?.foto || primeiro?.image || '',
      stock: formatStockLabel(0, 'un'),
      minStock: formatStockLabel(0, 'un'),
      created_at: now,
      updated_at: now,
      created_by: actor,
      updated_by: actor,
    },
    codigo
  );
  const rows = linhasOk.map((linha, index) => ({
    id: `combo-item-${comboId}-${index}`,
    combo_id: comboId,
    produto_associado_id: linha.produto_associado_id,
    quantidade: linha.quantidade,
    deduz_estoque_integral: linha.deduz_estoque_integral,
  }));
  const filters = current.filters?.includes('Combos')
    ? current.filters
    : [...(current.filters || ['Todos']), 'Combos'];
  const next = await saveInventory(
    { ...current, filters, comboItems: [...rows, ...(current.comboItems || [])] },
    [...coded, persistProduct(draft)]
  );
  return { item: presentProduct(draft, codigo), inventory: next };
}

function comboLines(current, linhas, comboId) {
  const pool = (current.items || []).filter((item) => item.tipo !== 'combo');
  const seen = new Set();
  return linhas.map((linha, index) => {
    const produtoId = String(linha.produto_associado_id || '').trim();
    if (!pool.some((item) => String(item.id) === produtoId)) {
      throw new Error('Produto não encontrado. Cadastre em Estoque.');
    }
    if (seen.has(produtoId)) throw new Error('Produto repetido no combo.');
    seen.add(produtoId);
    const quantidade = Number(linha.quantidade);
    if (!Number.isInteger(quantidade) || quantidade <= 0) throw new Error('Quantidade inválida.');
    if (typeof linha.deduz_estoque_integral !== 'boolean') {
      throw new Error('Informe se o item deduz o estoque integral.');
    }
    return {
      id: `combo-item-${comboId}-${index}`,
      combo_id: comboId,
      produto_associado_id: produtoId,
      quantidade,
      deduz_estoque_integral: linha.deduz_estoque_integral,
    };
  });
}

export async function updateCombo(comboId, payload) {
  const current = await getInventory();
  const existing = (current.items || []).find((item) => String(item.id) === String(comboId));
  if (!existing || existing.tipo !== 'combo') throw new Error('Combo não encontrado.');
  const nome = String(payload.nome || '').trim();
  if (!nome) throw new Error('Informe o nome do combo.');
  const preco = assertPrice(payload.valor ?? payload.valor_unitario);
  const linhas = Array.isArray(payload.itens) ? payload.itens : [];
  if (!linhas.length) throw new Error('Adicione ao menos um produto ao combo.');
  const rows = comboLines(current, linhas, existing.id);
  const actor = await actorId();
  const draft = presentProduct(
    {
      ...existing,
      nome,
      name: nome,
      valor_unitario: preco,
      cost: preco,
      updated_at: new Date().toISOString(),
      updated_by: actor,
    },
    existing.codigo
  );
  const items = (current.items || []).map((item) =>
    String(item.id) === String(existing.id)
      ? persistProduct(draft)
      : persistProduct(presentProduct(item, item.codigo))
  );
  const comboItems = [
    ...rows,
    ...(current.comboItems || []).filter((row) => String(row.combo_id) !== String(existing.id)),
  ];
  const next = await saveInventory({ ...current, comboItems }, items);
  return { item: presentProduct(draft, existing.codigo), inventory: next };
}

export async function deleteCombo(comboId) {
  const current = await getInventory();
  const existing = (current.items || []).find((item) => String(item.id) === String(comboId));
  if (!existing || existing.tipo !== 'combo') throw new Error('Combo não encontrado.');
  const items = (current.items || [])
    .filter((item) => String(item.id) !== String(existing.id))
    .map((item) => persistProduct(presentProduct(item, item.codigo)));
  const comboItems = (current.comboItems || []).filter((row) => String(row.combo_id) !== String(existing.id));
  return saveInventory({ ...current, comboItems }, items);
}

function applyStockDelta(item, delta) {
  const parsed = parseStockLabel(item.stock);
  const minParsed = parseStockLabel(item.minStock);
  const nextQty = parsed.qty + delta;
  if (nextQty < 0) throw new Error(`Estoque insuficiente de ${item.nome || item.name}.`);
  const unit = parsed.unit || minParsed.unit || 'un';
  const status = nextQty < minParsed.qty ? 'low' : 'stable';
  return {
    ...item,
    estoque_atual: nextQty,
    stock: formatStockLabel(nextQty, unit),
    status,
    statusLabel: status === 'low' ? 'Estoque Baixo' : 'Estável',
  };
}

export async function getCustomers() {
  await ensureDashboardSeed();
  const raw = (await readDocument(DOCS.customers)) || {};
  return { customers: Array.isArray(raw.customers) ? raw.customers : [] };
}

export async function createCustomer(payload) {
  const current = await getCustomers();
  const nome = String(payload.nome || '').trim();
  if (!nome) throw new Error('Informe o nome.');
  if (!isValidPhone(payload.contato)) throw new Error('Contato inválido.');
  const customer = {
    id: `cli-${Date.now()}`,
    nome,
    contato: maskPhone(payload.contato),
    created_at: new Date().toISOString(),
  };
  await writeDocument(DOCS.customers, { customers: [customer, ...current.customers] });
  return customer;
}

function resolveSaleLines(inventory, linhas, now) {
  if (!Array.isArray(linhas) || !linhas.length) throw new Error('O carrinho está vazio.');
  return linhas.map((linha) => {
    const produto = (inventory.items || []).find((item) => String(item.id) === String(linha.produto_id));
    if (!produto) throw new Error('Produto não encontrado.');
    const quantidade = Number(linha.quantidade);
    if (!Number.isInteger(quantidade) || quantidade <= 0) throw new Error('Quantidade inválida.');
    const valorUnitario = saleUnitPrice(produto, inventory.promotions, now);
    const valorTotal = Math.round(valorUnitario * quantidade * 100) / 100;
    return { produto, quantidade, valor_unitario: valorUnitario, valor_total: valorTotal };
  });
}

function saleItems(resolved) {
  return resolved.map((line) => ({
    produto_id: line.produto.id,
    nome: line.produto.nome || line.produto.name,
    quantidade: line.quantidade,
    valor_unitario: line.valor_unitario,
    valor_total: line.valor_total,
  }));
}

function customerFromOps(ops, clienteId) {
  if (!clienteId) return { id: null, nome: 'Consumidor' };
  const found = (ops.customers?.customers || []).find((item) => String(item.id) === String(clienteId));
  if (!found) throw new Error('Cliente não encontrado.');
  return { id: found.id, nome: found.nome };
}

function deductSaleStock(inventory, resolved) {
  let items = [...(inventory.items || [])];
  function take(produtoId, qty) {
    const index = items.findIndex((item) => String(item.id) === String(produtoId));
    if (index < 0) throw new Error('Produto do combo não encontrado.');
    items[index] = applyStockDelta(items[index], -qty);
  }
  resolved.forEach((line) => {
    if (line.produto.tipo === 'combo') {
      (inventory.comboItems || [])
        .filter(
          (row) =>
            String(row.combo_id) === String(line.produto.id) && row.deduz_estoque_integral === true
        )
        .forEach((row) => take(row.produto_associado_id, row.quantidade * line.quantidade));
      return;
    }
    take(line.produto.id, line.quantidade);
  });
  return items.map((item) => persistProduct(presentProduct(item, item.codigo)));
}

function assertOpenComandaFree(sales, numero, saleId) {
  const clash = (sales || []).find(
    (sale) =>
      sale.status === 'aberta' &&
      sale.numero_comanda === numero &&
      String(sale.id) !== String(saleId || '')
  );
  if (clash) throw new Error('Essa comanda já está aberta.');
}

export async function saveOpenSale(payload) {
  const numero = assertComanda(payload.numero_comanda);
  const usuarioId = await actorId();
  await ensureDashboardSeed();
  const now = await readServerNow();
  return commitOps((ops) => {
    const inventory = normalizeInventory(ops.inventory);
    const resolved = resolveSaleLines(inventory, payload.itens, now);
    const total = Math.round(resolved.reduce((sum, line) => sum + line.valor_total, 0) * 100) / 100;
    const cliente = customerFromOps(ops, payload.cliente_id);
    assertOpenComandaFree(inventory.sales, numero, payload.sale_id);
    const existing = payload.sale_id
      ? (inventory.sales || []).find((sale) => String(sale.id) === String(payload.sale_id))
      : null;
    if (payload.sale_id && (!existing || existing.status !== 'aberta')) {
      throw new Error('Comanda não encontrada.');
    }
    const sale = normalizeSale({
      id: existing?.id || `sale-${Date.now()}`,
      numero_comanda: numero,
      status: 'aberta',
      cliente_id: cliente.id,
      cliente_nome: cliente.nome,
      forma_pagamento: null,
      total,
      itens: saleItems(resolved),
      created_at: existing?.created_at || now.toISOString(),
      updated_at: now.toISOString(),
      usuario_id: existing?.usuario_id || usuarioId,
    });
    const sales = existing
      ? inventory.sales.map((item) => (item.id === sale.id ? sale : item))
      : [sale, ...(inventory.sales || [])];
    return {
      ops: { ...ops, inventory: { ...inventory, sales } },
      value: sale,
    };
  });
}

export async function registerSale(payload) {
  const forma = assertPaymentMethod(payload.forma_pagamento);
  const numero = optionalComanda(payload.numero_comanda);
  const usuarioId = await actorId();
  await ensureDashboardSeed();
  const now = await readServerNow();
  return commitOps((ops) => {
    const inventory = normalizeInventory(ops.inventory);
    const resolved = resolveSaleLines(inventory, payload.itens, now);
    const total = Math.round(resolved.reduce((sum, line) => sum + line.valor_total, 0) * 100) / 100;
    let valorRecebido = null;
    let troco = null;
    let parcelas = null;
    if (forma === 'dinheiro') {
      valorRecebido = assertPrice(payload.valor_recebido);
      if (valorRecebido < total) throw new Error('Valor recebido menor que o total.');
      troco = Math.round((valorRecebido - total) * 100) / 100;
    }
    if (forma === 'cartao_credito') parcelas = assertInstallments(payload.parcelas);
    const cliente = customerFromOps(ops, payload.cliente_id);
    if (numero != null) assertOpenComandaFree(inventory.sales, numero, payload.sale_id);
    const existing = payload.sale_id
      ? (inventory.sales || []).find((sale) => String(sale.id) === String(payload.sale_id))
      : null;
    if (payload.sale_id && (!existing || existing.status !== 'aberta')) {
      throw new Error('Comanda não encontrada.');
    }
    const stored = deductSaleStock(inventory, resolved);
    const sale = normalizeSale({
      id: existing?.id || `sale-${Date.now()}`,
      numero_comanda: numero,
      status: 'paga',
      cliente_id: cliente.id,
      cliente_nome: cliente.nome,
      forma_pagamento: forma,
      valor_recebido: valorRecebido,
      troco,
      parcelas,
      total,
      itens: saleItems(resolved),
      created_at: existing?.created_at || now.toISOString(),
      updated_at: now.toISOString(),
      usuario_id: usuarioId,
    });
    const sales = existing
      ? inventory.sales.map((item) => (item.id === sale.id ? sale : item))
      : [sale, ...(inventory.sales || [])];
    const cash = ops.cashFlow || cashFlowFallback;
    const amountCents = Math.round(total * 100);
    const income = {
      id: `inc-${sale.id}`,
      date: formatExpenseDate(format(now, 'yyyy-MM-dd')),
      description: numero != null ? `PDV · comanda ${numero} · ${cliente.nome}` : `PDV · ${cliente.nome}`,
      category: 'Varejo',
      categoryIcon: 'payments',
      categoryTone: 'secondary',
      value: formatCents(amountCents),
      amount: amountCents,
      source: 'pdv',
      importKey: null,
      createdAt: now.toISOString(),
    };
    const incomes = [income, ...(cash.incomes || [])];
    const summary = buildCashFlowSummary(incomes, cash.expenses || [], {
      revenueDelta: cash.summary?.revenueDelta,
      expensesDelta: cash.summary?.expensesDelta,
    });
    return {
      ops: {
        ...ops,
        inventory: {
          ...inventory,
          items: stored,
          sales,
          metrics: recomputeInventoryMetrics(stored),
        },
        cashFlow: {
          ...cash,
          incomes,
          summary: { ...cash.summary, ...summary },
        },
      },
      value: sale,
    };
  });
}

export async function closeShift() {
  const usuarioId = await actorId();
  await ensureDashboardSeed();
  return commitOps((ops) => {
    const inventory = normalizeInventory(ops.inventory);
    const now = new Date();
    if (shiftAlreadyClosed(inventory.closings, now)) {
      throw new Error('O turno de hoje já foi consolidado.');
    }
    const paid = paidSalesOnDay(inventory.sales, now);
    if (!paid.length) throw new Error('Não há vendas pagas hoje.');
    const totais = totalsByPayment(paid);
    const closing = {
      id: `close-${Date.now()}`,
      closed_at: now.toISOString(),
      sale_ids: paid.map((sale) => sale.id),
      totais,
      usuario_id: usuarioId,
    };
    return {
      ops: {
        ...ops,
        inventory: { ...inventory, closings: [closing, ...(inventory.closings || [])] },
      },
      value: { closing, ...totais, count: paid.length },
    };
  });
}

export async function importStatementRows(rows) {
  const current = await getCashFlow();
  const existingKeys = new Set(
    [...(current.incomes || []), ...(current.expenses || [])].map(
      (row) =>
        row.importKey ||
        `${row.amount}|${String(row.description || row.supplier || '')
          .trim()
          .toLowerCase()}`
    )
  );

  let created = 0;
  let skipped = 0;
  let next = current;

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (!row?.selected) continue;
    const importKey = row.id || statementKey(row);
    if (existingKeys.has(importKey)) {
      skipped += 1;
      continue;
    }
    existingKeys.add(importKey);
    if (row.kind === 'entrada') {
      await createIncome({
        id: `inc-imp-${Date.now()}-${index}`,
        date: row.date,
        description: row.description,
        category: 'Extrato',
        amount: row.amountCents,
        source: 'statement_import',
        importKey,
      });
    } else {
      await createExpense({
        id: `exp-imp-${Date.now()}-${index}`,
        date: row.date,
        supplier: row.description,
        categoryId: 'suprimentos',
        nature: 'variable',
        amount: row.amountCents,
        source: 'statement_import',
        importKey,
      });
    }
    created += 1;
  }

  next = await getCashFlow();
  return { created, skipped, cashFlow: next };
}

function statementKey(row) {
  return `${row.date}|${row.amountCents}|${String(row.description || '').trim().toLowerCase()}`;
}

function stockCategoryToExpense(category) {
  if (category === 'Insumos') return 'suprimentos';
  if (['Cervejas', 'Destilados', 'Soft Drinks'].includes(category)) return 'bebidas';
  return 'suprimentos';
}

export async function deleteInventoryItem(itemId) {
  const current = await getInventory();
  const items = (current.items || []).filter((item) => String(item.id) !== String(itemId));
  const next = {
    ...current,
    items,
    metrics: recomputeInventoryMetrics(items),
  };
  await writeDocument(DOCS.inventory, next);
  return next;
}

export async function updateFreelancerStatus(freelancerId, status) {
  const current = await getFreelancers();
  const people = (current.people || []).map((person) => {
    if (String(person.id) !== String(freelancerId)) return person;
    return {
      ...person,
      status,
      statusLabel: STATUS_MAP[status] || STATUS_MAP.available,
    };
  });
  const next = { ...current, people };
  await writeDocument(DOCS.freelancers, next);
  return people.find((person) => String(person.id) === String(freelancerId));
}

export async function deleteFreelancer(freelancerId) {
  const current = await getFreelancers();
  const people = (current.people || []).filter(
    (person) => String(person.id) !== String(freelancerId)
  );
  const next = { ...current, people };
  await writeDocument(DOCS.freelancers, next);
  return next;
}

function dailyAmountCents(value, fallbackRate) {
  if (value != null && value !== '') return Math.round(Number(value) * 100);
  return parseMoneyToCents(fallbackRate);
}

function sameDaily(row, target) {
  if (!row || !target) return false;
  if (target.id && row.id) return String(row.id) === String(target.id);
  if (target.id || row.id) return false;
  return (
    String(row.freelancerId) === String(target.freelancerId) &&
    row.date === target.date &&
    row.createdAt === target.createdAt &&
    String(row.value) === String(target.value)
  );
}

export async function registerDaily(payload) {
  const current = await getFreelancers();
  const person = (current.people || []).find(
    (item) => String(item.id) === String(payload.freelancerId)
  );
  const amountCents = dailyAmountCents(payload.value, person?.dailyRate);
  const expense = await createExpense({
    date: payload.date,
    supplier: person?.name || `Freelancer #${payload.freelancerId}`,
    categoryId: 'freelancer',
    nature: 'variable',
    amount: amountCents,
    source: 'freelancer_daily',
  });
  const entry = {
    id: payload.id || `daily-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    freelancerId: payload.freelancerId,
    date: payload.date,
    role: payload.role,
    value: payload.value,
    status: payload.status || 'pending_payment',
    expenseId: expense.id,
    createdAt: new Date().toISOString(),
  };
  const next = {
    ...current,
    dailies: [...(current.dailies || []), entry],
  };
  await writeDocument(DOCS.freelancers, next);
  return next;
}

export async function updateDaily(target, payload) {
  const current = await getFreelancers();
  const existing = (current.dailies || []).find((row) => sameDaily(row, target));
  if (!existing) throw new Error('Diária não encontrada.');

  const person = (current.people || []).find(
    (item) => String(item.id) === String(payload.freelancerId)
  );
  const previousPerson = (current.people || []).find(
    (item) => String(item.id) === String(existing.freelancerId)
  );
  const amountCents = dailyAmountCents(payload.value, person?.dailyRate);
  const previousCents = dailyAmountCents(existing.value, previousPerson?.dailyRate);
  const cash = await getCashFlow();
  const expenses = [...(cash.expenses || [])];
  let matchIndex = expenses.findIndex(
    (row) => existing.expenseId && String(row.id) === String(existing.expenseId)
  );
  if (matchIndex < 0) {
    const previousName = previousPerson?.name || '';
    const previousDate = formatExpenseDate(existing.date);
    matchIndex = expenses.findIndex(
      (row) =>
        row.source === 'freelancer_daily' &&
        row.supplier === previousName &&
        row.date === previousDate &&
        row.amount === previousCents
    );
  }

  let expenseId = existing.expenseId;
  if (matchIndex >= 0) {
    const row = expenses[matchIndex];
    expenseId = row.id;
    expenses[matchIndex] = {
      ...row,
      date: formatExpenseDate(payload.date),
      supplier: person?.name || row.supplier,
      value: formatCents(amountCents),
      amount: amountCents,
      source: 'freelancer_daily',
      categoryId: row.categoryId || 'freelancer',
    };
    await saveCashFlow(cash, { expenses });
  } else {
    const expense = await createExpense({
      date: payload.date,
      supplier: person?.name || `Freelancer #${payload.freelancerId}`,
      categoryId: 'freelancer',
      nature: 'variable',
      amount: amountCents,
      source: 'freelancer_daily',
    });
    expenseId = expense.id;
  }

  const updated = {
    ...existing,
    id: existing.id || target?.id || `daily-${Date.now()}`,
    freelancerId: payload.freelancerId,
    date: payload.date,
    role: payload.role,
    value: payload.value,
    status: payload.status || existing.status || 'pending_payment',
    expenseId,
  };
  const next = {
    ...current,
    dailies: (current.dailies || []).map((row) => (sameDaily(row, existing) ? updated : row)),
  };
  await writeDocument(DOCS.freelancers, next);
  return updated;
}

export async function addFreelancer(payload) {
  const current = await getFreelancers();
  const nextId =
    (current.people || []).reduce((max, person) => Math.max(max, Number(person.id) || 0), 0) + 1;

  const status = payload.status || 'available';
  const person = {
    id: nextId,
    name: payload.name.trim(),
    role: payload.role.trim(),
    contact: String(payload.contact || '').trim(),
    status,
    statusLabel: STATUS_MAP[status] || STATUS_MAP.available,
    dailyRate: formatDailyRate(payload.dailyRate),
    image: payload.image?.trim() || DEFAULT_AVATAR,
  };

  const next = {
    ...current,
    people: [...(current.people || []), person],
  };
  await writeDocument(DOCS.freelancers, next);
  return person;
}

function formatDailyRate(value) {
  if (value == null || value === '') return 'R$ 0,00';
  const text = String(value).trim();
  if (text.startsWith('R$')) return text;
  const amount = Number(text);
  if (!Number.isFinite(amount)) return 'R$ 0,00';
  return `R$ ${amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export async function updateFreelancer(freelancerId, payload) {
  const current = await getFreelancers();
  const people = (current.people || []).map((person) => {
    if (String(person.id) !== String(freelancerId)) return person;
    const status = payload.status || person.status;
    return {
      ...person,
      name: payload.name.trim(),
      role: payload.role.trim(),
      contact: String(payload.contact || '').trim(),
      status,
      statusLabel: STATUS_MAP[status] || person.statusLabel,
      image: payload.image === undefined ? person.image : payload.image?.trim() || DEFAULT_AVATAR,
    };
  });
  const next = { ...current, people };
  await writeDocument(DOCS.freelancers, next);
  return people.find((person) => String(person.id) === String(freelancerId));
}

export async function addSupplier(payload) {
  const current = await getSuppliers();
  const nextId =
    (current.suppliers || []).reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;

  const supplier = {
    id: nextId,
    name: payload.name.trim(),
    contact: payload.contact.trim(),
    cnpj: payload.cnpj.trim(),
    lastPurchase: '',
    lastValue: '',
    lastAmount: 0,
    history: [],
  };

  const next = {
    ...current,
    suppliers: [...(current.suppliers || []), supplier],
  };
  await writeDocument(DOCS.suppliers, next);
  return supplier;
}

export async function updateSupplier(supplierId, payload) {
  const current = await getSuppliers();
  const name = String(payload.name || '').trim();
  const contact = String(payload.contact || '').trim();
  const cnpj = String(payload.cnpj || '').trim();
  if (!name || !contact || !cnpj) throw new Error('Informe nome, contato e CNPJ.');
  let found = false;
  const suppliers = (current.suppliers || []).map((item) => {
    if (String(item.id) !== String(supplierId)) return item;
    found = true;
    return { ...item, name, contact, cnpj };
  });
  if (!found) throw new Error('Fornecedor não encontrado.');
  await writeDocument(DOCS.suppliers, { ...current, suppliers });
  return suppliers.find((item) => String(item.id) === String(supplierId));
}

export async function recordSupplierPurchase({
  supplierId,
  date,
  category,
  value,
  amount,
  expenseId,
}) {
  const current = await getSuppliers();
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
  const next = { ...current, suppliers };
  await writeDocument(DOCS.suppliers, next);
  return next;
}

export async function deleteSupplier(supplierId) {
  const current = await getSuppliers();
  const suppliers = (current.suppliers || []).filter(
    (item) => String(item.id) !== String(supplierId)
  );
  const next = { ...current, suppliers };
  await writeDocument(DOCS.suppliers, next);
  return next;
}

export async function getStaff() {
  await ensureDashboardSeed();
  return (await readDocument(DOCS.staff)) || staffFallback;
}

export async function createStaffMember(payload) {
  const name = String(payload.name || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const password = String(payload.password || '');
  const role = payload.role === 'admin' ? 'admin' : 'stock';
  if (!name || !email || !password) {
    throw new Error('Informe nome, e-mail e senha.');
  }
  if (password.length < 6) {
    throw new Error('Senha mínima de 6 caracteres.');
  }
  if (await emailTaken(email)) {
    throw new Error('Já existe um usuário com este e-mail.');
  }

  const staff = await getStaff();
  if ((staff.members || []).some((item) => item.email === email)) {
    throw new Error('Já existe um usuário com este e-mail.');
  }

  const created = await createAuthUserRest({ email, password });
  const member = {
    uid: created.uid,
    email,
    name,
    title: String(payload.title || (role === 'stock' ? 'Estoquista' : 'Administrador')).trim(),
    role,
    createdAt: new Date().toISOString(),
  };
  const next = { members: [...(staff.members || []), member] };
  await writeDocument(DOCS.staff, next);
  await upsertUserProfile(member.uid, {
    ...member,
    roles: ['staff'],
    tenantId: TENANT_ID,
    barRole: role,
  });
  return { member, staff: { members: next.members } };
}

function stripStaffPassword(member) {
  const { password: _ignored, ...safe } = member;
  return safe;
}

export async function listStaff() {
  const staff = await getStaff();
  return (staff.members || []).map(stripStaffPassword);
}

export async function getUserProfile(uid) {
  const profile = await readDocument(`users/${uid}`);
  if (!profile) return profile;

  const next = { ...profile };
  let changed = false;
  if (next.name === 'Alex Rivera') {
    next.name = 'Fábio Santos';
    changed = true;
  }
  if (next.email === 'admin@speakeasy.local' || next.email === 'fabio@marquinhos.local') {
    next.email = 'fabiosilsantos71@gmail.com';
    changed = true;
  }
  return changed ? upsertUserProfile(uid, next) : profile;
}

export async function upsertUserProfile(uid, data) {
  const path = `users/${uid}`;
  const existing = (await readDocument(path)) || {};
  const { role, roles } = data;
  const barRole = data.barRole || role || existing.barRole || existing.role || 'admin';
  const inferredRoles =
    existing.roles ||
    roles ||
    (role === 'stock' || barRole === 'stock' ? ['staff'] : ['owner']);
  const next = pickUserFields({
    ...existing,
    ...data,
    uid,
    email: existing.email || data.email,
    name: data.name || existing.name || 'Usuário',
    barRole,
    roles: inferredRoles,
    tenantId: existing.tenantId || data.tenantId || TENANT_ID,
    createdAt: existing.createdAt || data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  await writeDocument(path, next);
  if (next.email) {
    await writeEmailLock(next.email, uid);
  }
  return next;
}

export async function updateUserProfile(uid, data) {
  const path = `users/${uid}`;
  const existing = await readDocument(path);
  if (!existing) {
    return upsertUserProfile(uid, data);
  }
  await patchDocument(path, { ...data, updatedAt: new Date().toISOString() });
  return getUserProfile(uid);
}
