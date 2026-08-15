const STORE_KEY = 'fnl_platform_store';

const seed = {
  kpis: {
    globalRevenue: 'R$ 48.920',
    activeSubscriptions: 12,
    registeredFreelas: 37,
    pastDue: 2,
  },
  tenants: [
    {
      id: 'marquinhos',
      name: "Marquinho's",
      slug: 'marquinhos',
      stripeStatus: 'active',
      stripeSubscriptionId: 'sub_mq_001',
      primaryHex: '#FFDB15',
      logoDataUrl: '',
      ownerEmail: 'fabio@marquinhos.local',
    },
    {
      id: 'bar-leste',
      name: 'Bar do Leste',
      slug: 'bar-leste',
      stripeStatus: 'past_due',
      stripeSubscriptionId: 'sub_bl_014',
      primaryHex: '#111111',
      logoDataUrl: '',
      ownerEmail: 'contato@bardoleste.local',
    },
    {
      id: 'casa-amarela',
      name: 'Casa Amarela',
      slug: 'casa-amarela',
      stripeStatus: 'canceled',
      stripeSubscriptionId: 'sub_ca_008',
      primaryHex: '#E6C400',
      logoDataUrl: '',
      ownerEmail: 'ola@casaamarela.local',
    },
  ],
  freelas: [
    { id: 'f1', name: 'Ricardo Alves', role: 'Barman', email: 'ricardo@freela.local', stripeConnect: 'connected' },
    { id: 'f2', name: 'Marina Santos', role: 'Garçonete', email: 'marina@freela.local', stripeConnect: 'connected' },
    { id: 'f3', name: 'Lucas Silva', role: 'Cozinha', email: 'lucas@freela.local', stripeConnect: 'pending' },
  ],
  tickets: [
    {
      id: 't1',
      from: 'bar',
      tenantId: 'marquinhos',
      tenantName: "Marquinho's",
      freelaId: 'f1',
      freelaName: 'Ricardo Alves',
      type: 'review',
      subject: 'Review do freela após diária Stripe',
      status: 'open',
    },
    {
      id: 't2',
      from: 'freela',
      tenantId: 'bar-leste',
      tenantName: 'Bar do Leste',
      freelaId: 'f2',
      freelaName: 'Marina Santos',
      type: 'complaint',
      subject: 'Atraso no split Stripe da diária',
      status: 'open',
    },
    {
      id: 't3',
      from: 'freela',
      tenantId: 'marquinhos',
      tenantName: "Marquinho's",
      freelaId: 'f3',
      freelaName: 'Lucas Silva',
      type: 'review',
      subject: 'Review do bar após turno pago',
      status: 'resolved',
    },
  ],
  payments: [
    {
      id: 'pi_sub_01',
      kind: 'subscription',
      label: 'Assinatura SaaS',
      party: "Marquinho's",
      stripeId: 'in_mq_2201',
      amount: 'R$ 189,00',
      status: 'paid',
    },
    {
      id: 'pi_split_01',
      kind: 'split',
      label: 'Diária — split plataforma + freela',
      party: 'Ricardo Alves',
      stripeId: 'tr_split_441',
      amount: 'R$ 280,00',
      status: 'paid',
    },
    {
      id: 'pi_due_01',
      kind: 'subscription',
      label: 'Assinatura SaaS',
      party: 'Bar do Leste',
      stripeId: 'in_bl_2208',
      amount: 'R$ 189,00',
      status: 'past_due',
    },
  ],
};

function readStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return structuredClone(seed);
    return { ...structuredClone(seed), ...JSON.parse(raw) };
  } catch {
    return structuredClone(seed);
  }
}

function writeStore(next) {
  localStorage.setItem(STORE_KEY, JSON.stringify(next));
}

export function loadPlatformStore() {
  return readStore();
}

export function saveTenants(tenants) {
  const current = readStore();
  const next = { ...current, tenants };
  writeStore(next);
  return next;
}

export function saveTickets(tickets) {
  const current = readStore();
  const next = { ...current, tickets };
  writeStore(next);
  return next;
}

export const stripeStatusLabel = {
  active: 'Ativa',
  past_due: 'Inadimplente',
  canceled: 'Cancelada',
  incomplete: 'Incompleta',
};

export const connectLabel = {
  connected: 'Stripe Connect ativo',
  pending: 'Connect pendente',
};
