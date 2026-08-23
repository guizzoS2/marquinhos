const STORE_KEY = 'fnl_owner_store_v2';

export const FREELA_TAGS = ['barman', 'garçom', 'cozinha', 'drinks', 'eventos'];

const seed = {
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
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        catalog: Array.isArray(parsed.catalog) ? parsed.catalog : [],
        profiles: { ...seed.profiles, ...parsed.profiles },
        stripe: { ...seed.stripe, ...parsed.stripe },
      };
    }
  } catch {
    /* seed */
  }
  localStorage.setItem(STORE_KEY, JSON.stringify(seed));
  return structuredClone(seed);
}

export function saveOwnerStore(store) {
  localStorage.setItem(STORE_KEY, JSON.stringify(store));
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
