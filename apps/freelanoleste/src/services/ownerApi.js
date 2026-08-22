import { isBarStaffSession, isOwnerSession, readSession } from './session';
import { formatBrl } from './money';
import {
  getProposalPack,
  listProposals,
  postNegotiationMessage,
  resolveNegotiation,
  sendNegotiationCounter,
} from './negotiation';
import { loadPlatformStore, stripeStatusLabel } from './platformStore';
import { ensureBarProfile, FREELA_TAGS, loadOwnerStore, saveOwnerStore } from './ownerStore';

export { formatBrl, FREELA_TAGS, stripeStatusLabel };

const PORTAL_PATH = '/api/bar/stripe/customer-portal';

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

function assertTenantRoom(pack, tenantId) {
  if (!pack || pack.job?.tenantId !== tenantId) {
    return null;
  }
  return pack;
}

export function fetchMarketplace({ query = '', maxRate = '', minRating = '', tag = '' } = {}) {
  requireOwner();
  const q = String(query).trim().toLowerCase();
  const rateCap = maxRate === '' ? null : Number(maxRate);
  const ratingFloor = minRating === '' ? null : Number(minRating);
  return loadOwnerStore().catalog.filter((person) => {
    if (q) {
      const blob = `${person.name} ${person.role} ${person.bio} ${person.tags.join(' ')}`.toLowerCase();
      if (!blob.includes(q)) return false;
    }
    if (rateCap != null && Number.isFinite(rateCap) && person.minBaseRate > rateCap) {
      return false;
    }
    if (ratingFloor != null && Number.isFinite(ratingFloor) && person.rating < ratingFloor) {
      return false;
    }
    if (tag && !person.tags.includes(tag)) {
      return false;
    }
    return true;
  });
}

export function fetchPublicCatalog() {
  return loadOwnerStore().catalog;
}

export function fetchBarProfile() {
  const session = requireBarStaff();
  const store = ensureBarProfile(session.tenantId, session.name);
  return store.profiles[session.tenantId];
}

export function updateBarProfile(patch) {
  const session = requireOwner();
  const store = ensureBarProfile(session.tenantId, session.name);
  const current = store.profiles[session.tenantId];
  store.profiles[session.tenantId] = {
    ...current,
    name: String(patch.name || current.name).trim(),
    description: String(patch.description || '').trim(),
    address: String(patch.address || '').trim(),
    photoDataUrl:
      patch.photoDataUrl !== undefined ? patch.photoDataUrl : current.photoDataUrl,
  };
  saveOwnerStore(store);
  return store.profiles[session.tenantId];
}

export function fetchBarSubscription() {
  const session = requireBarStaff();
  const tenant = loadPlatformStore().tenants.find((item) => item.id === session.tenantId);
  const local = ensureBarProfile(session.tenantId, session.name).stripe[session.tenantId];
  const invoices = loadPlatformStore().payments.filter(
    (item) => item.kind === 'subscription' && item.party === tenant?.name
  );
  return {
    tenantId: session.tenantId,
    tenantName: tenant?.name || session.name,
    status: tenant?.stripeStatus || 'incomplete',
    stripeSubscriptionId: tenant?.stripeSubscriptionId || null,
    stripeCustomerId: local?.stripeCustomerId || null,
    invoices,
    active: tenant?.stripeStatus === 'active',
  };
}

export function fetchBarDailies() {
  const session = requireOwner();
  const local = ensureBarProfile(session.tenantId, session.name).stripe[session.tenantId];
  return [...(local?.dailies || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function fetchBarProposals() {
  const session = requireOwner();
  return listProposals().filter((item) => item.job?.tenantId === session.tenantId);
}

export function fetchBarProposalByRoom(roomId) {
  const session = requireOwner();
  return assertTenantRoom(getProposalPack(roomId), session.tenantId);
}

export function postBarChatMessage(roomId, text) {
  const session = requireOwner();
  if (!assertTenantRoom(getProposalPack(roomId), session.tenantId)) {
    throw new Error('Sala fora do seu tenant.');
  }
  return postNegotiationMessage(roomId, text, 'bar');
}

export function sendBarCounter(roomId, amount) {
  const session = requireOwner();
  if (!assertTenantRoom(getProposalPack(roomId), session.tenantId)) {
    throw new Error('Sala fora do seu tenant.');
  }
  return sendNegotiationCounter(roomId, amount, 'bar');
}

export function resolveBarProposal(roomId, decision) {
  const session = requireOwner();
  if (!assertTenantRoom(getProposalPack(roomId), session.tenantId)) {
    throw new Error('Sala fora do seu tenant.');
  }
  return resolveNegotiation(roomId, decision, 'bar');
}

export async function fetchCustomerPortalUrl() {
  requireOwner();
  try {
    const res = await fetch(PORTAL_PATH, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
    }
  } catch {
    /* portal Stripe */
  }
  const envUrl = import.meta.env.VITE_STRIPE_CUSTOMER_PORTAL_URL;
  if (envUrl) return envUrl;
  return 'https://billing.stripe.com/p/login/test';
}
