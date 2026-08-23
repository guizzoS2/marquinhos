import { createTenantOpsApi, mirrorPlatformDailyToCashFlow } from '@fnl/dashboard';
import { isBarSession, readSession } from './session';

function requireOwner() {
  const session = readSession();
  if (!isBarSession(session) || !session.tenantId) {
    const error = new Error('Acesso restrito ao dono do bar.');
    error.code = 'FORBIDDEN';
    throw error;
  }
  return session;
}

export function getOwnerTenantOpsApi() {
  const session = requireOwner();
  return createTenantOpsApi(session.tenantId);
}

export function mirrorAcceptedDailyToCashFlow({ tenantId, proposalId, amount, freelaName, date }) {
  if (!tenantId) return null;
  return mirrorPlatformDailyToCashFlow(tenantId, {
    proposalId,
    amount,
    freelaName,
    date,
  });
}

export { subscribeTenantOpsStore } from '@fnl/dashboard';
