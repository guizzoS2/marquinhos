export const DASHBOARD_PACKAGE = '@fnl/dashboard';

export { createTenantOpsApi, mirrorPlatformDailyToCashFlow } from './services/tenantOpsService';
export { subscribeTenantOpsStore, listStaffAccounts } from './store/tenantOpsStore';
export {
  BAR_PERMISSIONS,
  DEFAULT_STAFF_PERMISSIONS,
  barPermissionForPath,
  firstAllowedBarPath,
} from './services/staffPermissions';
export { DashboardProviders } from './providers/DashboardProviders';
export { DashboardApiProvider, useDashboardApi } from './contexts/DashboardApiContext';
export { ModalProvider, useModal } from './contexts/ModalContext';
export { ToastProvider, useToast } from './contexts/ToastContext';
export { AppModal } from './components/ui/AppModal';
export { OverviewPage } from './pages/OverviewPage';
export { CashFlowPage } from './pages/CashFlowPage';
export { InventoryPage } from './pages/InventoryPage';
export { SuppliersPage } from './pages/SuppliersPage';
export { FreelancersPage, TeamPage } from './pages/TeamPage';
