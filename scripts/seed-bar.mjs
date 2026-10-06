import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { buildBarSeed } from './barSeedData.mjs';

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

const ownerEmail = process.env.SEED_OWNER_EMAIL;
const ownerPassword = process.env.SEED_OWNER_PASSWORD;

if (!firebaseConfig.apiKey || !ownerEmail || !ownerPassword) {
  console.error('Missing FIREBASE_* or SEED_OWNER_* in .env');
  process.exit(1);
}

const seeded = buildBarSeed(new Date());
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

await signInWithEmailAndPassword(auth, ownerEmail, ownerPassword);
const ref = doc(db, 'tenants', 'marquinhos', 'data', 'ops');
const snap = await getDoc(ref);
const current = snap.exists() ? snap.data() : {};
const next = {
  overview:
    current.overview && typeof current.overview === 'object'
      ? current.overview
      : { weeklyPerformance: [], topSold: [], suggestion: null },
  cashFlow: seeded.cashFlow,
  inventory: seeded.inventory,
  freelancers: seeded.freelancers,
  suppliers: seeded.suppliers,
  staff: current.staff && typeof current.staff === 'object' ? current.staff : { people: [] },
};

await setDoc(ref, JSON.parse(JSON.stringify(next)));

const paid = seeded.inventory.sales.filter((sale) => sale.status === 'paga').length;
const pastDailies = seeded.freelancers.dailies.filter((row) => row.status === 'paid').length;
console.log('Seed do bar gravado', {
  produtos: seeded.inventory.items.length,
  fornecedores: seeded.suppliers.suppliers.length,
  compras: seeded.inventory.purchases.length,
  freelancers: seeded.freelancers.people.length,
  diarias: seeded.freelancers.dailies.length,
  diariasPagas: pastDailies,
  vendasPagas: paid,
});
process.exit(0);
