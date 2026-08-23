const STORE_KEY = 'fnl_platform_store';
const STORE_EVENT = 'fnl-platform-store';

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
  window.dispatchEvent(new Event(STORE_EVENT));
}

export function slugifyTenant(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function subscribePlatformStore(callback) {
  const handler = () => callback(loadPlatformStore());
  window.addEventListener(STORE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(STORE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export function getTenantById(tenantId) {
  if (!tenantId) return null;
  return loadPlatformStore().tenants.find((item) => item.id === tenantId) || null;
}

export function createTenant({ name, slug, ownerEmail }) {
  const trimmedName = String(name || '').trim();
  const normalizedSlug = slugifyTenant(slug || trimmedName);
  const email = String(ownerEmail || '').trim().toLowerCase();
  if (!trimmedName) {
    throw new Error('Informe o nome do bar.');
  }
  if (!normalizedSlug) {
    throw new Error('Informe um slug.');
  }
  if (!email) {
    throw new Error('Informe o e-mail do dono.');
  }
  const store = readStore();
  if (store.tenants.some((item) => item.slug === normalizedSlug || item.id === normalizedSlug)) {
    throw new Error('Slug já em uso.');
  }
  const tenant = {
    id: normalizedSlug,
    name: trimmedName,
    slug: normalizedSlug,
    ownerEmail: email,
    stripeStatus: 'incomplete',
    stripeSubscriptionId: null,
    primaryHex: '',
    logoDataUrl: '',
  };
  const next = { ...store, tenants: [...store.tenants, tenant] };
  writeStore(next);
  return tenant;
}

export function setTenantStripeStatus(tenantId, stripeStatus) {
  const allowed = ['active', 'incomplete', 'canceled', 'past_due'];
  const nextStatus = allowed.includes(stripeStatus) ? stripeStatus : 'incomplete';
  const store = readStore();
  const tenants = store.tenants.map((item) => {
    if (item.id !== tenantId) return item;
    if (nextStatus === 'active') {
      return {
        ...item,
        stripeStatus: 'active',
        stripeSubscriptionId: item.stripeSubscriptionId || `sub_mock_${item.id}`,
      };
    }
    return {
      ...item,
      stripeStatus: nextStatus,
    };
  });
  const next = { ...store, tenants };
  writeStore(next);
  return next.tenants;
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

export function savePayments(payments) {
  const current = readStore();
  const next = { ...current, payments };
  writeStore(next);
  return next;
}

export function appendPlatformPayment(payment) {
  const current = readStore();
  if (
    payment?.proposalId &&
    current.payments.some((item) => item.kind === payment.kind && item.proposalId === payment.proposalId)
  ) {
    return current.payments;
  }
  return savePayments([...current.payments, payment]).payments;
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
