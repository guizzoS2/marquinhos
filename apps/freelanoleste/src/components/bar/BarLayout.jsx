import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../Icon';
import { Button } from '../Button';

const navItems = [
  { to: '/bar', label: 'Vitrine de freelas', icon: 'search', end: true },
  { to: '/bar/propostas', label: 'Propostas e chat', icon: 'chat' },
  { to: '/bar/perfil', label: 'Perfil público', icon: 'storefront' },
  { to: '/bar/pagamentos', label: 'Pagamentos', icon: 'payments' },
];

const titles = {
  '/bar': 'Vitrine de freelas',
  '/bar/propostas': 'Propostas e chat',
  '/bar/perfil': 'Perfil público do bar',
  '/bar/pagamentos': 'Portal Stripe',
};

export function BarLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const isChat = location.pathname.includes('/chat/');
  const title = titles[location.pathname] || (isChat ? 'Negociação' : 'Painel do bar');

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
        <p className="font-headline font-extrabold text-lg tracking-tight mb-8 px-3">
          Painel do contratante
        </p>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setNavOpen(false)}
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
        </nav>
        <div className="pt-4 border-t border-outline-variant/20 space-y-2">
          <p className="px-3 text-xs text-on-surface-variant">{user?.email}</p>
          <p className="px-3 text-xs text-on-surface-variant">
            Marketplace da plataforma. Caixa e estoque ficam no painel do tenant.
          </p>
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
