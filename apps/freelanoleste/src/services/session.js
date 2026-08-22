const SESSION_KEY = 'fnl_session';

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
  const allowedRoles = role === 'owner' ? ['owner', 'employee'] : [role];
  const account = ACCOUNTS.find(
    (item) =>
      item.email === email.trim().toLowerCase() &&
      item.password === password &&
      allowedRoles.includes(item.role)
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

export function isEmployeeSession(session = readSession()) {
  return Boolean(session && session.role === 'employee' && session.tenantId);
}

export function isBarStaffSession(session = readSession()) {
  return isOwnerSession(session) || isEmployeeSession(session);
}

export function barHomeFor(session) {
  if (isEmployeeSession(session)) return '/bar/estoque';
  if (isOwnerSession(session)) return '/bar';
  return '/';
}
