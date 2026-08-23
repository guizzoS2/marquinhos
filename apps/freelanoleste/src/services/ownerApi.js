import { isBarSession, readSession } from './session';
import { formatBrl } from './money';
import {
  appendMessage,
  getProposalPack,
  listProposals,
  postNegotiationMessage,
  resolveNegotiation,
  sendNegotiationCounter,
  submitReview,
} from './negotiation';
import { loadPlatformStore, stripeStatusLabel } from './platformStore';
import {
  getFreelaProfileById,
  listFreelaProfiles,
  loadFreelaStore,
  nextId,
  PROPOSAL_STATUS,
  saveFreelaStore,
} from './freelaStore';
import { ensureBarProfile, FREELA_TAGS, loadOwnerStore, saveOwnerStore } from './ownerStore';

export { formatBrl, FREELA_TAGS, stripeStatusLabel };

const PORTAL_PATH = '/api/bar/stripe/customer-portal';

function requireOwner() {
  const session = readSession();
  if (!isBarSession(session) || !session.tenantId) {
    const error = new Error('Acesso restrito ao painel do bar.');
    error.code = 'FORBIDDEN';
    throw error;
  }
  return session;
}

function requireActiveOwner() {
  const session = requireOwner();
  const tenant = loadPlatformStore().tenants.find((item) => item.id === session.tenantId);
  if (!tenant || tenant.stripeStatus !== 'active') {
    const error = new Error('Tenant incompleto. Ative a assinatura para publicar ou convidar.');
    error.code = 'TENANT_INACTIVE';
    throw error;
  }
  return { session, tenant };
}

function assertTenantRoom(pack, tenantId) {
  if (!pack || pack.job?.tenantId !== tenantId) {
    return null;
  }
  return pack;
}

function matchesMarketplace(person, { query, maxRate, minRating, tag }) {
  const q = String(query).trim().toLowerCase();
  const rateCap = maxRate === '' ? null : Number(maxRate);
  const ratingFloor = minRating === '' ? null : Number(minRating);
  const tags = Array.isArray(person.tags) ? person.tags : [];
  if (q) {
    const blob = `${person.name} ${person.role} ${person.bio} ${person.experience || ''} ${tags.join(' ')}`.toLowerCase();
    if (!blob.includes(q)) return false;
  }
  if (rateCap != null && Number.isFinite(rateCap) && person.minBaseRate > rateCap) {
    return false;
  }
  if (ratingFloor != null && Number.isFinite(ratingFloor) && person.rating < ratingFloor) {
    return false;
  }
  if (tag && !tags.includes(tag)) {
    return false;
  }
  return true;
}

export function fetchMarketplace({ query = '', maxRate = '', minRating = '', tag = '' } = {}) {
  requireOwner();
  return listFreelaProfiles().filter((person) =>
    matchesMarketplace(person, { query, maxRate, minRating, tag })
  );
}

export function fetchPublicCatalog() {
  return listFreelaProfiles();
}

export function fetchOwnerAccess() {
  const session = requireOwner();
  const tenant = loadPlatformStore().tenants.find((item) => item.id === session.tenantId);
  return {
    tenantId: session.tenantId,
    tenantName: tenant?.name || session.name,
    status: tenant?.stripeStatus || 'incomplete',
    active: tenant?.stripeStatus === 'active',
    primaryHex: tenant?.primaryHex || '#FFDB15',
    logoDataUrl: tenant?.logoDataUrl || '',
  };
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

export function fetchBarJobs() {
  const session = requireOwner();
  return loadFreelaStore().jobs.filter((item) => item.tenantId === session.tenantId);
}

export function fetchBarProposals() {
  const session = requireOwner();
  return listProposals().filter((item) => item.job?.tenantId === session.tenantId);
}

export function publishOpenJob({ title, date, suggestedRate, description }) {
  const { session, tenant } = requireActiveOwner();
  const trimmedTitle = String(title || '').trim();
  const trimmedDate = String(date || '').trim();
  const trimmedDescription = String(description || '').trim();
  const rate = Number(suggestedRate);
  if (!trimmedTitle || !trimmedDate || !trimmedDescription) {
    throw new Error('Preencha função, data e texto da vaga.');
  }
  if (!Number.isFinite(rate) || rate < 0) {
    throw new Error('Informe um valor sugestão válido.');
  }
  const store = loadFreelaStore();
  const job = {
    id: nextId('job'),
    tenantId: session.tenantId,
    barName: tenant.name,
    title: trimmedTitle,
    date: trimmedDate,
    suggestedRate: rate,
    description: trimmedDescription,
    visibility: 'open',
    invitedFreelaIds: [],
  };
  store.jobs = [...store.jobs, job];
  saveFreelaStore(store);
  return job;
}

export function inviteFreela({ freelaId, date, amount, title }) {
  const { session, tenant } = requireActiveOwner();
  const profile = getFreelaProfileById(freelaId);
  if (!profile) {
    throw new Error('Freela não encontrado.');
  }
  const trimmedDate = String(date || '').trim();
  if (!trimmedDate) {
    throw new Error('Informe a data do convite.');
  }
  const value = Number(amount);
  if (!Number.isFinite(value) || value < profile.minBaseRate) {
    throw new Error(`Valor abaixo do piso (${formatBrl(profile.minBaseRate)}).`);
  }
  const store = loadFreelaStore();
  const job = {
    id: nextId('job'),
    tenantId: session.tenantId,
    barName: tenant.name,
    title: String(title || `${profile.role} — convite`).trim(),
    date: trimmedDate,
    suggestedRate: value,
    description: `Convite para ${profile.name}.`,
    visibility: 'invite',
    invitedFreelaIds: [profile.id],
  };
  const roomId = nextId('room');
  const proposalId = nextId('prop');
  const now = new Date().toISOString();
  const proposal = {
    id: proposalId,
    jobId: job.id,
    roomId,
    freelaId: profile.id,
    freelaName: profile.name,
    amount: value,
    lastAmount: value,
    isNegotiable: true,
    status: PROPOSAL_STATUS.PROPOSTA_ENVIADA,
    createdAt: now,
  };
  store.jobs = [...store.jobs, job];
  store.proposals = [...store.proposals, proposal];
  store.rooms = [
    ...store.rooms,
    {
      id: roomId,
      jobId: job.id,
      proposalId,
      tenantId: job.tenantId,
      barName: job.barName,
      title: job.title,
      freelaName: profile.name,
    },
  ];
  appendMessage(store, roomId, {
    id: nextId('msg'),
    from: 'bar',
    type: 'proposal',
    text: `Convite enviado: ${formatBrl(value)}`,
    amount: value,
    at: now,
  });
  saveFreelaStore(store);
  return { job, proposal, roomId };
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

export function submitBarReview({ proposalId, rating, comment }) {
  requireOwner();
  return submitReview({ proposalId, rating, comment });
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
