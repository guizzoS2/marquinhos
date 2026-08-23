import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { auth, isFirebaseConfigured } from './firebase';
import { getUserProfile, upsertUserProfile } from './firestoreService';
import { ROLE_ADMIN, isAdminRole } from './roles';

let currentSession = null;

export function getCurrentUser() {
  return currentSession;
}

export function getCurrentRole() {
  return getCurrentUser()?.role || ROLE_ADMIN;
}

function requireFirebase() {
  if (!isFirebaseConfigured() || !auth) {
    throw new Error('Firebase não configurado.');
  }
}

async function mapFirebaseUser(firebaseUser) {
  const profile = await getUserProfile(firebaseUser.uid);
  if (!profile) {
    await signOut(auth);
    throw new Error('Conta sem perfil neste bar.');
  }
  const roles = profile.roles || [];
  if (profile.tenantId !== 'marquinhos' || !roles.some((item) => item === 'owner' || item === 'staff')) {
    await signOut(auth);
    throw new Error('Este login não tem acesso a este bar.');
  }
  const barRole = profile.barRole || profile.role || ROLE_ADMIN;
  return {
    uid: firebaseUser.uid,
    email: profile.email || firebaseUser.email,
    name: profile.name || firebaseUser.displayName || 'Usuário',
    title: profile.title || 'Administrador',
    phone: profile.phone || '',
    company: profile.company || "Marquinho's",
    role: barRole,
    photoURL: profile.photoURL || firebaseUser.photoURL || '',
    tenantId: profile.tenantId,
    roles,
  };
}

export async function loginWithEmail({ email, password }) {
  requireFirebase();
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const user = await mapFirebaseUser(credential.user);
  currentSession = user;
  await upsertUserProfile(user.uid, user);
  return user;
}

export async function registerWithEmail({ email, password, name }) {
  requireFirebase();
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
  requireFirebase();
  await signOut(auth);
}

export function subscribeAuth(callback) {
  if (!isFirebaseConfigured() || !auth) {
    callback(null);
    return () => {};
  }

  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      currentSession = null;
      callback(null);
      return;
    }
    try {
      const user = await mapFirebaseUser(firebaseUser);
      currentSession = user;
      callback(user);
    } catch {
      currentSession = null;
      callback(null);
    }
  });
}

export async function saveProfile(uid, data) {
  requireFirebase();
  if (auth.currentUser && data.name) {
    await updateProfile(auth.currentUser, {
      displayName: data.name,
      photoURL: data.photoURL || auth.currentUser.photoURL,
    });
  }
  return upsertUserProfile(uid, data);
}

export { isAdminRole };
