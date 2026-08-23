const STORE_KEY = 'fnl_freela_store';
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

const seedProfiles = [
  {
    id: 'f-demo',
    name: 'Freela demo',
    email: 'freela@freelanoleste.local',
    role: 'Barman',
    photoDataUrl: '',
    bio: 'Barman com experiência em casa noturna e eventos no leste.',
    experience: 'Casas noturnas e eventos no leste. Balcão sexta e sábado.',
    tags: ['barman', 'drinks'],
    age: 28,
    minBaseRate: 180,
    rating: 4.6,
    reviewCount: 8,
    available: true,
  },
  {
    id: 'f1',
    name: 'Ricardo Alves',
    email: 'ricardo@freelanoleste.local',
    role: 'Barman',
    photoDataUrl: '',
    bio: 'Drinks clássicos e serviço de festa. Conta Stripe Connect ativa.',
    experience: 'Festas e casas com carta clássica. Turnos longos.',
    tags: ['barman', 'eventos', 'drinks'],
    age: 32,
    minBaseRate: 220,
    rating: 4.9,
    reviewCount: 21,
    available: true,
  },
  {
    id: 'f2',
    name: 'Marina Santos',
    email: 'marina@freelanoleste.local',
    role: 'Garçonete',
    photoDataUrl: '',
    bio: 'Salão e terraço. Ritmo alto no fim de semana.',
    experience: 'Salão cheio e terraço. Fim de semana no leste.',
    tags: ['garçom', 'eventos'],
    age: 26,
    minBaseRate: 160,
    rating: 4.7,
    reviewCount: 14,
    available: true,
  },
  {
    id: 'f3',
    name: 'Lucas Silva',
    email: 'lucas@freelanoleste.local',
    role: 'Cozinha',
    photoDataUrl: '',
    bio: 'Apoio de linha e pré-serviço. Connect pendente.',
    experience: 'Pré-serviço e passagem de linha. Encerramento de turno.',
    tags: ['cozinha'],
    age: 29,
    minBaseRate: 190,
    rating: 4.8,
    reviewCount: 11,
    available: true,
  },
  {
    id: 'f4',
    name: 'Patrícia Moura',
    email: 'patricia@freelanoleste.local',
    role: 'Barwoman',
    photoDataUrl: '',
    bio: 'Carta de drinks autorais. Turnos noturnos.',
    experience: 'Carta autoral e turnos noturnos. Balcão e evento.',
    tags: ['barman', 'drinks'],
    age: 31,
    minBaseRate: 200,
    rating: 4.4,
    reviewCount: 6,
    available: true,
  },
];

