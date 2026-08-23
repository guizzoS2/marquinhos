import { useEffect, useMemo, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { barPermissionForPath, firstAllowedBarPath } from '@fnl/dashboard';
import { useAuth } from '../../contexts/AuthContext';
import { fetchOwnerAccess } from '../../services/ownerApi';
import { subscribePlatformStore } from '../../services/platformStore';
import { Icon } from '../Icon';
import { Button } from '../Button';

const navGroups = [
  {
    id: 'ops',
    label: 'Operações',
    items: [
      { to: '/bar', label: 'Visão geral', icon: 'dashboard', end: true },
      { to: '/bar/caixa', label: 'Fluxo de caixa', icon: 'payments' },
      { to: '/bar/estoque', label: 'Estoque', icon: 'inventory_2' },
      { to: '/bar/fornecedores', label: 'Fornecedores', icon: 'local_shipping' },
      { to: '/bar/equipe', label: 'Equipe', icon: 'group' },
    ],
  },
  {
    id: 'hire',
    label: 'Contratar',
    items: [
      { to: '/bar/vitrine', label: 'Vitrine', icon: 'search' },
      { to: '/bar/propostas', label: 'Propostas', icon: 'chat' },
    ],
  },
  {
    id: 'account',
    label: 'Conta',
    items: [
      { to: '/bar/perfil', label: 'Perfil público', icon: 'storefront' },
      { to: '/bar/pagamentos', label: 'Pagamentos', icon: 'payments' },
    ],
  },
];

const titles = {
  '/bar': 'Visão geral',
  '/bar/caixa': 'Fluxo de caixa',
  '/bar/estoque': 'Estoque',
  '/bar/fornecedores': 'Fornecedores',
  '/bar/equipe': 'Equipe',
  '/bar/vitrine': 'Vitrine de freelas',
  '/bar/propostas': 'Propostas e chat',
  '/bar/perfil': 'Perfil público',
  '/bar/pagamentos': 'Pagamentos',
};

function itemAllowed(path, isOwner, permissions) {
  if (isOwner) return true;
  const key = barPermissionForPath(path);
  return (permissions || []).includes(key);
}

export function BarLayout() {
  const { user, logout, isOwner } = useAuth();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [access, setAccess] = useState(() => fetchOwnerAccess());
  const permissions = user?.permissions || [];
  const visibleGroups = useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => itemAllowed(item.to, isOwner, permissions)),
        }))
        .filter((group) => group.items.length),
    [isOwner, permissions]
  );
  const requiredPermission = barPermissionForPath(location.pathname);
  const canSeePage = isOwner || permissions.includes(requiredPermission);
  const isChat = location.pathname.includes('/chat/');
  const title = access.active
    ? titles[location.pathname] || (isChat ? 'Negociação' : 'Painel do bar')
    : 'Aguardando ativação';

  useEffect(() => {
    setAccess(fetchOwnerAccess());
    return subscribePlatformStore(() => {
      setAccess(fetchOwnerAccess());
    });
  }, [user?.tenantId]);

  return (
    <div
      className={`bar-panel ${
        isChat ? 'h-dvh overflow-hidden' : 'min-h-screen'
      } overflow-x-hidden`}
      style={{ '--tenant-primary': access.primaryHex || '#FFDB15' }}
    >
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
        <div className="mb-8 px-1 flex items-center gap-3">
          {access.logoDataUrl ? (
            <img
              src={access.logoDataUrl}
              alt=""
              className="w-10 h-10 object-cover border-2 border-[var(--spray)]"
            />
          ) : null}
          <div className="min-w-0">
            <p className="font-display text-2xl tracking-wide uppercase truncate">
              {access.tenantName || 'Bar'}
            </p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--muted)]">
              FreelaNoLeste
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto">
          {access.active
            ? visibleGroups.map((group) => (
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
              ))
            : (
                <p className="px-1 text-sm text-[var(--muted)]">
                  Operações, vitrine e pagamentos liberam depois da ativação.
                </p>
              )}
        </nav>

        <div className="pt-4 border-t border-[var(--ink)] space-y-2">
          <p className="px-1 text-xs text-[var(--muted)]">{user?.email}</p>
          {user?.role === 'staff' ? (
            <p className="px-1 text-[10px] uppercase tracking-widest text-[var(--spray)]">
              Funcionário
            </p>
          ) : null}
          <Button variant="dark" className="w-full" onClick={logout}>
            Sair
          </Button>
        </div>
      </aside>

      <div className={`md:ml-64 flex flex-col min-w-0 ${isChat ? 'h-full' : 'min-h-screen'}`}>
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
        <main
          className={
            isChat && access.active
              ? 'flex-1 min-h-0 flex flex-col'
              : 'flex-1 p-4 md:p-8 max-w-6xl w-full'
          }
        >
          {access.active ? (
            canSeePage ? (
              <Outlet />
            ) : firstAllowedBarPath(permissions, isOwner) === location.pathname ? (
              <p className="text-sm text-[var(--muted)]">Sem acesso a esta tela. Peça ao dono.</p>
            ) : (
              <Navigate to={firstAllowedBarPath(permissions, isOwner)} replace />
            )
          ) : (
            <section className="max-w-xl space-y-4">
              <h2 className="font-display text-4xl uppercase tracking-wide">Aguardando ativação</h2>
              <p className="text-sm text-[var(--muted)]">
                {access.tenantName} está cadastrado. O admin ativa a assinatura (mock) antes de
                operações, vitrine e pagamentos.
              </p>
              <p className="text-sm text-[var(--muted)]">Tenant: {access.tenantId}</p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
