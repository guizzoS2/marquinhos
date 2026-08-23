import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { listStaffAccounts } from '@fnl/dashboard';
import { bootAuthenticatedCloud } from './boot';
import { auth, isFirebaseConfigured } from './firebase';
import {
  emailTaken,
  pickUserFields,
  readUserDoc,
  writeEmailLock,
  writeUserDoc,
} from './cloud';
import { createAuthUserRest, mapAuthError } from './identity';
import { listFreelaProfiles } from './freelaStore';
import { loadOwnerStore } from './ownerStore';
import { loadPlatformStore } from './platformStore';

const SESSION_KEY = 'fnl_session_v3';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function loadRegisteredFreelaAccounts() {
  return listFreelaProfiles().map((item) => ({
    email: item.email,
    name: item.name,
    id: item.id,
    role: 'freela',
  }));
}

export function loadRegisteredOwnerAccounts() {
  return listOwnerAccounts();
}

export function listOwnerAccounts() {
  const owner = loadOwnerStore();
  return loadPlatformStore().tenants.map((tenant) => ({
    email: tenant.ownerEmail,
    name: owner.profiles[tenant.id]?.name || '',
    tenantId: tenant.id,
    role: 'owner',
  }));
}

function knownEmails() {
  return [
    ...listOwnerAccounts().map((item) => item.email),
    ...loadRegisteredFreelaAccounts().map((item) => item.email),
    ...listStaffAccounts().map((item) => item.email),
  ];
}

export async function assertEmailAvailable(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    throw new Error('Informe o e-mail.');
  }
  if (knownEmails().includes(normalized)) {
    throw new Error('E-mail já cadastrado.');
  }
  if (await emailTaken(normalized)) {
    throw new Error('E-mail já cadastrado.');
  }
}

function profileToSession(profile, role) {
  return {
    uid: profile.uid || null,
    id: profile.freelaId || null,
    email: profile.email,
    role,
    name: profile.name,
    tenantId: profile.tenantId || null,
    permissions: role === 'staff' ? profile.permissions || [] : undefined,
  };
}

async function persistUser(uid, profile) {
  await writeUserDoc(uid, {
    ...pickUserFields(profile),
    uid,
    updatedAt: new Date().toISOString(),
  });
  await writeEmailLock(profile.email, uid);
}

export async function registerFreelaAccount({ email, password, name, id }) {
  const normalized = normalizeEmail(email);
  const trimmedName = String(name || '').trim();
  if (!normalized || !password || !trimmedName) {
    throw new Error('Preencha nome, e-mail e senha.');
  }
  if (!id) {
    throw new Error('Conta de freela sem id.');
  }
  await assertEmailAvailable(normalized);
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase não configurado.');
  }
  try {
    const credential = await createUserWithEmailAndPassword(auth, normalized, password);
    const profile = {
      email: normalized,
      name: trimmedName,
      roles: ['freela'],
      freelaId: id,
      tenantId: null,
      createdAt: new Date().toISOString(),
    };
    await persistUser(credential.user.uid, profile);
    return { ...profile, uid: credential.user.uid, id, role: 'freela' };
  } catch (error) {
    throw mapAuthError(error);
  }
}

export async function registerOwnerAccount(
  { email, password, name, tenantId },
  { keepCurrentUser } = {}
) {
  const normalized = normalizeEmail(email);
  const trimmedName = String(name || '').trim();
  const id = String(tenantId || '').trim();
  if (!normalized || !password || !trimmedName) {
    throw new Error('Preencha nome do dono, e-mail e senha.');
  }
  if (!id) {
    throw new Error('Conta de dono sem tenant.');
  }
  await assertEmailAvailable(normalized);
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase não configurado.');
  }
  try {
    const created = keepCurrentUser
      ? await createAuthUserRest({ email: normalized, password })
      : {
          uid: (await createUserWithEmailAndPassword(auth, normalized, password)).user.uid,
        };
    const profile = {
      email: normalized,
      name: trimmedName,
      roles: ['owner'],
      tenantId: id,
      barRole: 'admin',
      createdAt: new Date().toISOString(),
    };
    await persistUser(created.uid, profile);
    return { ...profile, uid: created.uid, role: 'owner' };
  } catch (error) {
    throw mapAuthError(error);
  }
}

export async function registerStaffAccount({
  email,
  password,
  name,
  tenantId,
  permissions,
  title,
}) {
  const normalized = normalizeEmail(email);
  await assertEmailAvailable(normalized);
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase não configurado.');
  }
  const created = await createAuthUserRest({ email: normalized, password });
  const profile = {
    email: normalized,
    name: String(name || '').trim(),
    roles: ['staff'],
    tenantId,
    title: title || 'Equipe',
    permissions: permissions || [],
    createdAt: new Date().toISOString(),
  };
  await persistUser(created.uid, profile);
  return { ...profile, uid: created.uid, role: 'staff' };
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

export async function authenticate({ email, password, role }) {
  const normalized = normalizeEmail(email);
  const acceptedRoles = role === 'owner' ? ['owner', 'staff', 'employee'] : [role];

  if (!isFirebaseConfigured()) {
    throw new Error('Firebase não configurado.');
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, normalized, password);
    const profile = await readUserDoc(credential.user.uid);
    if (!profile) {
      throw new Error('Conta sem perfil.');
    }
    const roles = profile.roles || [];
    const hit = acceptedRoles.find((item) => roles.includes(item));
    if (!hit) {
      await signOut(auth);
      throw new Error('Este login não tem acesso a esta área.');
    }
    const session = profileToSession({ ...profile, uid: credential.user.uid }, hit);
    writeSession(session);
    await bootAuthenticatedCloud();
    return session;
  } catch (error) {
    if (
      error.message === 'Este login não tem acesso a esta área.' ||
      error.message === 'Conta sem perfil.'
    ) {
      throw error;
    }
    throw mapAuthError(error);
  }
}

export async function logoutSession() {
  writeSession(null);
  if (isFirebaseConfigured() && auth) {
    await signOut(auth);
  }
}

export function subscribeSession(callback) {
  if (!isFirebaseConfigured() || !auth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      writeSession(null);
      callback(null);
      return;
    }

    try {
      const profile = await readUserDoc(firebaseUser.uid);
      if (!profile) {
        callback(readSession());
        return;
      }

      const stored = readSession();
      const roles = profile.roles || [];
      const preferred =
        stored?.uid === firebaseUser.uid && roles.includes(stored.role)
          ? stored.role
          : roles[0];
      if (!preferred) {
        callback(null);
        return;
      }

      const session = profileToSession({ ...profile, uid: firebaseUser.uid }, preferred);
      writeSession(session);
      await bootAuthenticatedCloud();
      callback(session);
    } catch (error) {
      console.warn('Firebase session', error);
      callback(readSession());
    }
  });
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
