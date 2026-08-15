const STORE_KEY = 'fnl_owner_store';

export const FREELA_TAGS = ['barman', 'garçom', 'cozinha', 'drinks', 'eventos'];

const seed = {
  catalog: [
    {
      id: 'f-demo',
      name: 'Freela demo',
      role: 'Barman',
      tags: ['barman', 'drinks'],
      minBaseRate: 180,
      rating: 4.6,
      reviewCount: 8,
      bio: 'Barman com experiência em casa noturna e eventos no leste.',
      available: true,
    },
    {
      id: 'f1',
      name: 'Ricardo Alves',
      role: 'Barman',
      tags: ['barman', 'eventos', 'drinks'],
      minBaseRate: 220,
      rating: 4.9,
      reviewCount: 21,
      bio: 'Drinks clássicos e serviço de festa. Conta Stripe Connect ativa.',
      available: true,
    },
    {
      id: 'f2',
      name: 'Marina Santos',
      role: 'Garçonete',
      tags: ['garçom', 'eventos'],
      minBaseRate: 160,
      rating: 4.7,
      reviewCount: 14,
      bio: 'Salão e terraço. Ritmo alto no fim de semana.',
      available: true,
    },
    {
      id: 'f3',
      name: 'Lucas Silva',
      role: 'Cozinha',
      tags: ['cozinha'],
      minBaseRate: 190,
      rating: 4.8,
      reviewCount: 11,
      bio: 'Apoio de linha e pré-serviço. Connect pendente.',
      available: true,
    },
    {
      id: 'f4',
      name: 'Patrícia Moura',
      role: 'Barwoman',
      tags: ['barman', 'drinks'],
      minBaseRate: 200,
      rating: 4.4,
      reviewCount: 6,
      bio: 'Carta de drinks autorais. Turnos noturnos.',
      available: true,
    },
  ],
  profiles: {
    marquinhos: {
      tenantId: 'marquinhos',
      name: "Marquinho's",
      photoDataUrl: '',
      description:
        'Bar no leste. Balcão cheio sexta e sábado. Freelas entram pelo marketplace da plataforma, não pelo caixa.',
      address: 'Rua do Leste, 100 — São Paulo',
      reviews: [
        {
          id: 'br1',
          from: 'Freela demo',
          rating: 5,
          comment: 'Casa organizada, pagamento Stripe no dia.',
          date: '2026-07-11',
        },
        {
          id: 'br2',
          from: 'Ricardo Alves',
          rating: 4.5,
          comment: 'Som alto, mas operação redonda.',
          date: '2026-07-25',
        },
        {
          id: 'br3',
          from: 'Freela demo',
          rating: 4,
          comment: 'Público tranquilo.',
          date: '2026-08-07',
        },
      ],
    },
  },
  stripe: {
    marquinhos: {
      stripeCustomerId: 'cus_mq_demo',
      dailies: [
        {
          id: 'pi_split_mq_1',
          freelaName: 'Ricardo Alves',
          title: 'Barman — sexta',
          date: '2026-07-11',
          amount: 250,
          stripeId: 'py_split_mq_711',
          status: 'paid',
        },
        {
          id: 'pi_split_mq_2',
          freelaName: 'Freela demo',
          title: 'Barman — sábado',
          date: '2026-07-25',
          amount: 260,
          stripeId: 'py_split_mq_725',
          status: 'paid',
        },
        {
          id: 'pi_split_mq_3',
          freelaName: 'Freela demo',
          title: 'Barman — quinta',
          date: '2026-08-07',
          amount: 190,
          stripeId: 'py_split_mq_807',
          status: 'paid',
        },
      ],
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
        catalog: parsed.catalog?.length ? parsed.catalog : seed.catalog,
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
