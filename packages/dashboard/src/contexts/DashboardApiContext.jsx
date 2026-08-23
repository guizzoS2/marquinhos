import { createContext, useContext, useMemo } from 'react';
import { createTenantOpsApi } from '../services/tenantOpsService';

const DashboardApiContext = createContext(null);

export function DashboardApiProvider({
  api,
  tenantId,
  tenantName = '',
  canManageStaff = true,
  children,
}) {
  const value = useMemo(() => {
    const resolved = api || (tenantId ? createTenantOpsApi(tenantId) : null);
    return {
      api: resolved,
      tenantId: resolved?.tenantId || tenantId || '',
      tenantName,
      canManageStaff,
    };
  }, [api, tenantId, tenantName, canManageStaff]);

  return (
    <DashboardApiContext.Provider value={value}>{children}</DashboardApiContext.Provider>
  );
}

export function useDashboardApi() {
  const ctx = useContext(DashboardApiContext);
  if (!ctx?.api) {
    throw new Error('useDashboardApi must be used within DashboardApiProvider');
  }
  return ctx;
}
