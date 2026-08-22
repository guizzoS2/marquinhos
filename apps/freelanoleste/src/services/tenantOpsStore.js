const PREFIX = 'fnl_tenant_ops_';

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

const marquinhosSeed = {
  metrics: {
    todaySales: 1840,
    openCash: 620,
    lowStock: 3,
  },
  cashFlow: [
    {
      id: 'cf1',
      date: '2026-08-14',
      kind: 'entrada',
      label: 'Vendas do turno',
      amount: 1840,
    },
    {
      id: 'cf2',
      date: '2026-08-14',
      kind: 'saida',
      label: 'Compra cerveja — Fornecedor Leste',
      amount: 420,
    },
    {
      id: 'cf3',
      date: '2026-08-13',
      kind: 'entrada',
      label: 'Vendas do turno',
      amount: 1510,
    },
  ],
  inventory: [
    { id: 'i1', name: 'Cerveja long neck', qty: 48, unit: 'un' },
    { id: 'i2', name: 'Gelo 5kg', qty: 6, unit: 'saco' },
    { id: 'i3', name: 'Limão', qty: 2, unit: 'kg' },
    { id: 'i4', name: 'Vodka 1L', qty: 4, unit: 'un' },
  ],
  suppliers: [
    { id: 's1', name: 'Distribuidora Leste', contact: 'leste@fornecedor.local' },
    { id: 's2', name: 'Hortifruti da Praça', contact: 'praca@horti.local' },
  ],
  team: [
    { id: 'e1', name: 'Ana Costa', role: 'Gerente de salão' },
    { id: 'e2', name: 'Pedro Lima', role: 'Barman fixo' },
  ],
};

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
    if (raw) return JSON.parse(raw);
  } catch {
    /* seed */
  }
  const seed = tenantId === 'marquinhos' ? structuredClone(marquinhosSeed) : emptyOps();
  localStorage.setItem(storageKey(tenantId), JSON.stringify(seed));
  return seed;
}

export function saveTenantOps(tenantId, store) {
  localStorage.setItem(storageKey(tenantId), JSON.stringify(store));
  return store;
}

export function nextOpsId(prefix) {
  return uid(prefix);
}
