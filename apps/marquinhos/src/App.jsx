import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ModalProvider } from './contexts/ModalContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { CashFlowPage } from './pages/CashFlowPage';
import { InventoryPage } from './pages/InventoryPage';
import { PdvPage } from './pages/PdvPage';
import { FreelancersPage } from './pages/FreelancersPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { SalesPage } from './pages/SalesPage';
import { StaffPage } from './pages/StaffPage';
import { ProfilePage } from './pages/ProfilePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <ModalProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route element={<ProtectedRoute />}>
                  <Route element={<DashboardLayout />}>
                    <Route index element={<OverviewPage />} />
                    <Route path="fluxo-caixa" element={<CashFlowPage />} />
                    <Route path="vendas" element={<SalesPage />} />
                    <Route path="compras" element={<PurchasesPage />} />
                    <Route path="estoque" element={<InventoryPage />} />
                    <Route path="catalogo" element={<Navigate to="/estoque?aba=promocoes" replace />} />
                    <Route path="pdv" element={<PdvPage />} />
                    <Route path="fornecedores" element={<Navigate to="/compras?aba=fornecedores" replace />} />
                    <Route path="freelancers" element={<FreelancersPage />} />
                    <Route path="equipe" element={<StaffPage />} />
                    <Route path="perfil" element={<ProfilePage />} />
                  </Route>
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </ModalProvider>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
