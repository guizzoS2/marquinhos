import { listStaffAccounts } from '@fnl/dashboard';
import {
  assertEmailAvailable,
  isAdminSession,
  listOwnerAccounts,
  readSession,
  registerOwnerAccount,
} from './session';
import { formatBrl } from './money';
import {
  hasReview,
  listFreelaProfiles,
  loadFreelaStore,
  PROPOSAL_STATUS,
  proposalStatusLabel,
} from './freelaStore';
import { ensureBarProfile } from './ownerStore';
import {
  createTenant,
  loadPlatformStore,
  saveTenants,
  saveTickets,
  setTenantStripeStatus,
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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function startOfWeek(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? 6 : day - 1;
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - diff);
  return start;
}

function isThisWeek(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const start = startOfWeek();
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return date >= start && date < end;
}

function parseBrl(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const raw = String(value || '')
    .replace(/[^\d,-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const next = Number(raw);
  return Number.isFinite(next) ? next : 0;
}

function tenantById(tenants, tenantId) {
  return tenants.find((item) => item.id === tenantId) || null;
}

function enrichTenants(tenants, freelaStore, staff) {
  return tenants.map((tenant) => {
    const jobs = freelaStore.jobs.filter((job) => job.tenantId === tenant.id);
    const openJobs = jobs.filter(
      (job) =>
        !freelaStore.proposals.some(
          (proposal) => proposal.jobId === job.id && proposal.status === PROPOSAL_STATUS.ACEITA
        )
    ).length;
    return {
      ...tenant,
      jobCount: jobs.length,
      openJobs,
      staffCount: staff.filter((person) => person.tenantId === tenant.id).length,
    };
  });
}

export function fetchOverview() {
  requireAdmin();
  const store = loadPlatformStore();
  const freelaStore = loadFreelaStore();
  const profiles = listFreelaProfiles();
  const pastDue = store.tenants.filter((item) => item.stripeStatus === 'past_due').length;
  const incomplete = store.tenants.filter((item) => item.stripeStatus === 'incomplete').length;
  const activeSubscriptions = store.tenants.filter(
    (item) => item.stripeStatus === 'active'
  ).length;
  const today = todayIso();
  const nightsToday = freelaStore.jobs.filter((job) => job.date === today).length;
  const acceptedThisWeek = freelaStore.proposals.filter((proposal) => {
    if (proposal.status !== PROPOSAL_STATUS.ACEITA) return false;
    const job = freelaStore.jobs.find((item) => item.id === proposal.jobId);
    const history = freelaStore.history.find((item) => item.proposalId === proposal.id);
    return isThisWeek(history?.date || job?.date || proposal.createdAt);
  }).length;
  return {
    tenantCount: store.tenants.length,
    activeSubscriptions,
    registeredFreelas: profiles.length,
    pastDue,
    incomplete,
    openTickets: store.tickets.filter((item) => item.status === 'open').length,
    nightsToday,
    acceptedThisWeek,
    incompleteConnect: freelaStore.stripe?.connected ? 0 : profiles.length,
  };
}

export function fetchTenants() {
  requireAdmin();
  return enrichTenants(
    loadPlatformStore().tenants,
    loadFreelaStore(),
    listStaffAccounts()
  );
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
  return listFreelaProfiles();
}

export function activateTenant(tenantId) {
  requireAdmin();
  setTenantStripeStatus(tenantId, 'active');
  return fetchTenants();
}

export function blockTenant(tenantId) {
  requireAdmin();
  setTenantStripeStatus(tenantId, 'canceled');
  return fetchTenants();
}

export async function createTenantAsAdmin({ barName, slug, ownerName, ownerEmail, password }) {
  requireAdmin();
  await assertEmailAvailable(ownerEmail);
  if (!String(ownerName || '').trim() || !password) {
    throw new Error('Preencha nome do dono, e-mail e senha.');
  }
  const tenant = createTenant({
    name: barName,
    slug,
    ownerEmail,
  });
  await registerOwnerAccount(
    {
      email: ownerEmail,
      password,
      name: ownerName,
      tenantId: tenant.id,
    },
    { keepCurrentUser: true }
  );
  ensureBarProfile(tenant.id, tenant.name);
  return tenant;
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

export function fetchNightContracts() {
  requireAdmin();
  const platform = loadPlatformStore();
  const store = loadFreelaStore();
  return store.proposals.map((proposal) => {
    const job = store.jobs.find((item) => item.id === proposal.jobId) || null;
    const room = store.rooms.find((item) => item.id === proposal.roomId) || null;
    const history = store.history.find((item) => item.proposalId === proposal.id) || null;
    const tenant = tenantById(platform.tenants, job?.tenantId || room?.tenantId);
    const profile = store.profiles.find((item) => item.id === proposal.freelaId) || null;
    const payment = platform.payments.find(
      (item) => item.kind === 'split' && item.proposalId === proposal.id
    );
    const stripeId = history?.stripeTransferId || payment?.stripeId || 'mock';
    return {
      id: proposal.id,
      proposalId: proposal.id,
      roomId: proposal.roomId,
      date: job?.date || history?.date || '',
      tenantId: tenant?.id || job?.tenantId || null,
      tenantName: tenant?.name || job?.barName || room?.barName || '',
      stripeStatus: tenant?.stripeStatus || 'incomplete',
      freelaId: proposal.freelaId,
      freelaName: proposal.freelaName || profile?.name || '',
      title: job?.title || room?.title || '',
      amount: proposal.amount,
      lastAmount: proposal.lastAmount,
      isNegotiable: Boolean(proposal.isNegotiable),
      status: proposal.status,
      statusLabel: proposalStatusLabel[proposal.status] || proposal.status,
      stripeId,
      reviewUnlocked: proposal.status === PROPOSAL_STATUS.ACEITA,
      reviewGiven: hasReview(history?.reviewGiven),
      reviewReceived: hasReview(history?.reviewReceived),
      messages: store.messages[proposal.roomId] || [],
    };
  });
}

export function fetchPeople() {
  requireAdmin();
  const platform = loadPlatformStore();
  const freelaStore = loadFreelaStore();
  const owners = platform.tenants.map((tenant) => {
    const account = listOwnerAccounts().find(
      (item) => item.tenantId === tenant.id || item.email === tenant.ownerEmail
    );
    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      email: account?.email || tenant.ownerEmail,
      name: account?.name || '',
      hasLogin: Boolean(account),
    };
  });
  const staff = listStaffAccounts().map((person) => {
    const tenant = tenantById(platform.tenants, person.tenantId);
    return {
      id: person.id,
      name: person.name,
      email: person.email,
      title: person.title || '',
      permissions: person.permissions || [],
      tenantId: person.tenantId,
      tenantName: tenant?.name || person.tenantId,
    };
  });
  const stripe = freelaStore.stripe || {};
  const freelas = listFreelaProfiles().map((person) => ({
    id: person.id,
    name: person.name,
    role: person.role,
    email: person.email,
    minBaseRate: person.minBaseRate,
    rating: person.rating,
    reviewCount: person.reviewCount,
    stripeConnect: stripe.connected ? 'connected' : 'pending',
    stripeAccountId: stripe.accountId || null,
  }));
  return { owners, staff, freelas };
}

export function fetchFinanceRails() {
  requireAdmin();
  const platform = loadPlatformStore();
  const freelaStore = loadFreelaStore();
  const saas = platform.payments
    .filter((item) => item.kind === 'subscription')
    .map((item) => {
      const tenant =
        platform.tenants.find((row) => row.id === item.tenantId || row.name === item.party) ||
        null;
      return {
        ...item,
        tenantId: tenant?.id || item.tenantId || null,
        stripeStatus: tenant?.stripeStatus || item.status,
      };
    });

  const paymentSplits = platform.payments.filter((item) => item.kind === 'split');
  const used = new Set();
  const fromHistory = freelaStore.history.map((entry) => {
    const match = paymentSplits.find(
      (item) =>
        (item.proposalId && item.proposalId === entry.proposalId) ||
        (item.stripeId && item.stripeId === entry.stripeTransferId)
    );
    if (match) used.add(match.id);
    const profile = freelaStore.profiles.find((item) => item.id === entry.freelaId);
    const proposal = freelaStore.proposals.find((item) => item.id === entry.proposalId);
    const gross = match?.gross ?? entry.amountReceived ?? parseBrl(match?.amount);
    return {
      id: match?.id || `hist_${entry.id}`,
      kind: 'split',
      party: match?.party || proposal?.freelaName || profile?.name || '',
      tenantId: entry.tenantId,
      barName: entry.barName,
      title: entry.title,
      date: entry.date,
      proposalId: entry.proposalId || match?.proposalId || null,
      stripeId: match?.stripeId || entry.stripeTransferId || 'mock',
      status: match?.status || 'paid',
      amount: match?.amount || formatBrl(gross),
      gross,
      platformFee: match?.platformFee ?? null,
      freelaNet: match?.freelaNet ?? gross,
    };
  });
  const orphans = paymentSplits
    .filter((item) => !used.has(item.id))
    .map((item) => {
      const tenant = tenantById(platform.tenants, item.tenantId);
      const gross = item.gross ?? parseBrl(item.amount);
      return {
        ...item,
        barName: tenant?.name || item.party,
        gross,
        platformFee: item.platformFee ?? null,
        freelaNet: item.freelaNet ?? gross,
      };
    });

  const stripe = freelaStore.stripe || {};
  const balance = stripe.balance || {};
  return {
    saas,
    splits: [...fromHistory, ...orphans],
    payouts: {
      connected: Boolean(stripe.connected),
      accountId: stripe.accountId || null,
      chargesEnabled: Boolean(stripe.chargesEnabled),
      available: (Number(balance.available) || 0) / 100,
      pending: (Number(balance.pending) || 0) / 100,
      currency: balance.currency || 'brl',
    },
  };
}
