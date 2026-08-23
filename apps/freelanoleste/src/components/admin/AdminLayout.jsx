import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Icon } from '../Icon';
import { Button } from '../Button';

const navGroups = [
  {
    id: 'platform',
    label: 'Plataforma',
    items: [
      { to: '/admin', label: 'Visão', icon: 'dashboard', end: true },
      { to: '/admin/noites', label: 'Noites', icon: 'event' },
      { to: '/admin/tenants', label: 'Bares', icon: 'storefront' },
    ],
  },
  {
    id: 'network',
    label: 'Rede',
    items: [{ to: '/admin/usuarios', label: 'Pessoas', icon: 'group' }],
  },
  {
    id: 'money',
    label: 'Dinheiro',
    items: [{ to: '/admin/financeiro', label: 'Financeiro', icon: 'payments' }],
  },
];

const titles = {
  '/admin': 'Visão geral',
  '/admin/noites': 'Noites',
  '/admin/tenants': 'Bares',
  '/admin/usuarios': 'Pessoas',
  '/admin/financeiro': 'Financeiro',
};

export function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const title = titles[location.pathname] || 'Painel admin';

  return (
    <div className="bar-panel min-h-screen overflow-x-hidden">
      <div className="bar-tape" aria-hidden="true" />
      <div className="bar-grain" aria-hidden="true" />

      {navOpen ? (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <aside
        className={`h-dvh w-64 max-w-[80vw] fixed left-0 top-0 flex flex-col bg-[var(--paper)] text-[var(--ink)] border-r-2 border-[var(--ink)] p-4 z-50 ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="mb-8 px-1">
          <p className="font-display text-2xl tracking-wide uppercase">FreelaNoLeste</p>
          <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--muted)]">Admin</p>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.id} className="space-y-2">
              <p className="px-1 font-display text-xs tracking-[0.2em] text-[var(--spray)]">
                {group.label}
              </p>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={() => setNavOpen(false)}
                    className={({ isActive }) =>
                      isActive
                        ? 'bar-sticker bar-sticker-on justify-start gap-2'
                        : 'bar-sticker justify-start gap-2'
                    }
                  >
                    <Icon name={item.icon} />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="pt-4 border-t border-[var(--ink)] space-y-2">
          <p className="px-1 text-xs text-[var(--muted)]">{user?.email}</p>
          <Button variant="dark" className="w-full" onClick={logout}>
            Sair
          </Button>
        </div>
      </aside>

      <div className="md:ml-64 min-h-screen flex flex-col min-w-0">
        <header className="sticky top-0 z-30 shrink-0 bg-[var(--paper)] border-b border-[color-mix(in_srgb,var(--ink)_12%,transparent)] h-16 px-4 md:px-8 flex items-center gap-3">
          <button
            type="button"
            aria-label="Abrir menu"
            className="md:hidden min-h-11 min-w-11 flex items-center justify-center"
            onClick={() => setNavOpen(true)}
          >
            <Icon name="menu" />
          </button>
          <h1 className="font-display text-xl md:text-2xl uppercase tracking-wide">{title}</h1>
        </header>
        <main className="flex-1 p-4 md:p-8 max-w-6xl w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