const seed = {
  profiles: seedProfiles,
  jobs: [
    {
      id: 'job-mq-sexta',
      tenantId: 'marquinhos',
      barName: "Marquinho's",
      title: 'Barman — sexta à noite',
      date: '2026-08-22',
      suggestedRate: 250,
      description: 'Turno 18h–02h. Casa cheia, drinks clássicos.',
      visibility: 'open',
      invitedFreelaIds: [],
    },
    {
      id: 'job-bl-sabado',
      tenantId: 'bar-leste',
      barName: 'Bar do Leste',
      title: 'Garçom — sábado',
      date: '2026-08-23',
      suggestedRate: 180,
      description: 'Salão e terraço. Experiência com POS.',
      visibility: 'open',
      invitedFreelaIds: [],
    },
    {
      id: 'job-ca-cozinha',
      tenantId: 'casa-amarela',
      barName: 'Casa Amarela',
      title: 'Apoio de cozinha — domingo',
      date: '2026-08-24',
      suggestedRate: 220,
      description: 'Pré-serviço e passagem. Encerramento 23h.',
      visibility: 'open',
      invitedFreelaIds: [],
    },
    {
      id: 'job-mq-locked',
      tenantId: 'marquinhos',
      barName: "Marquinho's",
      title: 'Barman — sábado (valor travado)',
      date: '2026-08-29',
      suggestedRate: 240,
      description: 'Turno 19h–03h. Freela enviou valor travado.',
      visibility: 'open',
      invitedFreelaIds: [],
    },
  ],
  proposals: [
    {
      id: 'prop-open-1',
      jobId: 'job-bl-sabado',
      roomId: 'room-bl-1',
      freelaId: 'f-demo',
      freelaName: 'Freela demo',
      amount: 200,
      lastAmount: 190,
      isNegotiable: true,
      status: PROPOSAL_STATUS.CONTRA_PROPOSTA,
      createdAt: '2026-08-12T14:00:00.000Z',
    },
    {
      id: 'prop-locked-1',
      jobId: 'job-ca-cozinha',
      roomId: 'room-ca-1',
      freelaId: 'f-demo',
      freelaName: 'Freela demo',
      amount: 220,
      lastAmount: 220,
      isNegotiable: false,
      status: PROPOSAL_STATUS.PROPOSTA_ENVIADA,
      createdAt: '2026-08-13T10:00:00.000Z',
    },
    {
      id: 'prop-mq-1',
      jobId: 'job-mq-sexta',
      roomId: 'room-mq-1',
      freelaId: 'f-demo',
      freelaName: 'Freela demo',
      amount: 250,
      lastAmount: 250,
      isNegotiable: true,
      status: PROPOSAL_STATUS.PROPOSTA_ENVIADA,
      createdAt: '2026-08-14T11:00:00.000Z',
    },
    {
      id: 'prop-mq-locked',
      jobId: 'job-mq-locked',
      roomId: 'room-mq-2',
      freelaId: 'f1',
      freelaName: 'Ricardo Alves',
      amount: 240,
      lastAmount: 240,
      isNegotiable: false,
      status: PROPOSAL_STATUS.PROPOSTA_ENVIADA,
      createdAt: '2026-08-14T12:30:00.000Z',
    },
  ],
  rooms: [
    {
      id: 'room-bl-1',
      jobId: 'job-bl-sabado',
      proposalId: 'prop-open-1',
      tenantId: 'bar-leste',
      barName: 'Bar do Leste',
      title: 'Garçom — sábado',
      freelaName: 'Freela demo',
    },
    {
      id: 'room-ca-1',
      jobId: 'job-ca-cozinha',
      proposalId: 'prop-locked-1',
      tenantId: 'casa-amarela',
      barName: 'Casa Amarela',
      title: 'Apoio de cozinha — domingo',
      freelaName: 'Freela demo',
    },
    {
      id: 'room-mq-1',
      jobId: 'job-mq-sexta',
      proposalId: 'prop-mq-1',
      tenantId: 'marquinhos',
      barName: "Marquinho's",
      title: 'Barman — sexta à noite',
      freelaName: 'Freela demo',
    },
    {
      id: 'room-mq-2',
      jobId: 'job-mq-locked',
      proposalId: 'prop-mq-locked',
      tenantId: 'marquinhos',
      barName: "Marquinho's",
      title: 'Barman — sábado (valor travado)',
      freelaName: 'Ricardo Alves',
    },
  ],
  messages: {
    'room-bl-1': [
      {
        id: 'm1',
        from: 'freela',
        type: 'proposal',
        text: 'Proposta enviada: R$ 200,00',
        amount: 200,
        at: '2026-08-12T14:00:00.000Z',
      },
      {
        id: 'm2',
        from: 'bar',
        type: 'proposal',
        text: 'Contra-proposta do bar: R$ 190,00',
        amount: 190,
        at: '2026-08-12T14:12:00.000Z',
      },
      {
        id: 'm3',
        from: 'bar',
        type: 'text',
        text: 'Fechamos em 190 se puder chegar 30 min antes.',
        at: '2026-08-12T14:13:00.000Z',
      },
    ],
    'room-ca-1': [
      {
        id: 'm4',
        from: 'freela',
        type: 'proposal',
        text: 'Proposta com valor travado: R$ 220,00',
        amount: 220,
        at: '2026-08-13T10:00:00.000Z',
      },
      {
        id: 'm5',
        from: 'bar',
        type: 'text',
        text: 'Valor travado. Só aceitar ou recusar — sem contra-proposta.',
        at: '2026-08-13T10:08:00.000Z',
      },
    ],
    'room-mq-1': [
      {
        id: 'm6',
        from: 'freela',
        type: 'proposal',
        text: 'Proposta enviada: R$ 250,00',
        amount: 250,
        at: '2026-08-14T11:00:00.000Z',
      },
      {
        id: 'm7',
        from: 'freela',
        type: 'text',
        text: 'Consigo chegar 17h30 para montar o bar.',
        at: '2026-08-14T11:04:00.000Z',
      },
    ],
    'room-mq-2': [
      {
        id: 'm8',
        from: 'freela',
        type: 'proposal',
        text: 'Proposta com valor travado: R$ 240,00',
        amount: 240,
        at: '2026-08-14T12:30:00.000Z',
      },
    ],
  },
  history: [
    {
      id: 'h1',
      freelaId: 'f-demo',
      tenantId: 'marquinhos',
      barName: "Marquinho's",
      title: 'Barman — sexta',
      date: '2026-07-11',
      amountReceived: 250,
      stripeTransferId: 'tr_mq_711',
      reviewGiven: { rating: 5, comment: 'Casa organizada, pagamento Stripe no dia.' },
      reviewReceived: { rating: 4.8, comment: 'Pontual e ritmo alto no balcão.' },
    },
    {
      id: 'h2',
      freelaId: 'f-demo',
      tenantId: 'bar-leste',
      barName: 'Bar do Leste',
      title: 'Garçom — sábado',
      date: '2026-07-18',
      amountReceived: 180,
      stripeTransferId: 'tr_bl_718',
      reviewGiven: { rating: 4, comment: 'Equipe ok, salão apertado.' },
      reviewReceived: { rating: 4.5, comment: 'Bom atendimento no terraço.' },
    },
    {
      id: 'h3',
      freelaId: 'f-demo',
      tenantId: 'casa-amarela',
      barName: 'Casa Amarela',
      title: 'Cozinha — domingo',
      date: '2026-07-20',
      amountReceived: 220,
      stripeTransferId: 'tr_ca_720',
      reviewGiven: { rating: 5, comment: 'Mise en place clara.' },
      reviewReceived: { rating: 5, comment: 'Encaixou rápido na linha.' },
    },
    {
      id: 'h4',
      freelaId: 'f-demo',
      tenantId: 'marquinhos',
      barName: "Marquinho's",
      title: 'Barman — sábado',
      date: '2026-07-25',
      amountReceived: 260,
      stripeTransferId: 'tr_mq_725',
      reviewGiven: { rating: 4.5, comment: 'Som alto, mas operação redonda.' },
      reviewReceived: { rating: 4.2, comment: 'Drinks consistentes.' },
    },
    {
      id: 'h5',
      freelaId: 'f-demo',
      tenantId: 'bar-leste',
      barName: 'Bar do Leste',
      title: 'Garçom — sexta',
      date: '2026-08-01',
      amountReceived: 175,
      stripeTransferId: 'tr_bl_801',
      reviewGiven: { rating: 3.5, comment: 'Split Stripe ok; briefing atrasou.' },
      reviewReceived: { rating: 4, comment: 'Resolveu o pico das 23h.' },
    },
    {
      id: 'h6',
      freelaId: 'f-demo',
      tenantId: 'casa-amarela',
      barName: 'Casa Amarela',
      title: 'Apoio — sábado',
      date: '2026-08-02',
      amountReceived: 200,
      stripeTransferId: 'tr_ca_802',
      reviewGiven: { rating: 5, comment: 'Trato profissional.' },
      reviewReceived: { rating: 4.7, comment: 'Volta quando precisar.' },
    },
    {
      id: 'h7',
      freelaId: 'f-demo',
      tenantId: 'marquinhos',
      barName: "Marquinho's",
      title: 'Barman — quinta',
      date: '2026-08-07',
      amountReceived: 190,
      stripeTransferId: 'tr_mq_807',
      reviewGiven: { rating: 4, comment: 'Público tranquilo.' },
      reviewReceived: { rating: 4.6, comment: 'Fechou caixa certo.' },
    },
    {
      id: 'h8',
      freelaId: 'f-demo',
      tenantId: 'bar-leste',
      barName: 'Bar do Leste',
      title: 'Garçom — domingo',
      date: '2026-08-09',
      amountReceived: 160,
      stripeTransferId: 'tr_bl_809',
      reviewGiven: { rating: 4.2, comment: 'Almoço corrido, equipe ok.' },
      reviewReceived: { rating: 3.8, comment: 'Faltou pressa no começo.' },
    },
  ],
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
  return merged.map((item) => {
    const fallback = seed.profiles.find((seedItem) => seedItem.id === item.id) || {};
    return normalizeProfile(item, fallback);
  });
}

function inferTenantId(barName) {
  if (barName === "Marquinho's") return 'marquinhos';
  if (barName === 'Bar do Leste') return 'bar-leste';
  if (barName === 'Casa Amarela') return 'casa-amarela';
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
    freelaId: proposal.freelaId || 'f-demo',
    freelaName: proposal.freelaName || 'Freela demo',
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
    freelaId: item.freelaId || 'f-demo',
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
  localStorage.setItem(STORE_KEY, JSON.stringify(seed));
  return structuredClone(seed);
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
