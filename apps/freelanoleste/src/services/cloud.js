import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

export const PATHS = {
  platform: 'fnl/platform',
  freela: 'fnl/freela',
  owner: 'fnl/owner',
  showcase: 'fnl/showcase',
};

const memory = new Map();

function cacheKey(path) {
  return `fnl_cloud:${path}`;
}

function toRef(path) {
  return doc(db, ...path.split('/').filter(Boolean));
}

function readLocal(path) {
  try {
    const raw = localStorage.getItem(cacheKey(path));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocal(path, data) {
  try {
    localStorage.setItem(cacheKey(path), JSON.stringify(data));
  } catch {
    /* quota */
  }
}

export function peekDoc(path, fallback) {
  if (memory.has(path)) return memory.get(path);
  const local = readLocal(path);
  if (local != null) {
    memory.set(path, local);
    return local;
  }
  memory.set(path, fallback);
  return fallback;
}

export async function hydrateDoc(path, fallback) {
  const local = readLocal(path);
  if (isFirebaseConfigured() && db) {
    try {
      const snap = await getDoc(toRef(path));
      if (snap.exists()) {
        const data = snap.data();
        memory.set(path, data);
        writeLocal(path, data);
        return data;
      }
      const initial = local != null ? local : fallback;
      if (initial != null) {
        memory.set(path, initial);
        writeLocal(path, initial);
        await setDoc(toRef(path), initial);
        return initial;
      }
    } catch (error) {
      console.warn(`Firestore hydrate ${path}`, error);
    }
  }
  const initial = local != null ? local : fallback;
  memory.set(path, initial);
  return initial;
}

export function writeCloudDoc(path, data) {
  memory.set(path, data);
  writeLocal(path, data);
  if (isFirebaseConfigured() && db) {
    setDoc(toRef(path), data).catch((error) => {
      console.error(`Firestore write ${path}`, error);
    });
  }
  return data;
}

export function tenantOpsPath(tenantId) {
  return `tenants/${tenantId}/data/ops`;
}

export async function readUserDoc(uid) {
  if (!isFirebaseConfigured() || !db || !uid) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export async function writeUserDoc(uid, data) {
  if (!isFirebaseConfigured() || !db) {
    throw new Error('Firebase não configurado.');
  }
  await setDoc(doc(db, 'users', uid), data);
  return data;
}

export function emailDocId(email) {
  return String(email || '').trim().toLowerCase();
}

export async function emailTaken(email) {
  if (!isFirebaseConfigured() || !db) return false;
  const snap = await getDoc(doc(db, 'emails', emailDocId(email)));
  return snap.exists();
}

export async function writeEmailLock(email, uid) {
  if (!isFirebaseConfigured() || !db) return;
  const id = emailDocId(email);
  await setDoc(doc(db, 'emails', id), { uid, email: id });
}
