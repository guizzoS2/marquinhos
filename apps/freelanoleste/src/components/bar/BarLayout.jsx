import { useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { fetchBarSubscription } from '../../services/ownerApi';
import { Icon } from '../Icon';
import { Button } from '../Button';

const opsNav = [
  { to: '/bar', label: 'Visão geral', icon: 'dashboard', end: true },
  { to: '/bar/fluxo-caixa', label: 'Fluxo de caixa', icon: 'account_balance' },
  { to: '/bar/estoque', label: 'Estoque', icon: 'inventory_2' },
  { to: '/bar/fornecedores', label: 'Fornecedores', icon: 'local_shipping' },
  { to: '/bar/equipe', label: 'Equipe', icon: 'groups' },
  { to: '/bar/perfil', label: 'Perfil da casa', icon: 'storefront' },
];

const platformNav = [
  { to: '/bar/freelas', label: 'Vitrine de freelas', icon: 'search' },
  { to: '/bar/propostas', label: 'Propostas e chat', icon: 'chat' },
  { to: '/bar/pagamentos', label: 'Pagamentos', icon: 'payments' },
];

const titles = {
  '/bar': 'Visão geral',
  '/bar/fluxo-caixa': 'Fluxo de caixa',
  '/bar/estoque': 'Estoque',
  '/bar/fornecedores': 'Fornecedores',
  '/bar/equipe': 'Equipe da casa',
  '/bar/perfil': 'Perfil da casa',
  '/bar/freelas': 'Vitrine de freelas',
  '/bar/propostas': 'Propostas e chat',
  '/bar/pagamentos': 'Portal Stripe',
};

function NavGroup({ label, items, onNavigate }) {
  return (
    <div className="space-y-1">
      <p className="px-3 pt-3 pb-1 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
        {label}
      </p>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            isActive
              ? 'flex items-center gap-3 px-3 py-2.5 min-h-11 bg-primary text-on-primary rounded-lg'
              : 'flex items-center gap-3 px-3 py-2.5 min-h-11 text-on-surface-variant hover:bg-surface-container rounded-lg'
          }
        >
          <Icon name={item.icon} />
          <span className="text-sm font-medium">{item.label}</span>
        </NavLink>
      ))}
    </div>
  );
}

export function BarLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const isChat = location.pathname.includes('/chat/');
  const tenantName = useMemo(() => {
    try {
      return fetchBarSubscription().tenantName;
    } catch {
      return 'Painel do bar';
    }
  }, []);
  const title = titles[location.pathname] || (isChat ? 'Negociação' : tenantName);

  return (
    <div
      className={`${
        isChat ? 'h-dvh overflow-hidden' : 'min-h-screen'
      } bg-surface text-on-surface font-body overflow-x-hidden`}
    >
      {navOpen ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 bg-on-surface/40 z-40 md:hidden"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <aside
        className={`h-dvh w-64 max-w-[80vw] fixed left-0 top-0 flex flex-col bg-white border-r border-outline-variant p-4 z-50 transition-transform ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <p className="font-headline font-extrabold text-lg tracking-tight mb-4 px-3">
          {tenantName}
        </p>
        <nav className="flex-1 min-h-0 overflow-y-auto space-y-4">
          <NavGroup label="Operacional" items={opsNav} onNavigate={() => setNavOpen(false)} />
          <NavGroup label="Plataforma" items={platformNav} onNavigate={() => setNavOpen(false)} />
        </nav>
        <div className="pt-4 border-t border-outline-variant/20 space-y-2">
          <p className="px-3 text-xs text-on-surface-variant">{user?.email}</p>
          <Button variant="secondary" className="w-full" onClick={logout}>
            Sair
          </Button>
        </div>
      </aside>

      <div
        className={`md:ml-64 flex flex-col min-w-0 ${isChat ? 'h-full' : 'min-h-screen'}`}
      >
        <header className="sticky top-0 z-30 shrink-0 bg-white border-b border-outline-variant h-16 px-4 md:px-8 flex items-center gap-3">
          <button
            type="button"
            aria-label="Abrir menu"
            className="md:hidden min-h-11 min-w-11 flex items-center justify-center rounded-full hover:bg-surface-container"
            onClick={() => setNavOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <h1 className="font-headline font-bold text-sm md:text-base">{title}</h1>
        </header>
        <main
          className={
            isChat ? 'flex-1 min-h-0 flex flex-col' : 'flex-1 p-4 md:p-8'
          }
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
