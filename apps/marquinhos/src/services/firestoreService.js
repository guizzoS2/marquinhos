import { doc, getDoc, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { createAuthUserRest, randomStaffPassword, sendStaffPasswordReset } from './identity';
import {
  assertStaffInfo,
  normalizeStaffPerson,
  syncStaffPayrollExpenses,
} from '@fnl/dashboard/staffPayroll';
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
  expensePartyKind,
  parseMoneyToCents,
  unifyCashMovements,
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
import { assertPrice, promotionSchedule, promotionStatus, saleUnitPrice } from './catalogRules';
import { aggregateOverview } from './overviewAggregate';
import {
  assertComanda,
  optionalComanda,
  optionalNote,
  normalizeSale,
  saleBalance,
  salePaidAmount,
} from './saleRules';
import {
  latestCutoff,
  openMovements,
  settledInWindow,
  snapshotLine,
  sumReais,
  totalsInWindow,
  windowFor,
} from './cashClose';
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
  'disabled',
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
      return normalizeStaffPerson(safe, index);
    }),
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
  const ref = doc(db, 'emails', id);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    if (snap.data()?.uid === uid) return;
    throw new Error('E-mail já cadastrado.');
  }
  await setDoc(ref, { uid, email: id });
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
    if (key === 'staff') return staffAsPeople(ops.staff);
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
    return key === 'staff' ? staffAsPeople(nextSection) : nextSection;
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

function ensureExpenseCategories(categories) {
  const list = categories?.length
    ? categories.map((item) => ({ ...item }))
    : expenseCategories.map((item) => ({ ...item }));
  expenseCategories.forEach((seed) => {
    if (seed.id !== 'fornecedor' && seed.id !== 'freelancer') return;
    if (!list.some((item) => item.id === seed.id)) list.push({ ...seed });
  });
  return list;
}

function migrateCashFlow(raw) {
  if (!raw) return cashFlowFallback;
  const { movements: _movements, ...source } = raw;

  const categories = ensureExpenseCategories(source.categories);
  const incomes = (source.incomes || []).map((row, index) => ({
    ...row,
    id: row.id || `inc-${index + 1}`,
    amount: row.amount ?? parseMoneyToCents(row.value),
  }));

  const expenses = (source.expenses || []).map((row, index) => {
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
      supplierId: row.supplierId || null,
      freelancerId: row.freelancerId || null,
      amount: row.amount ?? parseMoneyToCents(row.value),
      recurrence: row.recurrence ?? null,
      source: row.source || 'manual',
    };
  });

  const summary = buildCashFlowSummary(incomes, expenses, {
    revenueDelta: source.summary?.revenueDelta,
    expensesDelta: source.summary?.expensesDelta,
  });

  return {
    ...source,
    period: source.period || cashFlowFallback.period,
    categories,
    incomes,
    expenses,
    summary: {
      ...source.summary,
      ...summary,
    },
  };
}

function cashFlowDocument(cash) {
  if (!cash || typeof cash !== 'object') return cash;
  const { movements: _movements, ...rest } = cash;
  return rest;
}

export async function ensureDashboardSeed() {
  const ops = await readOps();
  const cashFlow = ops.cashFlow;
  if (!cashFlow) return;
  const migrated = migrateCashFlow(cashFlow);
  const categoryIds = new Set((cashFlow.categories || []).map((item) => item.id));
  const needsWrite =
    !cashFlow.categories?.length ||
    !categoryIds.has('fornecedor') ||
    !categoryIds.has('freelancer') ||
    (cashFlow.expenses || []).some((row) => !row.nature || row.amount == null);
  if (needsWrite) {
    await writeDocument(DOCS.cashFlow, migrated);
  }
}

function normalizeInventory(raw) {
  const sourceDoc = raw && typeof raw === 'object' ? raw : inventoryFallback;
  const { metrics: _metrics, ...current } = sourceDoc;
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
  };
}

export async function getOverview(period = 'mes') {
  await ensureDashboardSeed();
  const [cashFlow, inventory] = await Promise.all([
    readDocument(DOCS.cashFlow),
    readDocument(DOCS.inventory),
  ]);
  return aggregateOverview(period, {
    cash: migrateCashFlow(cashFlow || cashFlowFallback),
    inventory: normalizeInventory(inventory),
  });
}

export async function getCashFlow() {
  await ensureDashboardSeed();
  const raw = (await readDocument(DOCS.cashFlow)) || cashFlowFallback;
  const cash = migrateCashFlow(raw);
  return {
    ...cash,
    movements: unifyCashMovements(cash.incomes, cash.expenses),
  };
}

