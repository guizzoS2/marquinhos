import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getFirestore, setDoc } from 'firebase/firestore';

function loadEnv(filePath) {
  try {
    const text = readFileSync(filePath, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (!match) continue;
      const key = match[1].trim();
      const value = match[2].trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    /* missing */
  }
}

const root = resolve(import.meta.dirname, '..');
loadEnv(resolve(root, '.env'));
loadEnv(resolve(root, 'apps/marquinhos/.env'));

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const ownerEmail = process.env.SEED_OWNER_EMAIL || 'fabiosilsantos71@gmail.com';
const ownerPassword = process.env.SEED_OWNER_PASSWORD;
const adminEmail = process.env.SEED_ADMIN_EMAIL || 'guilvieira409@gmail.com';
const adminPassword = process.env.SEED_ADMIN_PASSWORD;

if (!firebaseConfig.apiKey || !ownerPassword || !adminPassword) {
  console.error('Missing FIREBASE_* or SEED_*_PASSWORD in .env');
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function ensureAuthUser(email, password) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    return cred.user.uid;
  } catch (error) {
    if (error.code !== 'auth/email-already-in-use') throw error;
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return cred.user.uid;
  }
}

const platform = {
  kpis: {
    globalRevenue: 'R$ 0',
    activeSubscriptions: 1,
    registeredFreelas: 1,
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
      ownerEmail,
    },
  ],
  freelas: [],
  tickets: [],
  payments: [],
};

const freela = {
  profiles: [
    {
      id: 'f-guilvieira',
      name: 'Guil Vieira',
      email: adminEmail,
      role: '',
      photoDataUrl: '',
      bio: '',
      experience: '',
      tags: [],
      age: 18,
      minBaseRate: 0,
      rating: 0,
      reviewCount: 0,
      available: true,
    },
  ],
  jobs: [],
  proposals: [],
  rooms: [],
  messages: {},
  history: [],
  stripe: {
    connected: false,
    accountId: null,
    chargesEnabled: false,
    balance: { available: 0, pending: 0, currency: 'brl' },
  },
};

const owner = {
  catalog: [],
  profiles: {
    marquinhos: {
      tenantId: 'marquinhos',
      name: "Marquinho's",
      photoDataUrl: '',
      description: '',
      address: '',
      reviews: [],
    },
  },
  stripe: {
    marquinhos: {
      stripeCustomerId: null,
      dailies: [],
    },
  },
};

const emptyWeek = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map((day) => ({
  day,
  revenue: 0,
  expense: 0,
  highlight: day === 'SEX',
}));

const ops = {
  overview: { weeklyPerformance: emptyWeek, topSold: [], suggestion: null },
  cashFlow: {
    period: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    categories: [],
    incomes: [],
    expenses: [],
    summary: { revenue: 0, expenses: 0, result: 0 },
  },
  inventory: { filters: ['Todos'], items: [], metrics: [] },
  freelancers: { roles: ['Barman', 'Garçom', 'Cozinha'], people: [], dailies: [], summary: { costsToday: 'R$ 0', activeNow: '00' } },
  suppliers: { suppliers: [] },
  staff: { people: [] },
};

const showcase = {
  cards: [
    {
      id: 'b-marquinhos',
      kind: 'bar',
      displayName: "Marquinho's",
      specialty: 'Bar',
      rating: 0,
      initials: 'M',
      photoDataUrl: '',
    },
    {
      id: 'f-guilvieira',
      kind: 'freela',
      displayName: 'Guil V.',
      specialty: '',
      rating: 0,
      initials: 'GV',
      photoDataUrl: '',
    },
  ],
  updatedAt: new Date().toISOString(),
};

const now = new Date().toISOString();

const adminUid = await ensureAuthUser(adminEmail, adminPassword);
await setDoc(doc(db, 'users', adminUid), {
  uid: adminUid,
  email: adminEmail,
  name: 'Guil Vieira',
  roles: ['admin', 'freela'],
  freelaId: 'f-guilvieira',
  tenantId: null,
  createdAt: now,
  updatedAt: now,
});
await setDoc(doc(db, 'emails', adminEmail), { uid: adminUid, email: adminEmail });

await setDoc(doc(db, 'fnl', 'platform'), platform);
await setDoc(doc(db, 'fnl', 'freela'), freela);
await setDoc(doc(db, 'fnl', 'owner'), owner);
await setDoc(doc(db, 'fnl', 'showcase'), showcase);
await setDoc(doc(db, 'tenants', 'marquinhos', 'data', 'ops'), ops);

const ownerUid = await ensureAuthUser(ownerEmail, ownerPassword);
await setDoc(doc(db, 'users', ownerUid), {
  uid: ownerUid,
  email: ownerEmail,
  name: 'Fábio Santos',
  roles: ['owner'],
  tenantId: 'marquinhos',
  barRole: 'admin',
  title: 'Dono',
  company: "Marquinho's",
  createdAt: now,
  updatedAt: now,
});
await setDoc(doc(db, 'emails', ownerEmail), { uid: ownerUid, email: ownerEmail });

console.log('Seed ok', { adminUid, ownerUid });
process.exit(0);
