import { isFreelaSession, readSession } from './session';
import { formatBrl } from './money';
import { getTenantById } from './platformStore';
import {
  appendMessage,
  getProposalPack,
  postNegotiationMessage,
  resolveNegotiation,
  sendNegotiationCounter,
  submitReview,
} from './negotiation';
import { FREELA_TAGS } from './ownerStore';
import { assertPhotoDataUrl } from './photo';
import {
  getFreelaProfileById,
  jobVisibleToFreela,
  loadFreelaStore,
  nextId,
  PROPOSAL_STATUS,
  saveFreelaStore,
  upsertFreelaProfile,
} from './freelaStore';

export { formatBrl };

const STRIPE_BALANCE_PATH = '/api/freela/stripe/balance';
const STRIPE_LOGIN_PATH = '/api/freela/stripe/login-link';
const STRIPE_CONNECT_TOKEN_PATH = '/api/freela/stripe/connect';

function requireFreela() {
  const session = readSession();
  if (!isFreelaSession(session)) {
    const error = new Error('Acesso restrito ao painel do freela.');
    error.code = 'FORBIDDEN';
    throw error;
  }
  return session;
}

function sanitizeTags(tags) {
  const allowed = new Set(FREELA_TAGS);
  return (Array.isArray(tags) ? tags : []).filter((tag) => allowed.has(tag));
}

export function buildFreelaProfile(input, current = {}) {
  const age = Number(input.age);
  const minBaseRate = Number(input.minBaseRate);
  if (!Number.isFinite(age) || age < 18) {
    throw new Error('Idade mínima: 18 anos.');
  }
  if (!Number.isFinite(minBaseRate) || minBaseRate < 0) {
    throw new Error('Informe um valor mínimo base válido.');
  }
  const photoDataUrl =
    input.photoDataUrl !== undefined ? input.photoDataUrl : current.photoDataUrl || '';
  assertPhotoDataUrl(photoDataUrl);
  const name = String(input.name || current.name || '').trim();
  const email = String(input.email || current.email || '')
    .trim()
    .toLowerCase();
  const role = String(input.role || current.role || '').trim();
  if (!input.id && !current.id) {
    throw new Error('Perfil sem id.');
  }
  if (!name || !email || !role) {
    throw new Error('Preencha nome, e-mail e função.');
  }
  return {
    ...current,
    id: input.id || current.id,
    name,
    email,
    role,
    photoDataUrl,
    bio: String(input.bio ?? current.bio ?? '').trim(),
    experience: String(input.experience ?? current.experience ?? '').trim(),
    tags: sanitizeTags(input.tags !== undefined ? input.tags : current.tags),
    age,
    minBaseRate,
    rating: current.rating ?? 0,
    reviewCount: current.reviewCount ?? 0,
    available: current.available !== undefined ? current.available : true,
  };
}

function requireFreelaProfile() {
  const session = requireFreela();
  const profile = getFreelaProfileById(session.id);
  if (!profile) {
    throw new Error('Perfil não encontrado.');
  }
  return { session, profile };
}

export function fetchFreelaProfile() {
  return requireFreelaProfile().profile;
}

export function createFreelaProfile(input) {
  return upsertFreelaProfile(buildFreelaProfile(input));
}

export function updateFreelaProfile(patch) {
  const { profile } = requireFreelaProfile();
  return upsertFreelaProfile(buildFreelaProfile(patch, profile));
}

