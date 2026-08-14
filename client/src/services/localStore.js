const STORAGE_KEY = 'speakeasy_firestore_mirror';

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export const localStore = {
  async getDoc(path) {
    const store = readStore();
    const value = store[path];
    return value === undefined ? null : value;
  },

  async setDoc(path, data, { merge = false } = {}) {
    const store = readStore();
    store[path] = merge && store[path] ? { ...store[path], ...data } : data;
    writeStore(store);
    return store[path];
  },

  async updateDoc(path, data) {
    return this.setDoc(path, data, { merge: true });
  },

  async getCollection(prefix) {
    const store = readStore();
    return Object.entries(store)
      .filter(([key]) => key.startsWith(`${prefix}/`))
      .map(([path, data]) => ({ id: path.split('/').pop(), path, ...data }));
  },
};
