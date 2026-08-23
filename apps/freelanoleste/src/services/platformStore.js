import { PATHS, peekDoc, writeCloudDoc } from './cloud';

const STORE_EVENT = 'fnl-platform-store';

export const PLATFORM_SEED = {
  kpis: {
    globalRevenue: 'R$ 0',
    activeSubscriptions: 1,
    registeredFreelas: 0,
    pastDue: 0,
  },
  tenants: [
    {
      id: 'marquinhos',
      name: "Marquinho's",
      slug: 'marquinhos',
      stripeStatus: 'active',
      stripeSubscriptionId: null,
      primaryHex: '#FFDB15',
      logoDataUrl: '',
      ownerEmail: 'fabiosilsantos71@gmail.com',
    },
  ],
  freelas: [],
  tickets: [],
  payments: [],
};

function readStore() {
  const parsed = peekDoc(PATHS.platform, structuredClone(PLATFORM_SEED));
  return {
    ...structuredClone(PLATFORM_SEED),
    ...parsed,
    tenants: Array.isArray(parsed.tenants) ? parsed.tenants : PLATFORM_SEED.tenants,
    freelas: Array.isArray(parsed.freelas) ? parsed.freelas : [],
    tickets: Array.isArray(parsed.tickets) ? parsed.tickets : [],
    payments: Array.isArray(parsed.payments) ? parsed.payments : [],
  };
}

function writeStore(next) {
  writeCloudDoc(PATHS.platform, next);
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
        stripeSubscriptionId: item.stripeSubscriptionId || null,
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
