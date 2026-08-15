import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../Icon';
import { Button } from '../Button';

const navItems = [
  { to: '/admin', label: 'Visão geral', icon: 'dashboard', end: true },
  { to: '/admin/tenants', label: 'Tenants', icon: 'storefront' },
  { to: '/admin/usuarios', label: 'Usuários e reclamações', icon: 'group' },
  { to: '/admin/financeiro', label: 'Financeiro Stripe', icon: 'payments' },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface text-on-surface font-body overflow-x-hidden">
      {navOpen ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 bg-on-surface/40 z-40 md:hidden"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <aside
        className={`h-screen w-64 max-w-[80vw] fixed left-0 top-0 flex flex-col bg-white border-r border-outline-variant p-4 z-50 transition-transform ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <p className="font-headline font-extrabold text-lg tracking-tight mb-8 px-3">
          FreelaNoLeste
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
          <Button variant="secondary" className="w-full" onClick={logout}>
            Sair
          </Button>
        </div>
      </aside>

      <div className="md:ml-64 min-h-screen flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white border-b border-outline-variant h-16 px-4 md:px-8 flex items-center gap-3">
          <button
            type="button"
            aria-label="Abrir menu"
            className="md:hidden min-h-11 min-w-11 flex items-center justify-center rounded-full hover:bg-surface-container"
            onClick={() => setNavOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <h1 className="font-headline font-bold text-sm md:text-base">
            Painel admin
          </h1>
        </header>
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