export async function getInventory() {
  await ensureDashboardSeed();
  const now = await readServerNow();
  const inventory = normalizeInventory((await readDocument(DOCS.inventory)) || inventoryFallback);
  return {
    ...inventory,
    promotions: (inventory.promotions || []).map((row) => {
      const recorded = promotionRecord(row);
      return {
        ...recorded,
        status: promotionStatus(recorded, now),
      };
    }),
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

async function partyFromSupplier(supplierId, missingMessage) {
  const current = await getSuppliers();
  const supplier = (current.suppliers || []).find((item) => String(item.id) === String(supplierId));
  if (!supplier) throw new Error(missingMessage);
  return { supplier: supplier.name, supplierId: supplier.id, freelancerId: null };
}

async function partyFromFreelancer(freelancerId, missingMessage) {
  const current = await getFreelancers();
  const person = (current.people || []).find((item) => String(item.id) === String(freelancerId));
  if (!person) throw new Error(missingMessage);
  return { supplier: person.name, supplierId: null, freelancerId: person.id };
}

async function resolveExpenseParties(payload, category) {
  const kind = expensePartyKind(category.id);
  if (kind === 'freelancer') {
    if (!payload.freelancerId) throw new Error('Selecione o freelancer.');
    return partyFromFreelancer(payload.freelancerId, 'Freelancer não encontrado.');
  }
  if (payload.supplierId) return partyFromSupplier(payload.supplierId, 'Fornecedor não encontrado.');
  if (payload.freelancerId) return partyFromFreelancer(payload.freelancerId, 'Freelancer não encontrado.');
  const label = String(payload.supplier || '').trim();
  return { supplier: label, supplierId: null, freelancerId: null };
}

export async function createExpense(payload) {
  const current = await getCashFlow();
  const categories = current.categories?.length ? current.categories : expenseCategories;
  const category = categories.find((item) => item.id === payload.categoryId);
  if (!category) throw new Error('Selecione a categoria.');

  const parties = await resolveExpenseParties(payload, category);
  const amountCents =
    payload.amount ?? parseMoneyToCents(payload.value ?? payload.dailyRate);
  const nature = payload.nature || category.defaultNature || 'variable';

  const expense = {
    id: payload.id || `exp-${Date.now()}`,
    date: formatExpenseDate(payload.date),
    supplier: parties.supplier,
    supplierId: parties.supplierId,
    freelancerId: parties.freelancerId,
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

  const next = cashFlowDocument({
    ...current,
    expenses,
    summary: {
      ...current.summary,
      ...summary,
    },
  });

  await writeDocument(DOCS.cashFlow, next);

  if (parties.supplierId) {
    await recordSupplierPurchase({
      supplierId: parties.supplierId,
      date: expense.date,
      category: category.name,
      value: expense.value,
      amount: amountCents,
      expenseId: expense.id,
    });
  }

  return expense;
}

function expenseCategoryId(name, taken) {
  const base =
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'categoria';
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export async function addExpenseCategory(name) {
  const current = await getCashFlow();
  const label = String(name || '').trim().replace(/\s+/g, ' ');
  if (!label) throw new Error('Informe o nome da categoria.');
  const categories = current.categories?.length ? [...current.categories] : [...expenseCategories];
  if (categories.some((item) => item.name.toLowerCase() === label.toLowerCase())) {
    throw new Error('Essa categoria já existe.');
  }
  const category = {
    id: expenseCategoryId(label, new Set(categories.map((item) => item.id))),
    name: label,
    type: 'expense',
    defaultNature: 'variable',
    icon: 'category',
  };
  await saveCashFlow(current, { categories: [...categories, category] });
  return category;
}

async function saveCashFlow(current, patch) {
  const nextBase = { ...cashFlowDocument(current), ...cashFlowDocument(patch) };
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

function shiftCreatedAt(createdAt, isoDate) {
  if (!isoDate) return createdAt || new Date().toISOString();
  const [year, month, day] = isoDate.split('-').map(Number);
  const base = createdAt ? new Date(createdAt) : new Date();
  if (Number.isNaN(base.getTime())) return new Date(year, month - 1, day, 12, 0, 0).toISOString();
  base.setFullYear(year, month - 1, day);
  return base.toISOString();
}

export async function updateExpense(expenseId, payload) {
  const current = await getCashFlow();
  const existing = (current.expenses || []).find((row) => String(row.id) === String(expenseId));
  if (!existing) throw new Error('Despesa não encontrada.');
  const categories = current.categories?.length ? current.categories : expenseCategories;
  const category = categories.find((item) => item.id === payload.categoryId);
  if (!category) throw new Error('Selecione a categoria.');
  const parties = await resolveExpenseParties(payload, category);
  const amountCents = payload.amount ?? parseMoneyToCents(payload.value);
  const nature = payload.nature || category.defaultNature || existing.nature || 'variable';
  const expense = {
    ...existing,
    date: formatExpenseDate(payload.date),
    createdAt: shiftCreatedAt(existing.createdAt, payload.date),
    supplier: parties.supplier,
    supplierId: parties.supplierId,
    freelancerId: parties.freelancerId,
    category: category.name,
    categoryId: category.id,
    categoryIcon: category.icon,
    nature,
    value: formatCents(amountCents),
    amount: amountCents,
    recurrence: payload.recurrence || null,
  };
  const expenses = (current.expenses || []).map((row) =>
    String(row.id) === String(expenseId) ? expense : row
  );
  await saveCashFlow(current, { expenses });
  if (parties.supplierId && String(parties.supplierId) !== String(existing.supplierId || '')) {
    await recordSupplierPurchase({
      supplierId: parties.supplierId,
      date: expense.date,
      category: category.name,
      value: expense.value,
      amount: amountCents,
      expenseId: expense.id,
    });
  }
  return expense;
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

export async function updateIncome(incomeId, payload) {
  const current = await getCashFlow();
  const existing = (current.incomes || []).find((row) => String(row.id) === String(incomeId));
  if (!existing) throw new Error('Entrada não encontrada.');
  const amountCents = payload.amount ?? parseMoneyToCents(payload.value);
  const income = {
    ...existing,
    date: formatExpenseDate(payload.date),
    createdAt: shiftCreatedAt(existing.createdAt, payload.date),
    description: String(payload.description || '').trim(),
    category: payload.category || existing.category || 'Varejo',
    categoryIcon: payload.categoryIcon || existing.categoryIcon || 'payments',
    categoryTone: payload.categoryTone || existing.categoryTone || 'secondary',
    value: formatCents(amountCents),
    amount: amountCents,
  };
  const incomes = (current.incomes || []).map((row) =>
    String(row.id) === String(incomeId) ? income : row
  );
  await saveCashFlow(current, { incomes });
  return income;
}

export async function deleteIncome(incomeId) {
  const current = await getCashFlow();
  const incomes = (current.incomes || []).filter((row) => String(row.id) !== String(incomeId));
  return saveCashFlow(current, { incomes });
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

function promotionRecord(row) {
  const weekday = row.vigencia === 'semana';
  return {
    id: row.id,
    produto_id: row.produto_id,
    preco_promocional: row.preco_promocional,
    vigencia: weekday ? 'semana' : 'periodo',
    dia_semana: weekday ? Number(row.dia_semana) : null,
    data_inicio: weekday ? null : row.data_inicio,
    data_termino: row.data_termino || null,
    inativa: Boolean(row.inativa),
  };
}

async function saveInventory(current, items) {
  const { serverNow: _serverNow, ...rest } = current || {};
  const next = {
    ...rest,
    items,
    promotions: (rest.promotions || []).map(promotionRecord),
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
  const rawFoto = item.foto || item.image || '';
  const foto = item.tipo === 'combo' ? rawFoto : rawFoto || DEFAULT_PRODUCT_IMAGE;
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
    produzido: Boolean(item.produzido),
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
    produzido: Boolean(item.produzido),
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
      produzido: Boolean(payload.produzido),
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
      produzido: payload.produzido == null ? Boolean(currentItem.produzido) : Boolean(payload.produzido),
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
    if (expensePartyKind(category.id) === 'freelancer') {
      throw new Error('Compra de estoque não usa a categoria Freelancer.');
    }

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
      freelancerId: null,
      category: category.name,
      categoryId: category.id,
      categoryIcon: category.icon,
      nature:
        payload.nature === 'fixed' || payload.nature === 'variable'
          ? payload.nature
          : category.defaultNature || 'variable',
      value: formatCents(amountCents),
      amount: amountCents,
      recurrence: payload.recurrence === 'monthly' ? 'monthly' : null,
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
  if (item.tipo === 'combo' || !item.produzido) {
    throw new Error('Selecione um produto feito no bar.');
  }
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
    if (nextItem.tipo === 'combo' || !nextItem.produzido) {
      throw new Error('Selecione um produto feito no bar.');
    }
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
  const agenda = promotionSchedule(payload);
  const promotion = {
    id: `promo-${Date.now()}`,
    produto_id: produtoId,
    preco_promocional: preco,
    inativa: false,
    ...agenda,
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
  const agenda = promotionSchedule(payload);
  const promotion = {
    id: existing.id,
    produto_id: produtoId,
    preco_promocional: preco,
    inativa: false,
    ...agenda,
  };
  const promotions = current.promotions.map((row) => (row.id === existing.id ? promotion : row));
  const stored = (current.items || []).map((item) => persistProduct(presentProduct(item, item.codigo)));
  const next = await saveInventory({ ...current, promotions }, stored);
  return { promotion, inventory: next };
}

export async function deactivatePromotion(promotionId) {
  const current = await getInventory();
  const existing = (current.promotions || []).find((row) => String(row.id) === String(promotionId));
  if (!existing) throw new Error('Promoção não encontrada.');
  const promotions = current.promotions.map((row) =>
    String(row.id) === String(existing.id) ? { ...promotionRecord(row), inativa: true } : row
  );
  const stored = (current.items || []).map((item) => persistProduct(presentProduct(item, item.codigo)));
  await saveInventory({ ...current, promotions }, stored);
  return promotions.find((row) => String(row.id) === String(existing.id));
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
      foto: String(payload.foto || '').trim() || primeiro?.foto || primeiro?.image || '',
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
      foto: payload.foto != null ? String(payload.foto) : existing.foto || existing.image || '',
      image: payload.foto != null ? String(payload.foto) : existing.foto || existing.image || '',
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

function pdvIncomeDescription(numero, clienteNome, observacao, tag) {
  const who = clienteNome || 'Consumidor';
  const base = numero != null ? `PDV · comanda ${numero} · ${who}` : `PDV · ${who}`;
  const tagged = tag ? `${base} · ${tag}` : base;
  const note = optionalNote(observacao);
  return note ? `${tagged} · ${note}` : tagged;
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

export async function createOpenComanda(payload) {
  const numero = assertComanda(payload.numero_comanda);
  const usuarioId = await actorId();
  await ensureDashboardSeed();
  const now = await readServerNow();
  return commitOps((ops) => {
    const inventory = normalizeInventory(ops.inventory);
    assertOpenComandaFree(inventory.sales, numero);
    const cliente = customerFromOps(ops, payload.cliente_id);
    const sale = normalizeSale({
      id: `sale-${Date.now()}`,
      numero_comanda: numero,
      status: 'aberta',
      cliente_id: cliente.id,
      cliente_nome: cliente.nome,
      forma_pagamento: null,
      total: 0,
      itens: [],
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      usuario_id: usuarioId,
    });
    return {
      ops: { ...ops, inventory: { ...inventory, sales: [sale, ...(inventory.sales || [])] } },
      value: sale,
    };
  });
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
    if (existing && salePaidAmount(existing) - total > 0.001) {
      throw new Error('O total não pode ficar menor que o já pago.');
    }
    const sale = normalizeSale({
      id: existing?.id || `sale-${Date.now()}`,
      numero_comanda: numero,
      status: 'aberta',
      cliente_id: cliente.id,
      cliente_nome: cliente.nome,
      forma_pagamento: null,
      total,
      observacao: optionalNote(payload.observacao, existing?.observacao),
      pagamentos: existing?.pagamentos || [],
      historico: existing?.historico || [],
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
    const cliente = customerFromOps(ops, payload.cliente_id);
    if (numero != null) assertOpenComandaFree(inventory.sales, numero, payload.sale_id);
    const existing = payload.sale_id
      ? (inventory.sales || []).find((sale) => String(sale.id) === String(payload.sale_id))
      : null;
    if (payload.sale_id && (!existing || existing.status !== 'aberta')) {
      throw new Error('Comanda não encontrada.');
    }
    const already = salePaidAmount(existing);
    if (already - total > 0.001) throw new Error('O total não pode ficar menor que o já pago.');
    const due = Math.round((total - already) * 100) / 100;
    let valorRecebido = null;
    let troco = null;
    let parcelas = null;
    if (forma === 'dinheiro' && due > 0) {
      valorRecebido = assertPrice(payload.valor_recebido);
      if (valorRecebido < due) throw new Error('Valor recebido menor que o saldo.');
      troco = Math.round((valorRecebido - due) * 100) / 100;
    }
    if (forma === 'cartao_credito' && due > 0) parcelas = assertInstallments(payload.parcelas);
    const stored = deductSaleStock(inventory, resolved);
    const payment =
      due > 0
        ? {
            id: `pay-${Date.now()}`,
            valor: due,
            forma_pagamento: forma,
            valor_recebido: valorRecebido,
            troco,
            parcelas,
            created_at: now.toISOString(),
          }
        : null;
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
      observacao: optionalNote(payload.observacao, existing?.observacao),
      pagamentos: payment ? [...(existing?.pagamentos || []), payment] : existing?.pagamentos || [],
      historico: existing?.historico || [],
      itens: saleItems(resolved),
      created_at: existing?.created_at || now.toISOString(),
      updated_at: now.toISOString(),
      usuario_id: usuarioId,
    });
    const sales = existing
      ? inventory.sales.map((item) => (item.id === sale.id ? sale : item))
      : [sale, ...(inventory.sales || [])];
    const cash = ops.cashFlow || cashFlowFallback;
    const amountCents = Math.round(due * 100);
    const income = payment
      ? {
          id: `inc-${payment.id}`,
          date: formatExpenseDate(format(now, 'yyyy-MM-dd')),
          description: pdvIncomeDescription(numero, cliente.nome, sale.observacao),
          category: 'Varejo',
          categoryIcon: 'payments',
          categoryTone: 'secondary',
          value: formatCents(amountCents),
          amount: amountCents,
          source: 'pdv',
          saleId: sale.id,
          cliente: cliente.nome,
          importKey: null,
          createdAt: now.toISOString(),
        }
      : null;
    const incomes = payment ? [income, ...(cash.incomes || [])] : cash.incomes || [];
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

function storedSaleLines(inventory, itens) {
  return (itens || []).map((item) => {
    const produto = (inventory.items || []).find((row) => String(row.id) === String(item.produto_id));
    if (!produto) throw new Error('Produto não encontrado.');
    const quantidade = Number(item.quantidade);
    if (!Number.isInteger(quantidade) || quantidade <= 0) throw new Error('Quantidade inválida.');
    return { produto, quantidade };
  });
}

export async function registerPartialPayment(payload) {
  const forma = assertPaymentMethod(payload.forma_pagamento);
  const saleId = String(payload.sale_id || '').trim();
  if (!saleId) throw new Error('Comanda não encontrada.');
  const valor = assertPrice(payload.valor);
  if (valor <= 0) throw new Error('Informe o valor do pagamento.');
  const usuarioId = await actorId();
  await ensureDashboardSeed();
  const now = await readServerNow();
  return commitOps((ops) => {
    const inventory = normalizeInventory(ops.inventory);
    const existing = (inventory.sales || []).find((sale) => String(sale.id) === saleId);
    if (!existing || existing.status !== 'aberta') throw new Error('Comanda não encontrada.');
    const saldo = saleBalance(existing);
    if (saldo <= 0) throw new Error('Essa comanda não tem saldo.');
    if (valor - saldo > 0.001) throw new Error('O valor passa do saldo.');
    let valorRecebido = null;
    let troco = null;
    let parcelas = null;
    if (forma === 'dinheiro') {
      valorRecebido = assertPrice(payload.valor_recebido);
      if (valorRecebido < valor) throw new Error('Valor recebido menor que o pagamento.');
      troco = Math.round((valorRecebido - valor) * 100) / 100;
    }
    if (forma === 'cartao_credito') parcelas = assertInstallments(payload.parcelas);
    const covers = saldo - valor <= 0.001;
    const destino = payload.destino === 'ativa' || payload.destino === 'fechar' ? payload.destino : 'parcial';
    if (covers && destino === 'parcial') throw new Error('Escolha fechar a comanda ou deixá-la ativa.');
    if (!covers && destino !== 'parcial') throw new Error('Ainda há saldo nesta comanda.');
    const payment = {
      id: `pay-${Date.now()}`,
      valor,
      forma_pagamento: forma,
      valor_recebido: valorRecebido,
      troco,
      parcelas,
      created_at: now.toISOString(),
    };
    const keepOpen = destino === 'ativa';
    const cycle = keepOpen
      ? {
          id: `hist-${Date.now()}`,
          quitado_em: now.toISOString(),
          total: existing.total,
          itens: existing.itens || [],
          pagamentos: [...(existing.pagamentos || []), payment],
        }
      : null;
    const sale = normalizeSale({
      ...existing,
      status: destino === 'fechar' ? 'paga' : 'aberta',
      forma_pagamento: destino === 'fechar' ? forma : null,
      valor_recebido: destino === 'fechar' ? valorRecebido : null,
      troco: destino === 'fechar' ? troco : null,
      parcelas: destino === 'fechar' ? parcelas : null,
      total: keepOpen ? 0 : existing.total,
      itens: keepOpen ? [] : existing.itens,
      pagamentos: keepOpen ? [] : [...(existing.pagamentos || []), payment],
      historico: cycle ? [...(existing.historico || []), cycle] : existing.historico || [],
      updated_at: now.toISOString(),
      usuario_id: existing.usuario_id || usuarioId,
    });
    const sales = inventory.sales.map((item) => (item.id === existing.id ? sale : item));
    const stored = covers
      ? deductSaleStock(inventory, storedSaleLines(inventory, existing.itens))
      : ops.inventory?.items || inventory.items;
    const cash = ops.cashFlow || cashFlowFallback;
    const amountCents = Math.round(valor * 100);
    const numero = sale.numero_comanda;
    const income = {
      id: `inc-${payment.id}`,
      date: formatExpenseDate(format(now, 'yyyy-MM-dd')),
      description: pdvIncomeDescription(
        numero,
        sale.cliente_nome,
        sale.observacao,
        destino === 'fechar' ? 'fechamento' : destino === 'ativa' ? 'quitada' : 'parcial',
      ),
      category: 'Varejo',
      categoryIcon: 'payments',
      categoryTone: 'secondary',
      value: formatCents(amountCents),
      amount: amountCents,
      source: 'pdv',
      saleId: sale.id,
      cliente: sale.cliente_nome,
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

export async function closeShift(input = {}) {
  const usuarioId = await actorId();
  await ensureDashboardSeed();
  return commitOps((ops) => {
    const inventory = normalizeInventory(ops.inventory);
    const cash = ops.cashFlow || cashFlowFallback;
    const now = new Date();
    const open = openMovements(cash.incomes, cash.expenses, inventory.closings);
    const span = windowFor({
      modo: input.modo,
      day: input.day || format(now, 'yyyy-MM-dd'),
      time: input.time || format(now, 'HH:mm'),
      openIncomes: open.incomes,
      openExpenses: open.expenses,
      now,
    });
    if (span.error) throw new Error(span.error);
    const entradas = sumReais(span.incomes);
    const saidas = sumReais(span.expenses);
    const range = { from: latestCutoff(inventory.closings), until: span.until, day: span.day };
    const totais = totalsInWindow(inventory.sales, range);
    const closing = {
      id: `close-${Date.now()}`,
      from: span.from ? span.from.toISOString() : null,
      until: span.until.toISOString(),
      closed_at: now.toISOString(),
      modo: span.modo,
      income_ids: span.incomes.map((row) => row.id),
      expense_ids: span.expenses.map((row) => row.id),
      entradas_linhas: span.incomes.map(snapshotLine),
      saidas_linhas: span.expenses.map(snapshotLine),
      entradas,
      saidas,
      saldo: Math.round((entradas - saidas) * 100) / 100,
      vendas: span.incomes.filter((row) => row.source === 'pdv' || String(row.description || '').startsWith('PDV')).length,
      produtos: settledInWindow(inventory.sales, range),
      totais,
      usuario_id: usuarioId,
    };
    return {
      ops: {
        ...ops,
        inventory: { ...inventory, closings: [closing, ...(inventory.closings || [])] },
      },
      value: closing,
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
  const { metrics: _metrics, serverNow: _serverNow, ...rest } = current;
  const next = {
    ...rest,
    items,
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
  if (!person) throw new Error('Selecione o freelancer.');
  const amountCents = dailyAmountCents(payload.value, person?.dailyRate);
  const expense = await createExpense({
    date: payload.date,
    supplier: person.name,
    freelancerId: person.id,
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
  if (!person) throw new Error('Selecione o freelancer.');
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
    const dailyCategory =
      (cash.categories || expenseCategories).find((item) => item.id === 'freelancer') ||
      expenseCategories.find((item) => item.id === 'freelancer');
    expenses[matchIndex] = {
      ...row,
      date: formatExpenseDate(payload.date),
      supplier: person.name,
      supplierId: null,
      freelancerId: person.id,
      category: dailyCategory?.name || 'Freelancer',
      categoryId: 'freelancer',
      categoryIcon: dailyCategory?.icon || 'person',
      value: formatCents(amountCents),
      amount: amountCents,
      source: 'freelancer_daily',
    };
    await saveCashFlow(cash, { expenses });
  } else {
    const expense = await createExpense({
      date: payload.date,
      supplier: person.name,
      freelancerId: person.id,
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

export async function deleteDaily(target) {
  await ensureDashboardSeed();
  return commitOps((ops) => {
    const current = normalizeFreelancers(ops.freelancers);
    const existing = (current.dailies || []).find((row) => sameDaily(row, target));
    if (!existing) throw new Error('Diária não encontrada.');

    const person = (current.people || []).find(
      (item) => String(item.id) === String(existing.freelancerId)
    );
    const previousCents = dailyAmountCents(existing.value, person?.dailyRate);
    const cash = migrateCashFlow(ops.cashFlow || cashFlowFallback);
    const expenses = [...(cash.expenses || [])];
    let matchIndex = expenses.findIndex(
      (row) => existing.expenseId && String(row.id) === String(existing.expenseId)
    );
    if (matchIndex < 0) {
      const previousDate = formatExpenseDate(existing.date);
      matchIndex = expenses.findIndex(
        (row) =>
          row.source === 'freelancer_daily' &&
          row.supplier === (person?.name || '') &&
          row.date === previousDate &&
          row.amount === previousCents
      );
    }
    const nextExpenses =
      matchIndex >= 0 ? expenses.filter((_, index) => index !== matchIndex) : expenses;
    const summary = buildCashFlowSummary(cash.incomes || [], nextExpenses, {
      revenueDelta: cash.summary?.revenueDelta,
      expensesDelta: cash.summary?.expensesDelta,
    });

    return {
      ops: {
        ...ops,
        freelancers: {
          ...current,
          dailies: (current.dailies || []).filter((row) => !sameDaily(row, existing)),
        },
        cashFlow: {
          ...cash,
          expenses: nextExpenses,
          summary: { ...cash.summary, ...summary },
        },
      },
      value: existing,
    };
  });
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
    cnpj: String(payload.cnpj || '').trim(),
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
  if (!name || !contact) throw new Error('Informe nome e contato.');
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
  const ops = await readOps();
  return staffAsPeople(ops.staff);
}

async function syncPeoplePayroll(people) {
  const current = await getCashFlow();
  const category =
    (current.categories || expenseCategories).find((item) => item.id === 'salarios') ||
    expenseCategories.find((item) => item.id === 'salarios');
  const expenses = syncStaffPayrollExpenses(
    people,
    current.expenses || [],
    ({ person, iso, amount, key, prev }) => ({
      ...prev,
      id: prev?.id || key,
      payrollKey: key,
      staffId: String(person.id),
      date: formatExpenseDate(iso),
      isoDate: iso,
      supplier: person.name || 'Funcionário',
      supplierId: null,
      category: category?.name || 'Salários',
      categoryId: category?.id || 'salarios',
      categoryIcon: category?.icon || 'badge',
      nature: 'fixed',
      value: formatCents(amount),
      amount,
      recurrence: 'monthly',
      source: 'staff_payroll',
      createdAt: prev?.createdAt || new Date().toISOString(),
    })
  );
  await saveCashFlow(current, { expenses });
}

async function storeStaffPeople(people) {
  const ops = await readOps();
  const next = staffAsPeople({ people });
  await writeOps({ ...ops, staff: next });
  await syncPeoplePayroll(next.people);
  return next;
}

const STOCK_ACCESS = ['estoque', 'catalogo', 'pdv', 'perfil'];
const ADMIN_ACCESS = ['overview', 'caixa', 'estoque', 'catalogo', 'pdv', 'fornecedores', 'equipe', 'perfil'];

function accessForRole(role) {
  const admin = role === 'admin';
  return {
    role: admin ? 'admin' : 'stock',
    permissions: admin ? ADMIN_ACCESS : STOCK_ACCESS,
  };
}

function memberFromPerson(person) {
  const permissions = person.permissions || [];
  return {
    id: person.id,
    uid: person.uid || null,
    email: person.email || '',
    name: person.name,
    title: person.title || '',
    role: permissions.includes('caixa') ? 'admin' : 'stock',
    disabled: Boolean(person.disabled),
    accountStatus: person.accountStatus || (person.uid ? 'active' : ''),
    createdAt: person.createdAt,
  };
}

export async function listStaff() {
  const staff = await getStaff();
  return (staff.people || []).map(memberFromPerson);
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
  if ((staff.people || []).some((item) => item.email === email)) {
    throw new Error('Já existe um usuário com este e-mail.');
  }

  const created = await createAuthUserRest({ email, password });
  const member = {
    email,
    name,
    title: String(payload.title || (role === 'stock' ? 'Estoquista' : 'Administrador')).trim(),
    role,
    uid: created.uid,
    createdAt: new Date().toISOString(),
  };
  const nextId =
    (staff.people || []).reduce((max, person) => Math.max(max, Number(person.id) || 0), 0) + 1;
  await storeStaffPeople([...(staff.people || []), { id: nextId, ...member }]);
  await upsertUserProfile(created.uid, {
    ...member,
    roles: ['staff'],
    tenantId: TENANT_ID,
    barRole: role,
  });
  return { member: memberFromPerson({ ...member, permissions: role === 'admin' ? ['caixa'] : [] }), staff };
}

export async function saveStaffPerson(payload) {
  const name = String(payload.name || '').trim();
  const title = String(payload.title || '').trim();
  const access = accessForRole(payload.role);
  if (!name) throw new Error('Informe o nome.');
  if (!title) throw new Error('Informe o cargo.');
  const current = await getStaff();
  const nextId =
    (current.people || []).reduce((max, person) => Math.max(max, Number(person.id) || 0), 0) + 1;
  const person = normalizeStaffPerson({
    id: nextId,
    name,
    title,
    role: access.role,
    permissions: access.permissions,
    createdAt: new Date().toISOString(),
  });
  await storeStaffPeople([...(current.people || []), person]);
  return memberFromPerson(person);
}

export async function updateStaffPerson(staffId, payload) {
  const current = await getStaff();
  const existing = (current.people || []).find((person) => String(person.id) === String(staffId));
  if (!existing) throw new Error('Funcionário não encontrado.');
  const name = String(payload.name ?? existing.name).trim();
  const title = String(payload.title ?? existing.title).trim();
  const access = accessForRole(payload.role);
  if (!name) throw new Error('Informe o nome.');
  if (!title) throw new Error('Informe o cargo.');
  const people = (current.people || []).map((person) => {
    if (String(person.id) !== String(staffId)) return person;
    return normalizeStaffPerson({ ...person, name, title, role: access.role, permissions: access.permissions });
  });
  const next = await storeStaffPeople(people);
  const saved = next.people.find((person) => String(person.id) === String(staffId));
  if (saved?.uid) {
    await patchStaffUser(saved.uid, {
      name: saved.name,
      title: saved.title || 'Equipe',
      barRole: access.role,
      permissions: access.permissions,
    });
  }
  return memberFromPerson(saved);
}

export async function setStaffActive(staffId, active) {
  const current = await getStaff();
  const existing = (current.people || []).find((person) => String(person.id) === String(staffId));
  if (!existing) throw new Error('Funcionário não encontrado.');
  if (existing.uid) await patchStaffUser(existing.uid, { disabled: !active });
  const people = (current.people || []).map((person) => {
    if (String(person.id) !== String(staffId)) return person;
    return normalizeStaffPerson({ ...person, disabled: !active });
  });
  const next = await storeStaffPeople(people);
  return memberFromPerson(next.people.find((person) => String(person.id) === String(staffId)));
}

export async function openStaffAccount(staffId, payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  if (!email) throw new Error('Informe o e-mail.');
  const current = await getStaff();
  const existing = (current.people || []).find((person) => String(person.id) === String(staffId));
  if (!existing) throw new Error('Funcionário não encontrado.');
  if (existing.disabled) throw new Error('Funcionário desativado.');
  if ((current.people || []).some((person) => person.email === email && String(person.id) !== String(staffId))) {
    throw new Error('E-mail já cadastrado.');
  }
  if (!existing.uid && (await emailTaken(email))) {
    throw new Error('E-mail já cadastrado.');
  }

  const access = accessForRole(existing.permissions?.includes('caixa') ? 'admin' : 'stock');
  let uid = existing.uid || null;
  if (!uid) {
    const created = await createAuthUserRest({ email, password: randomStaffPassword() });
    uid = created.uid;
  }
  await writeStaffUser(uid, {
    email,
    name: existing.name || 'Funcionário',
    title: existing.title || 'Equipe',
    permissions: access.permissions,
    barRole: access.role,
    disabled: false,
    createdAt: existing.createdAt || new Date().toISOString(),
  });

  const staged = await storeStaffPeople(
    (await getStaff()).people.map((person) =>
      String(person.id) === String(staffId)
        ? normalizeStaffPerson({
            ...person,
            email,
            uid,
            permissions: access.permissions,
            accountStatus: 'pending',
            disabled: false,
          })
        : person
    )
  );
  const stagedPerson = staged.people.find((person) => String(person.id) === String(staffId));

  try {
    await sendStaffPasswordReset(email);
  } catch (error) {
    const err = new Error(error?.message || 'Não foi possível enviar o e-mail.');
    err.staff = memberFromPerson(stagedPerson);
    throw err;
  }

  const latest = await getStaff();
  const next = await storeStaffPeople(
    (latest.people || []).map((person) =>
      String(person.id) === String(staffId)
        ? normalizeStaffPerson({
            ...person,
            email,
            uid,
            permissions: access.permissions,
            accountStatus: 'invited',
            disabled: false,
          })
        : person
    )
  );
  return memberFromPerson(next.people.find((person) => String(person.id) === String(staffId)));
}

export async function listStaffPeople() {
  const staff = await getStaff();
  return staff.people || [];
}

export async function createHouseStaff(payload) {
  const info = assertStaffInfo(payload);
  if (String(payload.monthlyCost ?? '').trim() === '') {
    throw new Error('Informe o custo mensal.');
  }
  const monthlyCostCents = parseMoneyToCents(payload.monthlyCost);
  const current = await getStaff();
  const nextId =
    (current.people || []).reduce((max, person) => Math.max(max, Number(person.id) || 0), 0) + 1;
  const person = normalizeStaffPerson({
    id: nextId,
    ...info,
    monthlyCostCents,
    permissions: [],
    createdAt: new Date().toISOString(),
  });
  await storeStaffPeople([...(current.people || []), person]);
  return person;
}

export async function updateHouseStaff(staffId, payload) {
  const current = await getStaff();
  const existing = (current.people || []).find((person) => String(person.id) === String(staffId));
  if (!existing) throw new Error('Funcionário não encontrado.');
  const info = assertStaffInfo({
    name: payload.name ?? existing.name,
    title: payload.title ?? existing.title,
    contractType: payload.contractType ?? existing.contractType,
    contractStart: payload.contractStart ?? existing.contractStart,
    contractEnd: payload.contractEnd ?? existing.contractEnd,
  });
  if (payload.monthlyCost != null && String(payload.monthlyCost).trim() === '') {
    throw new Error('Informe o custo mensal.');
  }
  const monthlyCostCents =
    payload.monthlyCost != null ? parseMoneyToCents(payload.monthlyCost) : existing.monthlyCostCents;
  const people = (current.people || []).map((person) => {
    if (String(person.id) !== String(staffId)) return person;
    return normalizeStaffPerson({ ...person, ...info, monthlyCostCents });
  });
  const next = await storeStaffPeople(people);
  return next.people.find((person) => String(person.id) === String(staffId));
}

async function writeStaffUser(uid, data) {
  const payload = pickUserFields({
    ...data,
    uid,
    tenantId: TENANT_ID,
    roles: ['staff'],
    updatedAt: new Date().toISOString(),
  });
  await setDoc(doc(db, 'users', uid), payload);
  if (payload.email) await writeEmailLock(payload.email, uid);
  return payload;
}

async function patchStaffUser(uid, data) {
  const payload = pickUserFields({
    ...data,
    updatedAt: new Date().toISOString(),
  });
  delete payload.uid;
  delete payload.roles;
  delete payload.email;
  delete payload.tenantId;
  await setDoc(doc(db, 'users', uid), payload, { merge: true });
  return payload;
}

export async function inviteHouseStaff(staffId, payload) {
  const email = String(payload.email || '').trim().toLowerCase();
  const permissions = Array.isArray(payload.permissions) ? payload.permissions : [];
  if (!email) throw new Error('Informe o e-mail.');
  if (!permissions.length) throw new Error('Marque ao menos uma permissão.');
  const current = await getStaff();
  const existing = (current.people || []).find((person) => String(person.id) === String(staffId));
  if (!existing) throw new Error('Funcionário não encontrado.');
  if ((current.people || []).some((person) => person.email === email && String(person.id) !== String(staffId))) {
    throw new Error('E-mail já cadastrado.');
  }
  if (!existing.uid && (await emailTaken(email))) {
    throw new Error('E-mail já cadastrado.');
  }

  let uid = existing.uid || null;
  const stagedStatus = uid ? existing.accountStatus || 'active' : 'pending';
  if (!uid) {
    const created = await createAuthUserRest({ email, password: randomStaffPassword() });
    uid = created.uid;
    await writeStaffUser(uid, {
      email,
      name: existing.name || 'Funcionário',
      title: existing.title || 'Equipe',
      permissions,
      barRole: 'staff',
      disabled: false,
      createdAt: new Date().toISOString(),
    });
  } else {
    await patchStaffUser(uid, {
      name: existing.name,
      title: existing.title || 'Equipe',
      permissions,
      disabled: false,
    });
  }

  const staged = await storeStaffPeople(
    (await getStaff()).people.map((person) =>
      String(person.id) === String(staffId)
        ? normalizeStaffPerson({
            ...person,
            email,
            uid,
            permissions,
            accountStatus: stagedStatus,
            disabled: false,
          })
        : person
    )
  );
  const stagedPerson = staged.people.find((person) => String(person.id) === String(staffId));

  try {
    await sendStaffPasswordReset(email);
  } catch (error) {
    const err = new Error(error?.message || 'Não foi possível enviar o e-mail.');
    err.staff = stagedPerson;
    throw err;
  }

  const latest = await getStaff();
  const next = await storeStaffPeople(
    (latest.people || []).map((person) =>
      String(person.id) === String(staffId)
        ? normalizeStaffPerson({
            ...person,
            email,
            uid,
            permissions,
            accountStatus: 'invited',
            disabled: false,
          })
        : person
    )
  );
  return next.people.find((person) => String(person.id) === String(staffId));
}

export async function saveHouseStaffAccess(staffId, payload) {
  const permissions = Array.isArray(payload.permissions) ? payload.permissions : [];
  if (!permissions.length) throw new Error('Marque ao menos uma permissão.');
  const current = await getStaff();
  const existing = (current.people || []).find((person) => String(person.id) === String(staffId));
  if (!existing?.uid) throw new Error('Esta pessoa ainda não tem conta.');
  await patchStaffUser(existing.uid, {
    name: existing.name,
    title: existing.title || 'Equipe',
    permissions,
    disabled: false,
  });
  const next = await storeStaffPeople(
    (current.people || []).map((person) =>
      String(person.id) === String(staffId)
        ? normalizeStaffPerson({ ...person, permissions, disabled: false })
        : person
    )
  );
  return next.people.find((person) => String(person.id) === String(staffId));
}

export async function removeHouseStaff(staffId) {
  const current = await getStaff();
  const removed = (current.people || []).find((person) => String(person.id) === String(staffId)) || null;
  if (removed?.uid) {
    await patchStaffUser(removed.uid, { disabled: true });
  }
  const kept = (current.people || []).filter((person) => String(person.id) !== String(staffId));
  await storeStaffPeople(kept);
  return removed;
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
