const SESSION_KEY = 'fnl_session';
const FREELA_ACCOUNTS_KEY = 'fnl_freela_accounts';
const OWNER_ACCOUNTS_KEY = 'fnl_owner_accounts';

const ACCOUNTS = [
  {
    email: 'admin@freelanoleste.local',
    password: 'admin123',
    role: 'admin',
    name: 'Admin FreelaNoLeste',
  },
  {
    email: 'dono@bar.local',
    password: 'demo123',
    role: 'owner',
    name: 'Dono do bar',
    tenantId: 'marquinhos',
  },
  {
    email: 'freela@freelanoleste.local',
    password: 'demo123',
    role: 'freela',
    name: 'Freela demo',
    id: 'f-demo',
  },
  {
    email: 'estoque@bar.local',
    password: 'demo123',
    role: 'employee',
    name: 'Estoquista do bar',
    tenantId: 'marquinhos',
    id: 'e-stock',
  },
];

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function readAccountList(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function loadRegisteredFreelaAccounts() {
  return readAccountList(FREELA_ACCOUNTS_KEY);
}

export function loadRegisteredOwnerAccounts() {
  return readAccountList(OWNER_ACCOUNTS_KEY);
}

export function listOwnerAccounts() {
  return [
    ...ACCOUNTS.filter((item) => item.role === 'owner'),
    ...loadRegisteredOwnerAccounts(),
  ];
}

function loadStaffAccounts() {
  try {
    const root = JSON.parse(localStorage.getItem('fnl_tenant_ops_v1') || '{}');
    return Object.entries(root).flatMap(([tenantId, data]) =>
      (data?.staff?.people || []).map((person) => ({
        email: person.email,
        password: person.password,
        role: 'staff',
        name: person.name,
        tenantId,
        id: person.id,
        permissions: person.permissions || [],
        title: person.title,
      }))
    );
  } catch {
    return [];
  }
}

function allAccounts() {
  return [
    ...ACCOUNTS,
    ...loadRegisteredFreelaAccounts(),
    ...loadRegisteredOwnerAccounts(),
    ...loadStaffAccounts(),
  ];
}

export function assertEmailAvailable(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new Error('Informe o e-mail.');
  }
  if (allAccounts().some((item) => item.email === normalized)) {
    throw new Error('E-mail já cadastrado.');
  }
}

export function registerFreelaAccount({ email, password, name, id }) {
  const normalized = normalizeEmail(email);
  const trimmedName = String(name || '').trim();
  if (!normalized || !password || !trimmedName) {
    throw new Error('Preencha nome, e-mail e senha.');
  }
  if (allAccounts().some((item) => item.email === normalized)) {
    throw new Error('E-mail já cadastrado.');
  }
  const account = {
    email: normalized,
    password: String(password),
    role: 'freela',
    name: trimmedName,
    id: id || null,
  };
  if (!account.id) {
    throw new Error('Conta de freela sem id.');
  }
  localStorage.setItem(
    FREELA_ACCOUNTS_KEY,
    JSON.stringify([...loadRegisteredFreelaAccounts(), account])
  );
  return account;
}

export function registerOwnerAccount({ email, password, name, tenantId }) {
  const normalized = normalizeEmail(email);
  const trimmedName = String(name || '').trim();
  const id = String(tenantId || '').trim();
  if (!normalized || !password || !trimmedName) {
    throw new Error('Preencha nome do dono, e-mail e senha.');
  }
  if (!id) {
    throw new Error('Conta de dono sem tenant.');
  }
  if (allAccounts().some((item) => item.email === normalized)) {
    throw new Error('E-mail já cadastrado.');
  }
  const account = {
    email: normalized,
    password: String(password),
    role: 'owner',
    name: trimmedName,
    tenantId: id,
  };
  localStorage.setItem(
    OWNER_ACCOUNTS_KEY,
    JSON.stringify([...loadRegisteredOwnerAccounts(), account])
  );
  return account;
}

export function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
  } catch {
    return null;
  }
}

export function writeSession(session) {
  if (!session) {
    sessionStorage.removeItem(SESSION_KEY);
    return;
  }
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function authenticate({ email, password, role }) {
  const normalized = normalizeEmail(email);
  const acceptedRoles = role === 'owner' ? ['owner', 'staff', 'employee'] : [role];
  const account = allAccounts().find(
    (item) =>
      item.email === normalized &&
      item.password === password &&
      acceptedRoles.includes(item.role)
  );
  if (!account) {
    throw new Error('Credenciais inválidas.');
  }
  const session = {
    id: account.id || null,
    email: account.email,
    role: account.role,
    name: account.name,
    tenantId: account.tenantId || null,
    permissions: account.role === 'staff' ? account.permissions || [] : undefined,
  };
  writeSession(session);
  return session;
}

export function isAdminSession(session = readSession()) {
  return Boolean(session && session.role === 'admin');
}

export function isFreelaSession(session = readSession()) {
  return Boolean(session && session.role === 'freela');
}

export function isOwnerSession(session = readSession()) {
  return Boolean(session && session.role === 'owner' && session.tenantId);
}

export function isStaffSession(session = readSession()) {
  return Boolean(
    session && (session.role === 'staff' || session.role === 'employee') && session.tenantId
  );
}

export function isEmployeeSession(session = readSession()) {
  return Boolean(session && session.role === 'employee' && session.tenantId);
}

export function isBarStaffSession(session = readSession()) {
  return isOwnerSession(session) || isStaffSession(session);
}

export function isBarSession(session = readSession()) {
  return isOwnerSession(session) || isStaffSession(session);
}

export function barHomeFor(session) {
  if (isOwnerSession(session)) return '/bar';
  if (isStaffSession(session)) return '/bar';
  return '/';
}
