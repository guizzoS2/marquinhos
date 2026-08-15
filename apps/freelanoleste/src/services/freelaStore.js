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

const seed = {
  profile: {
    id: 'f-demo',
    name: 'Freela demo',
    email: 'freela@freelanoleste.local',
    role: 'Barman',
    photoDataUrl: '',
    bio: 'Barman com experiência em casa noturna e eventos no leste.',
    age: 28,
    minBaseRate: 180,
  },
  jobs: [
    {
      id: 'job-mq-sexta',
      tenantId: 'marquinhos',
      barName: "Marquinho's",
      title: 'Barman — sexta à noite',
      date: '2026-08-22',
      suggestedRate: 250,
      description: 'Turno 18h–02h. Casa cheia, drinks clássicos.',
    },
    {
      id: 'job-bl-sabado',
      tenantId: 'bar-leste',
      barName: 'Bar do Leste',
      title: 'Garçom — sábado',
      date: '2026-08-23',
      suggestedRate: 180,
      description: 'Salão e terraço. Experiência com POS.',
    },
    {
      id: 'job-ca-cozinha',
      tenantId: 'casa-amarela',
      barName: 'Casa Amarela',
      title: 'Apoio de cozinha — domingo',
      date: '2026-08-24',
      suggestedRate: 220,
      description: 'Pré-serviço e passagem. Encerramento 23h.',
    },
    {
      id: 'job-mq-locked',
      tenantId: 'marquinhos',
      barName: "Marquinho's",
      title: 'Barman — sábado (valor travado)',
      date: '2026-08-29',
      suggestedRate: 240,
      description: 'Turno 19h–03h. Freela enviou valor travado.',
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

function migrate(store) {
  const jobs = mergeById(store.jobs, seed.jobs).map((job) => ({ ...job }));
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
  return { ...store, jobs, proposals, rooms, messages };
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
