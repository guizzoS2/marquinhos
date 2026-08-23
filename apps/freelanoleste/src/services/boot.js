import {
  bindTenantOpsCloud,
  createEmptyTenantOps,
  replaceTenantOpsRoot,
} from '@fnl/dashboard';
import {
  PATHS,
  hydrateDoc,
  tenantOpsPath,
  writeCloudDoc,
} from './cloud';
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
  const platform = await hydrateDoc(PATHS.platform, structuredClone(PLATFORM_SEED));
  await hydrateDoc(PATHS.freela, structuredClone(FREELA_SEED));
  await hydrateDoc(PATHS.owner, structuredClone(OWNER_SEED));

  const tenantIds = (platform?.tenants || []).map((item) => item.id).filter(Boolean);
  const root = {};
  await Promise.all(
    tenantIds.map(async (tenantId) => {
      root[tenantId] = await hydrateDoc(
        tenantOpsPath(tenantId),
        createEmptyTenantOps(tenantId)
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
