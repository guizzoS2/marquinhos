import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { AppModal } from '../ui/AppModal';

const placeholders = {
  '/': 'Buscar análises, equipe ou estoque...',
  '/fluxo-caixa': 'Buscar transações, fornecedores...',
  '/estoque': 'Buscar produto...',
  '/fornecedores': 'Buscar fornecedores...',
  '/freelancers': 'Buscar freelancers...',
  '/perfil': 'Buscar configurações do perfil...',
};

export function DashboardLayout() {
  const { pathname } = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const searchPlaceholder = placeholders[pathname] || placeholders['/'];

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  return (
    <div className="bg-white text-on-surface font-body antialiased selection:bg-primary min-h-screen overflow-x-hidden">
      {navOpen ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 bg-on-surface/40 z-40 md:hidden"
          onClick={() => setNavOpen(false)}
        />
      ) : null}
      <Sidebar open={navOpen} onNavigate={() => setNavOpen(false)} />
      <main className="md:ml-64 min-h-screen flex flex-col min-w-0">
        <TopNavbar
          searchPlaceholder={searchPlaceholder}
          onMenuClick={() => setNavOpen(true)}
        />
        <Outlet />
      </main>
      <AppModal />
    </div>
  );
}
