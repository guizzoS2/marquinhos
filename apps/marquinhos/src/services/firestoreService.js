import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { createAuthUserRest } from './identity';
import { localStore } from './localStore';
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

const DOCS = {
  overview: 'dashboard/overview',
  cashFlow: 'dashboard/cashFlow',
  inventory: 'dashboard/inventory',
  freelancers: 'dashboard/freelancers',
  suppliers: 'dashboard/suppliers',
  staff: 'dashboard/staff',
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

function toDocRef(path) {
  const segments = path.split('/').filter(Boolean);
  return doc(db, ...segments);
}

async function readDocument(path) {
  if (isFirebaseConfigured() && db) {
    const snap = await getDoc(toDocRef(path));
    return snap.exists() ? snap.data() : null;
  }
  return localStore.getDoc(path);
}

async function writeDocument(path, data, merge = false) {
  if (isFirebaseConfigured() && db) {
    await setDoc(toDocRef(path), data, { merge });
    return data;
  }
  return localStore.setDoc(path, data, { merge });
}

async function patchDocument(path, data) {
  if (isFirebaseConfigured() && db) {
    await updateDoc(toDocRef(path), data);
    return data;
  }
  return localStore.updateDoc(path, data);
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
  const overview = await readDocument(DOCS.overview);
  if (!overview) {
    await writeDocument(DOCS.overview, overviewFallback);
  }

  const cashFlow = await readDocument(DOCS.cashFlow);
  if (!cashFlow) {
    await writeDocument(DOCS.cashFlow, cashFlowFallback);
  } else {
    const migrated = migrateCashFlow(cashFlow);
    const needsWrite =
      !cashFlow.categories?.length ||
      (cashFlow.expenses || []).some((row) => !row.nature || row.amount == null);
    if (needsWrite) {
      await writeDocument(DOCS.cashFlow, migrated);
    }
  }

  const inventory = await readDocument(DOCS.inventory);
  if (!inventory) {
    await writeDocument(DOCS.inventory, inventoryFallback);
  }

  const freelancers = await readDocument(DOCS.freelancers);
  if (!freelancers) {
    await writeDocument(DOCS.freelancers, freelancersFallback);
  }

  const suppliers = await readDocument(DOCS.suppliers);
  if (!suppliers) {
    await writeDocument(DOCS.suppliers, suppliersFallback);
  }

  const staff = await readDocument(DOCS.staff);
  if (!staff) {
    await writeDocument(DOCS.staff, staffFallback);
  }
}

export async function getOverview() {
  await ensureDashboardSeed();
  return (await readDocument(DOCS.overview)) || overviewFallback;
}

export async function getCashFlow() {
  await ensureDashboardSeed();
  const raw = (await readDocument(DOCS.cashFlow)) || cashFlowFallback;
  return migrateCashFlow(raw);
}

export async function getInventory() {
  await ensureDashboardSeed();
  return (await readDocument(DOCS.inventory)) || inventoryFallback;
}

export async function getFreelancers() {
  await ensureDashboardSeed();
  return (await readDocument(DOCS.freelancers)) || freelancersFallback;
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

async function saveInventory(current, items) {
  const next = {
    ...current,
    items,
    metrics: recomputeInventoryMetrics(items),
  };
  await writeDocument(DOCS.inventory, next);
  return next;
}

export async function createInventoryItem(payload) {
  const current = await getInventory();
  const name = String(payload.name || '').trim();
  if (!name) throw new Error('Informe o nome do produto.');

  const unit = String(payload.unit || 'un').trim() || 'un';
  const qty = Number(payload.qty);
  const minQty = Number(payload.minQty);
  if (!Number.isFinite(qty) || qty < 0) throw new Error('Quantidade inválida.');
  if (!Number.isFinite(minQty) || minQty < 0) throw new Error('Estoque mínimo inválido.');

  const category = String(payload.category || 'Insumos').trim() || 'Insumos';
  const costCents = payload.cost ? parseMoneyToCents(payload.cost) : 0;
  const status = qty < minQty ? 'low' : 'stable';
  const item = {
    id: `inv-${Date.now()}`,
    name,
    subtitle: String(payload.subtitle || '').trim(),
    category,
    stock: formatStockLabel(qty, unit),
    minStock: formatStockLabel(minQty, unit),
    cost: formatCents(costCents),
    status,
    statusLabel: status === 'low' ? 'Estoque Baixo' : 'Estável',
    image: payload.image || DEFAULT_PRODUCT_IMAGE,
  };

  const filters = current.filters?.includes(category)
    ? current.filters
    : [...(current.filters || ['Todos']), category];
  const next = await saveInventory({ ...current, filters }, [...(current.items || []), item]);
  return { item, inventory: next };
}

export async function updateInventoryItem(itemId, payload) {
  const current = await getInventory();
  const items = [...(current.items || [])];
  const index = items.findIndex((item) => String(item.id) === String(itemId));
  if (index < 0) throw new Error('Item não encontrado.');

  const currentItem = items[index];
  const parsed = parseStockLabel(payload.stock || currentItem.stock);
  const minParsed = parseStockLabel(payload.minStock || currentItem.minStock);
  const status = parsed.qty < minParsed.qty ? 'low' : 'stable';
  items[index] = {
    ...currentItem,
    name: String(payload.name || currentItem.name).trim(),
    subtitle: String(payload.subtitle ?? currentItem.subtitle).trim(),
    category: String(payload.category || currentItem.category).trim(),
    stock: formatStockLabel(parsed.qty, parsed.unit),
    minStock: formatStockLabel(minParsed.qty, minParsed.unit || parsed.unit),
    cost: payload.cost ? formatCents(parseMoneyToCents(payload.cost)) : currentItem.cost,
    status,
    statusLabel: status === 'low' ? 'Estoque Baixo' : 'Estável',
    image: payload.image || currentItem.image,
  };
  const next = await saveInventory(current, items);
  return { item: items[index], inventory: next };
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
    status,
    statusLabel: status === 'low' ? 'Estoque Baixo' : 'Estável',
  };

  await saveInventory(current, items);

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

export async function registerDaily(payload) {
  const current = await getFreelancers();
  const next = {
    ...current,
    dailies: [...(current.dailies || []), { ...payload, createdAt: new Date().toISOString() }],
  };
  await writeDocument(DOCS.freelancers, next);

  const person = (current.people || []).find(
    (item) => String(item.id) === String(payload.freelancerId)
  );
  const amountCents =
    payload.value != null
      ? Math.round(Number(payload.value) * 100)
      : parseMoneyToCents(person?.dailyRate);

  await createExpense({
    date: payload.date,
    supplier: person?.name || `Freelancer #${payload.freelancerId}`,
    categoryId: 'freelancer',
    nature: 'variable',
    amount: amountCents,
    source: 'freelancer_daily',
  });

  return next;
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
    status,
    statusLabel: STATUS_MAP[status] || STATUS_MAP.available,
    dailyRate: String(payload.dailyRate).startsWith('R$')
      ? String(payload.dailyRate)
      : `R$ ${Number(payload.dailyRate).toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`,
    image: payload.image?.trim() || DEFAULT_AVATAR,
  };

  const next = {
    ...current,
    people: [...(current.people || []), person],
  };
  await writeDocument(DOCS.freelancers, next);
  return person;
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

export async function findStaffByCredentials(email, password) {
  const staff = await getStaff();
  const member = (staff.members || []).find(
    (item) =>
      item.email === String(email || '').trim().toLowerCase() &&
      item.password === password
  );
  if (!member) return null;
  const { password: _password, ...safe } = member;
  return safe;
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

  const staff = await getStaff();
  if ((staff.members || []).some((item) => item.email === email)) {
    throw new Error('Já existe um usuário com este e-mail.');
  }

  let uid = `staff-${Date.now()}`;
  if (isFirebaseConfigured()) {
    const created = await createAuthUserRest({ email, password });
    uid = created.uid;
  }

  const member = {
    uid,
    email,
    password,
    name,
    title: String(payload.title || (role === 'stock' ? 'Estoquista' : 'Administrador')).trim(),
    role,
    createdAt: new Date().toISOString(),
  };
  const next = { members: [...(staff.members || []), member] };
  await writeDocument(DOCS.staff, next);
  const { password: _password, ...safe } = member;
  await upsertUserProfile(member.uid, {
    ...safe,
    roles: ['staff'],
    tenantId: 'marquinhos',
    barRole: role,
  });
  return { member: safe, staff: { members: next.members.map(stripStaffPassword) } };
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
  const { role, roles, ...rest } = data;
  const next = {
    ...existing,
    ...rest,
    uid,
    barRole: data.barRole || role || existing.barRole || existing.role,
    roles: existing.roles || roles || (role ? [role === 'admin' || role === 'stock' ? 'staff' : role] : ['owner']),
    updatedAt: new Date().toISOString(),
  };
  if (!existing.roles && role === 'admin' && !roles) {
    next.roles = ['owner'];
  }
  await writeDocument(path, next, true);
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
