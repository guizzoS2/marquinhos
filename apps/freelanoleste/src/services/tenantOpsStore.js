const PREFIX = 'fnl_tenant_ops_v2_';

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function emptyOps() {
  return {
    metrics: { todaySales: 0, openCash: 0, lowStock: 0 },
    cashFlow: [],
    inventory: [],
    suppliers: [],
    team: [],
  };
}

function storageKey(tenantId) {
  return `${PREFIX}${tenantId}`;
}

export function loadTenantOps(tenantId) {
  if (!tenantId) return emptyOps();
  try {
    const raw = localStorage.getItem(storageKey(tenantId));
    if (raw) return normalizeOps(JSON.parse(raw));
  } catch {
    /* seed */
  }
  const seed = emptyOps();
  localStorage.setItem(storageKey(tenantId), JSON.stringify(seed));
  return seed;
}

function normalizeOps(ops) {
  return {
    ...ops,
    inventory: (ops.inventory || []).map((item) => ({
      category: 'Geral',
      minStock: 4,
      unit: 'un',
      ...item,
    })),
  };
}

export function saveTenantOps(tenantId, store) {
  localStorage.setItem(storageKey(tenantId), JSON.stringify(store));
  return store;
}

export function nextOpsId(prefix) {
  return uid(prefix);
}
