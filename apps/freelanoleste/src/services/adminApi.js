import { isAdminSession, readSession } from './session';
import {
  loadPlatformStore,
  saveTenants,
  saveTickets,
} from './platformStore';

function requireAdmin() {
  const session = readSession();
  if (!isAdminSession(session)) {
    const error = new Error('Acesso restrito ao admin da plataforma.');
    error.code = 'FORBIDDEN';
    throw error;
  }
  return session;
}

export function fetchOverview() {
  requireAdmin();
  const store = loadPlatformStore();
  return {
    kpis: store.kpis,
    tenantCount: store.tenants.length,
    openTickets: store.tickets.filter((item) => item.status === 'open').length,
  };
}

export function fetchTenants() {
  requireAdmin();
  return loadPlatformStore().tenants;
}

export function updateTenantBranding(tenantId, patch) {
  requireAdmin();
  const tenants = loadPlatformStore().tenants.map((item) => {
    if (item.id !== tenantId) return item;
    return {
      ...item,
      slug: patch.slug?.trim() || item.slug,
      primaryHex: patch.primaryHex?.trim() || item.primaryHex,
      logoDataUrl: patch.logoDataUrl !== undefined ? patch.logoDataUrl : item.logoDataUrl,
    };
  });
  return saveTenants(tenants).tenants;
}

export function fetchFreelas() {
  requireAdmin();
  return loadPlatformStore().freelas;
}

export function fetchTickets() {
  requireAdmin();
  return loadPlatformStore().tickets;
}

export function resolveTicket(ticketId) {
  requireAdmin();
  const tickets = loadPlatformStore().tickets.map((item) =>
    item.id === ticketId ? { ...item, status: 'resolved' } : item
  );
  return saveTickets(tickets).tickets;
}

export function fetchPayments() {
  requireAdmin();
  return loadPlatformStore().payments;
}
