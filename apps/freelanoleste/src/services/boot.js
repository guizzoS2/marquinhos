import {
  bindTenantOpsCloud,
  createEmptyTenantOps,
  replaceTenantOpsRoot,
} from '@fnl/dashboard';
import {
  PATHS,
  flushCloudWrites,
  hydrateDoc,
  tenantOpsPath,
  writeCloudDoc,
} from './cloud';
import { isFirebaseConfigured } from './firebase';
import { FREELA_SEED } from './freelaStore';
import { OWNER_SEED } from './ownerStore';
import { PLATFORM_SEED } from './platformStore';
import { fetchShowcase } from './showcase';

function persistTenantOps(root) {
  Object.entries(root || {}).forEach(([tenantId, data]) => {
    if (tenantId && data) {
      writeCloudDoc(tenantOpsPath(tenantId), data);
    }
  });
}

export async function bootCloud() {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase não configurado.');
  }
  await hydrateDoc(PATHS.showcase, { cards: [], updatedAt: new Date().toISOString() });
}

export async function bootAuthenticatedCloud() {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase não configurado.');
  }
  await flushCloudWrites();

  const platform = await hydrateDoc(PATHS.platform, structuredClone(PLATFORM_SEED), {
    force: true,
  });
  await hydrateDoc(PATHS.freela, structuredClone(FREELA_SEED), { force: true });
  await hydrateDoc(PATHS.owner, structuredClone(OWNER_SEED), { force: true });

  const tenantIds = (platform?.tenants || []).map((item) => item.id).filter(Boolean);
  const root = {};
  await Promise.all(
    tenantIds.map(async (tenantId) => {
      root[tenantId] = await hydrateDoc(
        tenantOpsPath(tenantId),
        createEmptyTenantOps(tenantId),
        { force: true }
      );
    })
  );
  replaceTenantOpsRoot(root);
  bindTenantOpsCloud(persistTenantOps);

  writeCloudDoc(PATHS.showcase, {
    cards: fetchShowcase(),
    updatedAt: new Date().toISOString(),
  });
}

export function ensureTenantOpsCloud(tenantId) {
  const id = String(tenantId || '').trim();
  if (!id) return;
  writeCloudDoc(tenantOpsPath(id), createEmptyTenantOps(id));
}
