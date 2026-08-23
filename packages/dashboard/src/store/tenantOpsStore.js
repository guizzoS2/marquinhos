import {
  cashFlowFallback,
  expenseCategories,
  freelancersFallback,
  inventoryFallback,
  overviewFallback,
  suppliersFallback,
} from '../services/fallbacks';
import { buildCashFlowSummary } from '../services/cashFlowUtils';

const STORE_KEY = 'fnl_tenant_ops_v1';
const STORE_EVENT = 'fnl-tenant-ops';
export const SEEDED_TENANT_ID = 'marquinhos';

const listeners = new Set();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function emptyWeek() {
  return ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map((day) => ({
    day,
    revenue: 20,
    expense: 15,
    highlight: day === 'SEX',
  }));
}

function emptyCashFlow() {
  return {
    period: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    categories: clone(expenseCategories),
    incomes: [],
    expenses: [],
    summary: buildCashFlowSummary([], []),
  };
}

function emptyInventory() {
  return {
    filters: ['Todos', 'Cervejas', 'Destilados', 'Insumos', 'Soft Drinks'],
    items: [],
    metrics: [
      {
        id: 'low-stock',
        tone: 'error',
        badge: 'Ação',
        icon: 'warning',
        label: 'Itens em estoque baixo',
        value: '0',
        progress: 0,
      },
      {
        id: 'inventory-value',
        tone: 'secondary',
        badge: 'Ativo',
        icon: 'inventory',
        label: 'Valor do inventário',
        value: 'R$ 0',
        progress: 0,
      },
      {
        id: 'turnover',
        tone: 'tertiary',
        badge: 'Giro',
        icon: 'trending_up',
        label: 'Giro de estoque (mês)',
        value: '—',
        progress: 0,
      },
    ],
  };
}

function emptyTeam() {
  return {
    roles: ['Barman', 'Garçom', 'Cozinha'],
    people: [],
    dailies: [],
    summary: { costsToday: 'R$ 0', activeNow: '00' },
  };
}

function emptyStaff() {
  return { people: [] };
}

function seedTenant(tenantId) {
  if (tenantId === SEEDED_TENANT_ID) {
    return {
      overview: clone(overviewFallback),
      cashFlow: clone(cashFlowFallback),
      inventory: clone(inventoryFallback),
      freelancers: clone(freelancersFallback),
      suppliers: clone(suppliersFallback),
      staff: emptyStaff(),
    };
  }
  return {
    overview: {
      weeklyPerformance: emptyWeek(),
      topSold: [],
      suggestion: null,
    },
    cashFlow: emptyCashFlow(),
    inventory: emptyInventory(),
    freelancers: emptyTeam(),
    suppliers: { suppliers: [] },
    staff: emptyStaff(),
  };
}

function loadRoot() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveRoot(root) {
  localStorage.setItem(STORE_KEY, JSON.stringify(root));
  listeners.forEach((fn) => fn());
  window.dispatchEvent(new Event(STORE_EVENT));
}

export function subscribeTenantOpsStore(listener) {
  listeners.add(listener);
  window.addEventListener(STORE_EVENT, listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener(STORE_EVENT, listener);
  };
}

export function ensureTenantOps(tenantId) {
  const id = String(tenantId || '').trim();
  if (!id) {
    throw new Error('tenantId obrigatório.');
  }
  const root = loadRoot();
  if (!root[id]) {
    root[id] = seedTenant(id);
    saveRoot(root);
  }
  return clone(root[id]);
}

export function readTenantOps(tenantId) {
  return ensureTenantOps(tenantId);
}

export function writeTenantOps(tenantId, patch) {
  const id = String(tenantId || '').trim();
  const root = loadRoot();
  const current = root[id] || seedTenant(id);
  root[id] = { ...current, ...patch };
  saveRoot(root);
  return clone(root[id]);
}

export function patchTenantOpsSection(tenantId, section, data) {
  return writeTenantOps(tenantId, { [section]: data });
}

export function listStaffAccounts() {
  const root = loadRoot();
  return Object.entries(root).flatMap(([tenantId, data]) =>
    (data?.staff?.people || []).map((person) => ({
      ...person,
      tenantId,
      role: 'staff',
    }))
  );
}
