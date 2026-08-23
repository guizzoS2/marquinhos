import { PATHS, peekDoc, writeCloudDoc } from './cloud';

export const FREELA_TAGS = ['barman', 'garçom', 'cozinha', 'drinks', 'eventos'];

export const OWNER_SEED = {
  catalog: [],
  profiles: {
    marquinhos: {
      tenantId: 'marquinhos',
      name: "Marquinho's",
      photoDataUrl: '',
      description: '',
      address: '',
      reviews: [],
    },
  },
  stripe: {
    marquinhos: {
      stripeCustomerId: null,
      dailies: [],
    },
  },
};

function defaultProfile(tenantId, name) {
  return {
    tenantId,
    name: name || 'Meu bar',
    photoDataUrl: '',
    description: '',
    address: '',
    reviews: [],
  };
}

export function loadOwnerStore() {
  const parsed = peekDoc(PATHS.owner, structuredClone(OWNER_SEED));
  return {
    catalog: Array.isArray(parsed.catalog) ? parsed.catalog : [],
    profiles: { ...OWNER_SEED.profiles, ...parsed.profiles },
    stripe: { ...OWNER_SEED.stripe, ...parsed.stripe },
  };
}

export function saveOwnerStore(store) {
  writeCloudDoc(PATHS.owner, store);
  return store;
}

export function ensureBarProfile(tenantId, name) {
  const store = loadOwnerStore();
  if (!store.profiles[tenantId]) {
    store.profiles[tenantId] = defaultProfile(tenantId, name);
    saveOwnerStore(store);
  }
  if (!store.stripe[tenantId]) {
    store.stripe[tenantId] = { stripeCustomerId: null, dailies: [] };
    saveOwnerStore(store);
  }
  return store;
}
