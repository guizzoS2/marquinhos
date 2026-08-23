import { useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { createTenantOpsApi, DashboardProviders } from '@fnl/dashboard';
import { useAuth } from '../../contexts/AuthContext';
import { fetchOwnerAccess } from '../../services/ownerApi';
import { assertEmailAvailable, registerStaffAccount } from '../../services/session';

export function BarOpsProviders() {
  const { user, isOwner } = useAuth();
  const access = useMemo(() => {
    try {
      return fetchOwnerAccess();
    } catch {
      return { tenantId: user?.tenantId, tenantName: user?.name || '' };
    }
  }, [user?.tenantId, user?.name]);

  const api = useMemo(() => {
    if (!access.tenantId) return null;
    const base = createTenantOpsApi(access.tenantId);
    return {
      ...base,
      async createStaff(payload) {
        await assertEmailAvailable(payload.email);
        const account = await registerStaffAccount({
          email: payload.email,
          password: payload.password,
          name: payload.name,
          tenantId: access.tenantId,
          permissions: payload.permissions,
          title: payload.title,
        });
        return base.createStaff({ ...payload, uid: account.uid });
      },
    };
  }, [access.tenantId]);

  if (!access.tenantId) return <Outlet />;

  return (
    <DashboardProviders
      api={api}
      tenantId={access.tenantId}
      tenantName={access.tenantName}
      canManageStaff={isOwner}
    >
      <Outlet />
    </DashboardProviders>
  );
}
