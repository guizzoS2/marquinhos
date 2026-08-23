import { loadRegisteredFreelaAccounts } from './session';

const STORE_KEY = 'fnl_freela_store_v2';
const STORE_EVENT = 'fnl-freela-store';

export const PROPOSAL_STATUS = {
  PROPOSTA_ENVIADA: 'PROPOSTA_ENVIADA',
  CONTRA_PROPOSTA: 'CONTRA_PROPOSTA',
  ACEITA: 'ACEITA',
  RECUSADA: 'RECUSADA',
};

export const proposalStatusLabel = {
  PROPOSTA_ENVIADA: 'Proposta enviada',
  CONTRA_PROPOSTA: 'Contra-proposta',
  ACEITA: 'Aceita',
  RECUSADA: 'Recusada',
};

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

const seed = {
  profiles: [
    {
      id: 'f-guilvieira',
      name: 'Guil Vieira',
      email: 'guilvieira409@gmail.com',
      role: '',
      photoDataUrl: '',
      bio: '',
      experience: '',
      tags: [],
      age: 18,
      minBaseRate: 0,
      rating: 0,
      reviewCount: 0,
      available: true,
    },
  ],
  jobs: [],
  proposals: [],
  rooms: [],
  messages: {},
  history: [],
  stripe: {
    connected: false,
    accountId: null,
    chargesEnabled: false,
    balance: {
      available: 0,
      pending: 0,
      currency: 'brl',
    },
  },
};

function emitChange() {
  window.dispatchEvent(new Event(STORE_EVENT));
}

function mergeById(current = [], extras = []) {
  const map = new Map(current.map((item) => [item.id, item]));
  extras.forEach((item) => {
    if (!map.has(item.id)) {
      map.set(item.id, item);
    }
  });
  return [...map.values()];
}

function normalizeProfile(item = {}, fallback = {}) {
  return {
    id: item.id || fallback.id,
    name: item.name || fallback.name || 'Freela',
    email: String(item.email || fallback.email || '').trim().toLowerCase(),
    role: item.role || fallback.role || '',
    photoDataUrl: item.photoDataUrl || fallback.photoDataUrl || '',
    bio: item.bio || fallback.bio || '',
    experience: item.experience || fallback.experience || '',
    tags: Array.isArray(item.tags) ? item.tags : fallback.tags || [],
    age: Number.isFinite(Number(item.age)) ? Number(item.age) : fallback.age ?? 18,
    minBaseRate: Number.isFinite(Number(item.minBaseRate))
      ? Number(item.minBaseRate)
      : fallback.minBaseRate ?? 0,
    rating: item.rating ?? fallback.rating ?? 0,
    reviewCount: item.reviewCount ?? fallback.reviewCount ?? 0,
    available: item.available !== undefined ? item.available : fallback.available ?? true,
  };
}

function hydrateRegisteredProfiles(profiles) {
  const accounts = loadRegisteredFreelaAccounts();
  return accounts.reduce((list, account) => {
    const exists = list.some((item) => item.id === account.id || item.email === account.email);
    if (exists) return list;
    return [
      ...list,
      normalizeProfile({
        id: account.id,
        name: account.name,
        email: account.email,
      }),
    ];
  }, profiles);
}

function migrateProfiles(store) {
  const fromList = Array.isArray(store.profiles) ? store.profiles : [];
  const merged = mergeById(fromList, seed.profiles);
  if (store.profile?.id) {
    const idx = merged.findIndex((item) => item.id === store.profile.id);
    if (idx >= 0) {
      merged[idx] = { ...merged[idx], ...store.profile };
    } else {
      merged.push(store.profile);
    }
  }
  return hydrateRegisteredProfiles(
    merged.map((item) => {
      const fallback = seed.profiles.find((seedItem) => seedItem.id === item.id) || {};
      return normalizeProfile(item, fallback);
    })
  );
}

function inferTenantId(barName) {
  if (barName === "Marquinho's") return 'marquinhos';
  return null;
}

export function jobVisibleToFreela(job, freelaId) {
  if (!job) return false;
  if (job.visibility === 'invite') {
    return (job.invitedFreelaIds || []).includes(freelaId);
  }
  return true;
}

export function hasReview(review) {
  return Boolean(review && Number(review.rating) > 0);
}

function migrate(store) {
  const jobs = mergeById(store.jobs, seed.jobs).map((job) => ({
    ...job,
    visibility: job.visibility === 'invite' ? 'invite' : 'open',
    invitedFreelaIds: Array.isArray(job.invitedFreelaIds) ? job.invitedFreelaIds : [],
  }));
  const proposals = mergeById(store.proposals, seed.proposals).map((proposal) => ({
    ...proposal,
    freelaId: proposal.freelaId || '',
    freelaName: proposal.freelaName || 'Freela',
  }));
  const rooms = mergeById(store.rooms, seed.rooms).map((room) => {
    const job = jobs.find((item) => item.id === room.jobId);
    const proposal = proposals.find((item) => item.id === room.proposalId);
    return {
      ...room,
      tenantId: room.tenantId || job?.tenantId || null,
      freelaName: room.freelaName || proposal?.freelaName || 'Freela',
    };
  });
  const messages = { ...seed.messages, ...store.messages };
  const history = mergeById(store.history, seed.history).map((item) => ({
    ...item,
    freelaId: item.freelaId || '',
    tenantId: item.tenantId || inferTenantId(item.barName),
    reviewGiven: item.reviewGiven || null,
    reviewReceived: item.reviewReceived || null,
  }));
  const profiles = migrateProfiles(store);
  const next = { ...store, jobs, proposals, rooms, messages, history, profiles };
  delete next.profile;
  return next;
}

export function loadFreelaStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const migrated = migrate(JSON.parse(raw));
      localStorage.setItem(STORE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch {
    /* seed */
  }
  const initial = migrate(structuredClone(seed));
  localStorage.setItem(STORE_KEY, JSON.stringify(initial));
  return initial;
}

export function saveFreelaStore(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
  emitChange();
  return store;
}

export function subscribeFreelaStore(callback) {
  const handler = () => callback(loadFreelaStore());
  window.addEventListener(STORE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(STORE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export function nextId(prefix) {
  return uid(prefix);
}

export function listFreelaProfiles() {
  return loadFreelaStore().profiles;
}

export function getFreelaProfileById(id) {
  if (!id) return null;
  return loadFreelaStore().profiles.find((item) => item.id === id) || null;
}

export function upsertFreelaProfile(profile) {
  const store = loadFreelaStore();
  const normalized = normalizeProfile(profile);
  const idx = store.profiles.findIndex((item) => item.id === normalized.id);
  if (idx >= 0) {
    store.profiles[idx] = { ...store.profiles[idx], ...normalized };
  } else {
    store.profiles = [...store.profiles, normalized];
  }
  saveFreelaStore(store);
  return store.profiles.find((item) => item.id === normalized.id);
}
