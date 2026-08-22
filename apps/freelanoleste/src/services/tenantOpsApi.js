import { isOwnerSession, readSession } from './session';
import { formatBrl } from './money';
import { fetchBarSubscription } from './ownerApi';
import { loadTenantOps, nextOpsId, saveTenantOps } from './tenantOpsStore';

export { formatBrl };

function requireOwner() {
  const session = readSession();
  if (!isOwnerSession(session) || !session.tenantId) {
    const error = new Error('Acesso restrito ao dono do bar.');
    error.code = 'FORBIDDEN';
    throw error;
  }
  return session;
}

function requireWritable() {
  const session = requireOwner();
  const sub = fetchBarSubscription();
  if (!sub.active) {
    const error = new Error('Assinatura Stripe inativa. Operação bloqueada.');
    error.code = 'SUBSCRIPTION';
    throw error;
  }
  return session;
}

export function fetchOpsOverview() {
  const session = requireOwner();
  const ops = loadTenantOps(session.tenantId);
  const entradas = ops.cashFlow
    .filter((item) => item.kind === 'entrada')
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const saidas = ops.cashFlow
    .filter((item) => item.kind === 'saida')
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const lowStock = ops.inventory.filter((item) => Number(item.qty) <= 4).length;
  return {
    tenantId: session.tenantId,
    todaySales: formatBrl(ops.metrics.todaySales),
    cashBalance: formatBrl(entradas - saidas),
    lowStock,
    teamCount: ops.team.length,
    supplierCount: ops.suppliers.length,
  };
}

export function fetchCashFlow() {
  const session = requireOwner();
  return [...loadTenantOps(session.tenantId).cashFlow].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );
}

export function addCashFlow({ kind, label, amount }) {
  const session = requireWritable();
  const value = Number(amount);
  if (kind !== 'entrada' && kind !== 'saida') {
    throw new Error('Tipo inválido.');
  }
  if (!String(label || '').trim()) {
    throw new Error('Informe a descrição.');
  }
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Informe um valor válido.');
  }
  const ops = loadTenantOps(session.tenantId);
  ops.cashFlow = [
    {
      id: nextOpsId('cf'),
      date: new Date().toISOString().slice(0, 10),
      kind,
      label: String(label).trim(),
      amount: value,
    },
    ...ops.cashFlow,
  ];
  saveTenantOps(session.tenantId, ops);
  return fetchCashFlow();
}

export function fetchInventory() {
  const session = requireOwner();
  return loadTenantOps(session.tenantId).inventory;
}

export function addInventory({ name, qty, unit }) {
  const session = requireWritable();
  const quantity = Number(qty);
  if (!String(name || '').trim()) {
    throw new Error('Informe o item.');
  }
  if (!Number.isFinite(quantity) || quantity < 0) {
    throw new Error('Quantidade inválida.');
  }
  const ops = loadTenantOps(session.tenantId);
  ops.inventory = [
    ...ops.inventory,
    {
      id: nextOpsId('inv'),
      name: String(name).trim(),
      qty: quantity,
      unit: String(unit || 'un').trim(),
    },
  ];
  saveTenantOps(session.tenantId, ops);
  return fetchInventory();
}

export function fetchSuppliers() {
  const session = requireOwner();
  return loadTenantOps(session.tenantId).suppliers;
}

export function addSupplier({ name, contact }) {
  const session = requireWritable();
  if (!String(name || '').trim()) {
    throw new Error('Informe o fornecedor.');
  }
  const ops = loadTenantOps(session.tenantId);
  ops.suppliers = [
    ...ops.suppliers,
    {
      id: nextOpsId('sup'),
      name: String(name).trim(),
      contact: String(contact || '').trim(),
    },
  ];
  saveTenantOps(session.tenantId, ops);
  return fetchSuppliers();
}

export function fetchTeam() {
  const session = requireOwner();
  return loadTenantOps(session.tenantId).team;
}

export function addTeamMember({ name, role }) {
  const session = requireWritable();
  if (!String(name || '').trim() || !String(role || '').trim()) {
    throw new Error('Informe nome e função.');
  }
  const ops = loadTenantOps(session.tenantId);
  ops.team = [
    ...ops.team,
    {
      id: nextOpsId('tm'),
      name: String(name).trim(),
      role: String(role).trim(),
    },
  ];
  saveTenantOps(session.tenantId, ops);
  return fetchTeam();
}
