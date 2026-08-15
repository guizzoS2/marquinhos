import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Shell } from './components/Shell';
import { RequireAdmin } from './components/auth/RequireAdmin';
import { RequireFreela } from './components/auth/RequireFreela';
import { RequireOwner } from './components/auth/RequireOwner';
import { AdminLayout } from './components/admin/AdminLayout';
import { FreelaLayout } from './components/freela/FreelaLayout';
import { BarLayout } from './components/bar/BarLayout';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { FreelaSignupPage } from './pages/FreelaSignupPage';
import { FreelasPage } from './pages/FreelasPage';
import { AdminOverviewPage } from './pages/admin/OverviewPage';
import { AdminTenantsPage } from './pages/admin/TenantsPage';
import { AdminUsersPage } from './pages/admin/UsersPage';
import { AdminFinancePage } from './pages/admin/FinancePage';
import { FreelaHistoryPage } from './pages/freela/HistoryPage';
import { FreelaProfilePage } from './pages/freela/ProfilePage';
import { FreelaJobsPage } from './pages/freela/JobsPage';
import { FreelaChatPage } from './pages/freela/ChatPage';
import { FreelaFinancePage } from './pages/freela/FinancePage';
import { FreelaConnectCallbackPage } from './pages/freela/ConnectCallbackPage';
import { BarMarketplacePage } from './pages/bar/MarketplacePage';
import { BarProfilePage } from './pages/bar/ProfilePage';
import { BarProposalsPage } from './pages/bar/ProposalsPage';
import { BarChatPage } from './pages/bar/ChatPage';
import { BarPaymentsPage } from './pages/bar/PaymentsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="cadastro-freela" element={<FreelaSignupPage />} />
            <Route path="freelas" element={<FreelasPage />} />
          </Route>
          <Route element={<RequireAdmin />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminOverviewPage />} />
              <Route path="tenants" element={<AdminTenantsPage />} />
              <Route path="usuarios" element={<AdminUsersPage />} />
              <Route path="financeiro" element={<AdminFinancePage />} />
            </Route>
          </Route>
          <Route element={<RequireFreela />}>
            <Route path="freela" element={<FreelaLayout />}>
              <Route index element={<FreelaHistoryPage />} />
              <Route path="vagas" element={<FreelaJobsPage />} />
              <Route path="perfil" element={<FreelaProfilePage />} />
              <Route path="chat/:roomId" element={<FreelaChatPage />} />
              <Route path="financeiro" element={<FreelaFinancePage />} />
              <Route path="financeiro/connect" element={<FreelaConnectCallbackPage />} />
            </Route>
          </Route>
          <Route element={<RequireOwner />}>
            <Route path="bar" element={<BarLayout />}>
              <Route index element={<BarMarketplacePage />} />
              <Route path="propostas" element={<BarProposalsPage />} />
              <Route path="perfil" element={<BarProfilePage />} />
              <Route path="chat/:roomId" element={<BarChatPage />} />
              <Route path="pagamentos" element={<BarPaymentsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
