import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { DashboardApiProvider } from '../contexts/DashboardApiContext';
import { ModalProvider } from '../contexts/ModalContext';
import { ToastProvider } from '../contexts/ToastContext';
import { AppModal } from '../components/ui/AppModal';

export function DashboardProviders({ api, tenantId, tenantName, canManageStaff, children }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 15_000, retry: 0 },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <DashboardApiProvider
        api={api}
        tenantId={tenantId}
        tenantName={tenantName}
        canManageStaff={canManageStaff}
      >
        <ToastProvider>
          <ModalProvider>
            {children}
            <AppModal />
          </ModalProvider>
        </ToastProvider>
      </DashboardApiProvider>
    </QueryClientProvider>
  );
}
