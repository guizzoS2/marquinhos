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

function requireDb() {
  if (!isFirebaseConfigured() || !db) {
    throw new Error('Firebase não configurado.');
  }
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

export async function hydrateDoc(path, fallback, { force = false } = {}) {
  requireDb();
  const local = force ? null : readLocal(path);
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
    if (force) throw error;
  }
  const initial = local != null ? local : fallback;
  memory.set(path, initial);
  return initial;
}

const pendingWrites = [];

export function writeCloudDoc(path, data) {
  requireDb();
  memory.set(path, data);
  writeLocal(path, data);
  const task = setDoc(toRef(path), data).catch((error) => {
    console.error(`Firestore write ${path}`, error);
  });
  pendingWrites.push(task);
  return data;
}

export async function flushCloudWrites() {
  if (!pendingWrites.length) return;
  await Promise.all(pendingWrites.splice(0));
}

export function tenantOpsPath(tenantId) {
  return `tenants/${tenantId}/data/ops`;
}

const USER_FIELDS = [
  'email',
  'name',
  'roles',
  'role',
  'tenantId',
  'freelaId',
  'barRole',
  'title',
  'phone',
  'company',
  'photoURL',
  'permissions',
  'createdAt',
  'updatedAt',
  'uid',
];

export function pickUserFields(data) {
  const next = {};
  USER_FIELDS.forEach((key) => {
    if (data[key] !== undefined) next[key] = data[key];
  });
  return next;
}

export async function readUserDoc(uid) {
  requireDb();
  if (!uid) return null;
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export async function writeUserDoc(uid, data, { merge = false } = {}) {
  requireDb();
  const payload = pickUserFields({ ...data, uid });
  await setDoc(doc(db, 'users', uid), payload, { merge });
  return payload;
}

export function emailDocId(email) {
  return String(email || '').trim().toLowerCase();
}

export async function emailTaken(email) {
  requireDb();
  const snap = await getDoc(doc(db, 'emails', emailDocId(email)));
  return snap.exists();
}

export async function writeEmailLock(email, uid) {
  requireDb();
  const id = emailDocId(email);
  await setDoc(doc(db, 'emails', id), { uid, email: id });
}
