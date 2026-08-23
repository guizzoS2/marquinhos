import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Shell } from './components/Shell';
import { RequireAdmin } from './components/auth/RequireAdmin';
import { RequireFreela } from './components/auth/RequireFreela';
import { RequireOwner } from './components/auth/RequireOwner';
import { AdminLayout } from './components/admin/AdminLayout';
import { FreelaLayout } from './components/freela/FreelaLayout';
import { BarLayout } from './components/bar/BarLayout';
import { BarOpsProviders } from './components/bar/OpsProviders';
import { HomePage } from './pages/HomePage';
import { AuthGatewayPage } from './pages/AuthGatewayPage';
import { RoleLoginPage } from './pages/LoginPage';
import { RoleSignupPage } from './pages/SignupPage';
import { FreelaSignupPage } from './pages/FreelaSignupPage';
import { BarSignupPage } from './pages/BarSignupPage';
import { PessoalPage } from './pages/PessoalPage';
import { AdminOverviewPage } from './pages/admin/OverviewPage';
import { AdminNightsPage } from './pages/admin/NightsPage';
import { AdminTenantsPage } from './pages/admin/TenantsPage';
import { AdminUsersPage } from './pages/admin/UsersPage';
import { AdminFinancePage } from './pages/admin/FinancePage';
import { FreelaHubPage } from './pages/freela/FreelaHubPage';
import { FreelaConnectCallbackPage } from './pages/freela/ConnectCallbackPage';
import { BarMarketplacePage } from './pages/bar/MarketplacePage';
import { BarProfilePage } from './pages/bar/ProfilePage';
import { BarProposalsPage } from './pages/bar/ProposalsPage';
import { BarChatPage } from './pages/bar/ChatPage';
import { BarPaymentsPage } from './pages/bar/PaymentsPage';
import {
  OverviewPage as BarOverviewPage,
  CashFlowPage as BarCashFlowPage,
  InventoryPage as BarInventoryPage,
  SuppliersPage as BarSuppliersPage,
  TeamPage as BarTeamPage,
} from '@fnl/dashboard';

function FreelaChatRedirect() {
  const { roomId } = useParams();
  return <Navigate to={`/freela?chat=${encodeURIComponent(roomId || '')}`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<HomePage />} />
            <Route path="login" element={<AuthGatewayPage />} />
            <Route path="login/bar" element={<RoleLoginPage role="owner" />} />
            <Route path="login/freela" element={<RoleLoginPage role="freela" />} />
            <Route path="login/admin" element={<RoleLoginPage role="admin" />} />
            <Route path="cadastro/bar" element={<RoleSignupPage role="owner" />} />
            <Route path="cadastro/freela" element={<RoleSignupPage role="freela" />} />
            <Route path="cadastro-freela" element={<FreelaSignupPage />} />
            <Route path="cadastro-bar" element={<BarSignupPage />} />
            <Route path="pessoal" element={<PessoalPage />} />
            <Route path="freelas" element={<Navigate to="/pessoal" replace />} />
          </Route>
          <Route element={<RequireAdmin />}>
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminOverviewPage />} />
              <Route path="noites" element={<AdminNightsPage />} />
              <Route path="tenants" element={<AdminTenantsPage />} />
              <Route path="usuarios" element={<AdminUsersPage />} />
              <Route path="financeiro" element={<AdminFinancePage />} />
            </Route>
          </Route>
          <Route element={<RequireFreela />}>
            <Route path="freela/connect" element={<FreelaConnectCallbackPage />} />
            <Route path="freela" element={<FreelaLayout />}>
              <Route index element={<FreelaHubPage />} />
              <Route path="vagas" element={<Navigate to="/freela" replace />} />
              <Route path="perfil" element={<Navigate to="/freela" replace />} />
              <Route path="financeiro" element={<Navigate to="/freela?finance=open" replace />} />
              <Route path="financeiro/connect" element={<Navigate to="/freela/connect" replace />} />
              <Route path="chat/:roomId" element={<FreelaChatRedirect />} />
            </Route>
          </Route>
          <Route element={<RequireOwner />}>
            <Route element={<BarOpsProviders />}>
              <Route path="bar" element={<BarLayout />}>
                <Route index element={<BarOverviewPage />} />
                <Route path="caixa" element={<BarCashFlowPage />} />
                <Route path="fluxo-caixa" element={<Navigate to="/bar/caixa" replace />} />
                <Route path="estoque" element={<BarInventoryPage />} />
                <Route path="fornecedores" element={<BarSuppliersPage />} />
                <Route path="equipe" element={<BarTeamPage />} />
                <Route path="vitrine" element={<BarMarketplacePage />} />
                <Route path="freelas" element={<Navigate to="/bar/vitrine" replace />} />
                <Route path="propostas" element={<BarProposalsPage />} />
                <Route path="perfil" element={<BarProfilePage />} />
                <Route path="chat/:roomId" element={<BarChatPage />} />
                <Route path="pagamentos" element={<BarPaymentsPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
