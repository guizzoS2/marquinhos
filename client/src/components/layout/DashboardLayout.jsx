import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { AppModal } from '../ui/AppModal';

const placeholders = {
  '/': 'Buscar análises, equipe ou estoque...',
  '/fluxo-caixa': 'Buscar transações, fornecedores...',
  '/estoque': 'Buscar produto...',
  '/freelancers': 'Buscar freelancers...',
  '/perfil': 'Buscar configurações do perfil...',
};

export function DashboardLayout() {
  const { pathname } = useLocation();
  const searchPlaceholder = placeholders[pathname] || placeholders['/'];

  return (
    <div className="bg-white text-on-surface font-body antialiased selection:bg-primary min-h-screen">
      <Sidebar />
      <main className="ml-64 min-h-screen flex flex-col">
        <TopNavbar searchPlaceholder={searchPlaceholder} />
        <Outlet />
      </main>
      <AppModal />
    </div>
  );
}
