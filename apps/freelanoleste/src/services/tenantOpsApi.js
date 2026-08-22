import { isBarStaffSession, isOwnerSession, readSession } from './session';
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

function requireBarStaff() {
  const session = readSession();
  if (!isBarStaffSession(session) || !session.tenantId) {
    const error = new Error('Acesso restrito à equipe do bar.');
    error.code = 'FORBIDDEN';
    throw error;
  }
  return session;
}

function requireWritable(asOwner = false) {
  const session = asOwner ? requireOwner() : requireBarStaff();
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
  const lowStock = ops.inventory.filter(
    (item) => Number(item.qty) <= Number(item.minStock ?? 4)
  ).length;
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

export function addCashFlow({ kind, label, amount, date, importKey }) {
  const session = requireWritable(true);
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
      date: date || new Date().toISOString().slice(0, 10),
      kind,
      label: String(label).trim(),
      amount: value,
      importKey: importKey || null,
    },
    ...ops.cashFlow,
  ];
  saveTenantOps(session.tenantId, ops);
  return fetchCashFlow();
}

export function fetchInventory() {
  const session = requireBarStaff();
  return loadTenantOps(session.tenantId).inventory;
}

export function addInventory({ name, qty, unit, category, minStock }) {
  const session = requireWritable(false);
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
      category: String(category || 'Geral').trim() || 'Geral',
      minStock: Number.isFinite(Number(minStock)) ? Number(minStock) : 4,
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
  const session = requireWritable(true);
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
  const session = requireWritable(true);
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

export function importCashStatement(rows) {
  requireWritable(true);
  const selected = (rows || []).filter((row) => row.selected !== false);
  const existing = fetchCashFlow();
  const keys = new Set(
    existing.map(
      (row) =>
        row.importKey ||
        `${row.date}|${Math.round(Number(row.amount) * 100)}|${String(row.label || '')
          .trim()
          .toLowerCase()}`
    )
  );
  let created = 0;
  let skipped = 0;
  selected.forEach((row) => {
    const importKey =
      row.id ||
      `${row.date}|${row.amountCents}|${String(row.description || '').trim().toLowerCase()}`;
    if (keys.has(importKey)) {
      skipped += 1;
      return;
    }
    keys.add(importKey);
    addCashFlow({
      kind: row.kind,
      label: row.description,
      amount: Number(row.amountCents) / 100,
      date: row.date,
      importKey,
    });
    created += 1;
  });
  return { created, skipped, rows: fetchCashFlow() };
}
