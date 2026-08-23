import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';
import {
  findStaffByCredentials,
  getUserProfile,
  upsertUserProfile,
} from './firestoreService';
import { ROLE_ADMIN, isAdminRole } from './roles';

const LOCAL_SESSION_KEY = 'speakeasy_local_session_v2';

const LOCAL_USERS = [
  {
    uid: 'local-owner-1',
    email: 'fabiosilsantos71@gmail.com',
    password: 'NoLeste71Silva*',
    name: 'Fábio Santos',
    title: 'Dono',
    phone: '',
    company: "Marquinho's",
    role: ROLE_ADMIN,
    photoURL: '',
  },
];

export const DEMO_USER = LOCAL_USERS[0];

let currentSession = null;

export function getCurrentUser() {
  return currentSession || readLocalSession();
}

export function getCurrentRole() {
  return getCurrentUser()?.role || ROLE_ADMIN;
}

function publicUser(user) {
  if (!user) return user;
  const { password: _ignored, ...safe } = user;
  return safe;
}

function migrateDemoUser(user) {
  if (!user) return user;
  const next = { ...user };
  let changed = false;
  if (next.name === 'Alex Rivera') {
    next.name = 'Fábio Santos';
    changed = true;
  }
  if (next.email === 'admin@speakeasy.local' || next.email === 'fabio@marquinhos.local') {
    next.email = 'fabiosilsantos71@gmail.com';
    changed = true;
  }
  if (!next.role) {
    next.role = ROLE_ADMIN;
    changed = true;
  }
  return changed ? next : user;
}

function readLocalSession() {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_SESSION_KEY) || 'null');
    const session = migrateDemoUser(raw);
    if (session !== raw) {
      writeLocalSession(session);
    }
    currentSession = session;
    return session;
  } catch {
    return null;
  }
}

function writeLocalSession(user) {
  currentSession = user;
  if (!user) {
    localStorage.removeItem(LOCAL_SESSION_KEY);
    return;
  }
  localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(user));
}

async function mapFirebaseUser(firebaseUser) {
  const profile = (await getUserProfile(firebaseUser.uid)) || {};
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    name: profile.name || firebaseUser.displayName || 'Usuário',
    title: profile.title || 'Administrador',
    phone: profile.phone || '',
    company: profile.company || "Marquinho's",
    role: profile.barRole || profile.role || ROLE_ADMIN,
    photoURL: profile.photoURL || firebaseUser.photoURL || '',
  };
}

function withoutPassword(user) {
  return publicUser(user);
}

export async function loginWithEmail({ email, password }) {
  const emailNorm = String(email || '').trim().toLowerCase();

  if (!isFirebaseConfigured()) {
    const local = LOCAL_USERS.find(
      (item) => item.email === emailNorm && item.password === password
    );
    const staff = local ? null : await findStaffByCredentials(emailNorm, password);
    const account = local ? withoutPassword(local) : staff;
    if (!account) {
      throw new Error('Credenciais inválidas.');
    }
    const profile = (await getUserProfile(account.uid)) || account;
    const user = withoutPassword({ ...account, ...profile, role: profile.role || account.role });
    writeLocalSession(user);
    await upsertUserProfile(user.uid, user);
    return user;
  }

  const credential = await signInWithEmailAndPassword(auth, email, password);
  const user = await mapFirebaseUser(credential.user);
  currentSession = user;
  await upsertUserProfile(user.uid, user);
  return user;
}

export async function registerWithEmail({ email, password, name }) {
  if (!isFirebaseConfigured()) {
    throw new Error('Cadastro disponível apenas com Firebase configurado.');
  }

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (name) {
    await updateProfile(credential.user, { displayName: name });
  }
  const user = await mapFirebaseUser(credential.user);
  await upsertUserProfile(user.uid, { ...user, name: name || user.name });
  return user;
}

export async function logoutUser() {
  currentSession = null;
  if (!isFirebaseConfigured()) {
    writeLocalSession(null);
    return;
  }
  await signOut(auth);
}

export function subscribeAuth(callback) {
  if (!isFirebaseConfigured()) {
    callback(readLocalSession());
    return () => {};
  }

  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      currentSession = null;
      callback(null);
      return;
    }
    const user = await mapFirebaseUser(firebaseUser);
    currentSession = user;
    callback(user);
  });
}

export async function saveProfile(uid, data) {
  if (!isFirebaseConfigured()) {
    const current = readLocalSession() || LOCAL_USERS[0];
    const next = withoutPassword({ ...current, ...data, uid, role: current.role });
    writeLocalSession(next);
    return upsertUserProfile(uid, next);
  }

  if (auth.currentUser && data.name) {
    await updateProfile(auth.currentUser, {
      displayName: data.name,
      photoURL: data.photoURL || auth.currentUser.photoURL,
    });
  }

  return upsertUserProfile(uid, data);
}

export { isAdminRole };