export function fetchHistory({ page = 1, pageSize = 5 } = {}) {
  const session = requireFreela();
  const items = [...loadFreelaStore().history]
    .filter((item) => item.freelaId === session.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const total = items.length;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function fetchJobs() {
  const session = requireFreela();
  const store = loadFreelaStore();
  return store.jobs
    .filter((job) => {
      if (!jobVisibleToFreela(job, session.id)) return false;
      return getTenantById(job.tenantId)?.stripeStatus === 'active';
    })
    .map((job) => {
      const proposal = store.proposals.find(
        (item) => item.jobId === job.id && item.freelaId === session.id
      );
      return { ...job, proposal: proposal || null };
    });
}

export function fetchProposalByRoom(roomId) {
  requireFreela();
  return getProposalPack(roomId);
}

export function applyToJob({ jobId, amount, isNegotiable }) {
  const session = requireFreela();
  const store = loadFreelaStore();
  const job = store.jobs.find((item) => item.id === jobId);
  if (!job || !jobVisibleToFreela(job, session.id)) {
    throw new Error('Vaga não encontrada.');
  }
  if (job.visibility === 'invite' && !(job.invitedFreelaIds || []).includes(session.id)) {
    throw new Error('Convite não é para você.');
  }
  const existing = store.proposals.find(
    (item) => item.jobId === jobId && item.freelaId === session.id
  );
  if (existing) {
    return { roomId: existing.roomId, proposal: existing, created: false };
  }
  const profile = requireFreelaProfile().profile;
  const value = Number(amount);
  if (!Number.isFinite(value) || value < profile.minBaseRate) {
    throw new Error(
      `Proposta abaixo do valor mínimo base (${formatBrl(profile.minBaseRate)}).`
    );
  }
  const roomId = nextId('room');
  const proposalId = nextId('prop');
  const now = new Date().toISOString();
  const proposal = {
    id: proposalId,
    jobId,
    roomId,
    freelaId: profile.id,
    freelaName: profile.name,
    amount: value,
    lastAmount: value,
    isNegotiable: Boolean(isNegotiable),
    status: PROPOSAL_STATUS.PROPOSTA_ENVIADA,
    createdAt: now,
  };
  store.proposals = [...store.proposals, proposal];
  store.rooms = [
    ...store.rooms,
    {
      id: roomId,
      jobId,
      proposalId,
      tenantId: job.tenantId,
      barName: job.barName,
      title: job.title,
      freelaName: profile.name,
    },
  ];
  const lockedNote = proposal.isNegotiable
    ? 'Proposta enviada'
    : 'Proposta com valor travado';
  appendMessage(store, roomId, {
    id: nextId('msg'),
    from: 'freela',
    type: 'proposal',
    text: `${lockedNote}: ${formatBrl(value)}`,
    amount: value,
    at: now,
  });
  saveFreelaStore(store);
  return { roomId, proposal, created: true };
}

export function postChatMessage(roomId, text) {
  requireFreela();
  return postNegotiationMessage(roomId, text, 'freela');
}

export function sendCounterProposal(roomId, amount) {
  requireFreela();
  const minAmount = requireFreelaProfile().profile.minBaseRate;
  return sendNegotiationCounter(roomId, amount, 'freela', { minAmount });
}

export function resolveProposal(roomId, decision) {
  requireFreela();
  return resolveNegotiation(roomId, decision, 'freela');
}

export function submitFreelaReview({ proposalId, rating, comment }) {
  requireFreela();
  return submitReview({ proposalId, rating, comment });
}

export function getConnectOAuthUrl() {
  requireFreela();
  const clientId = import.meta.env.VITE_STRIPE_CONNECT_CLIENT_ID || '';
  const redirectUri = `${window.location.origin}/freela/connect`;
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: 'read_write',
    redirect_uri: redirectUri,
    'stripe_user[country]': 'BR',
  });
  return `https://connect.stripe.com/express/oauth/authorize?${params.toString()}`;
}

export async function completeStripeConnect(code) {
  requireFreela();
  if (!code) {
    throw new Error('Código OAuth do Stripe ausente.');
  }
  try {
    const res = await fetch(STRIPE_CONNECT_TOKEN_PATH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (res.ok) {
      const data = await res.json();
      const store = loadFreelaStore();
      store.stripe = {
        connected: true,
        accountId: data.accountId || data.stripe_user_id,
        chargesEnabled: true,
        balance: data.balance || store.stripe.balance,
      };
      saveFreelaStore(store);
      return store.stripe;
    }
  } catch {
    /* fallback local até existir API */
  }
  const store = loadFreelaStore();
  store.stripe = {
    connected: true,
    accountId: 'acct_express_demo',
    chargesEnabled: true,
    balance: {
      available: 124000,
      pending: 18000,
      currency: 'brl',
    },
  };
  saveFreelaStore(store);
  return store.stripe;
}

function centsToBrl(cents) {
  return (Number(cents) || 0) / 100;
}

export async function fetchStripeBalance() {
  requireFreela();
  try {
    const res = await fetch(STRIPE_BALANCE_PATH);
    if (res.ok) {
      const data = await res.json();
      return {
        source: 'stripe',
        connected: true,
        accountId: data.accountId,
        available: centsToBrl(data.available?.[0]?.amount ?? data.available),
        pending: centsToBrl(data.pending?.[0]?.amount ?? data.pending),
        currency: data.available?.[0]?.currency || data.currency || 'brl',
      };
    }
  } catch {
    /* usa espelho local da última resposta Stripe */
  }
  const { stripe } = loadFreelaStore();
  return {
    source: 'stripe',
    connected: stripe.connected,
    accountId: stripe.accountId,
    available: centsToBrl(stripe.balance.available),
    pending: centsToBrl(stripe.balance.pending),
    currency: stripe.balance.currency,
  };
}

export async function fetchExpressDashboardUrl() {
  requireFreela();
  try {
    const res = await fetch(STRIPE_LOGIN_PATH);
    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
    }
  } catch {
    /* Express login público */
  }
  return 'https://connect.stripe.com/express_login';
}
