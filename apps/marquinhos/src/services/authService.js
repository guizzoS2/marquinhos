import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';
import { getUserProfile, upsertUserProfile } from './firestoreService';

const LOCAL_SESSION_KEY = 'speakeasy_local_session';

const DEMO_USER = {
  uid: 'local-admin-1',
  email: 'fabio@marquinhos.local',
  name: 'Fábio Santos',
  title: 'Gerente Geral',
  phone: '+55 11 98888-0000',
  company: "Marquinho's",
  role: 'admin',
  photoURL:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCnAiBdvbFHIU_AojuM_Cn4E75QDQoOBroox5x_mmIuyPtLglF2xWJGOozljzpOGnCppjIVxXHVKxzvLzjMBQDIQzU2T4ZQ0hQbmldgvmx_xCvZ6sH5tSpX1P0eJLMQFfWQFi1FrZuH_Bme_XWdML3-fLQtPDh8iTKJ6xBuCYGqTvbWusWjrl0pJhurURv6caCcWDYKtdzuJ-tzU2NGYfkNcSWFMSBXl_e0hR-l2RSs7YJQzTfKuZlNceLdZlSHJUUGUR0RKgDSGPi_',
};

function migrateDemoUser(user) {
  if (!user) return user;
  const next = { ...user };
  let changed = false;
  if (next.name === 'Alex Rivera') {
    next.name = 'Fábio Santos';
    changed = true;
  }
  if (next.email === 'admin@speakeasy.local') {
    next.email = 'fabio@marquinhos.local';
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
    return session;
  } catch {
    return null;
  }
}

function writeLocalSession(user) {
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
    role: profile.role || 'admin',
    photoURL: profile.photoURL || firebaseUser.photoURL || DEMO_USER.photoURL,
  };
}

export async function loginWithEmail({ email, password }) {
  if (!isFirebaseConfigured()) {
    if (email !== DEMO_USER.email || password !== 'admin123') {
      throw new Error('Credenciais inválidas.');
    }
    const profile = (await getUserProfile(DEMO_USER.uid)) || DEMO_USER;
    const user = { ...DEMO_USER, ...profile };
    writeLocalSession(user);
    await upsertUserProfile(user.uid, user);
    return user;
  }

  const credential = await signInWithEmailAndPassword(auth, email, password);
  const user = await mapFirebaseUser(credential.user);
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
      callback(null);
      return;
    }
    const user = await mapFirebaseUser(firebaseUser);
    callback(user);
  });
}

export async function saveProfile(uid, data) {
  if (!isFirebaseConfigured()) {
    const current = readLocalSession() || DEMO_USER;
    const next = { ...current, ...data, uid };
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

export { DEMO_USER };
