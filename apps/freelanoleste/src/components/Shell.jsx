import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const publicLinks = [
  { to: '/', label: 'Início', end: true },
  { to: '/pessoal', label: 'Pessoal' },
];

export function Shell() {
  const { isAdmin, isFreela, isOwner, isEmployee, isAuthenticated } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const isPessoal = location.pathname === '/pessoal';
  const isAuthFlow =
    location.pathname.startsWith('/login') || location.pathname.startsWith('/cadastro');
  const isDarkChrome = isHome || isPessoal || isAuthFlow;

  return (
    <div
      className={`min-h-dvh flex flex-col font-body overflow-x-hidden ${
        isDarkChrome ? 'bg-transparent text-inverse-on-surface' : 'bg-surface text-on-surface'
      }`}
    >
      <header
        className={`sticky top-0 z-30 shrink-0 px-4 md:px-8 min-h-16 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${
          isDarkChrome
            ? 'border-white/20 bg-inverse-surface'
            : 'border-outline-variant bg-surface'
        }`}
      >
        <NavLink
          to="/"
          className={`font-headline font-extrabold text-lg tracking-tight min-h-11 inline-flex items-center ${
            isDarkChrome ? 'text-primary' : ''
          }`}
        >
          FreelaNoLeste
        </NavLink>
        <nav className="flex flex-wrap items-center gap-2">
          {publicLinks.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive
                  ? 'px-3 py-2 min-h-11 rounded-lg bg-primary text-on-primary text-sm font-semibold'
                  : isDarkChrome
                    ? 'px-3 py-2 min-h-11 rounded-lg text-inverse-on-surface hover:bg-tertiary text-sm font-medium'
                    : 'px-3 py-2 min-h-11 rounded-lg text-on-surface-variant hover:bg-surface-container text-sm font-medium'
              }
            >
              {item.label}
            </NavLink>
          ))}
          {isAdmin ? (
            <NavLink
              to="/admin"
              className={`px-3 py-2 min-h-11 rounded-lg text-sm font-semibold ${
                isDarkChrome ? 'bg-primary text-on-primary' : 'bg-on-surface text-white'
              }`}
            >
              Admin
            </NavLink>
          ) : null}
          {isFreela ? (
            <NavLink
              to="/freela"
              className={`px-3 py-2 min-h-11 rounded-lg text-sm font-semibold ${
                isDarkChrome ? 'bg-primary text-on-primary' : 'bg-on-surface text-white'
              }`}
            >
              Painel
            </NavLink>
          ) : null}
          {isOwner || isEmployee ? (
            <NavLink
              to={isEmployee ? '/bar/estoque' : '/bar'}
              className={`px-3 py-2 min-h-11 rounded-lg text-sm font-semibold ${
                isDarkChrome ? 'bg-primary text-on-primary' : 'bg-on-surface text-white'
              }`}
            >
              Painel
            </NavLink>
          ) : null}
          {!isAdmin && !isFreela && !isOwner && !isEmployee ? (
            <NavLink
              to="/login"
              className={
                isDarkChrome
                  ? 'px-3 py-2 min-h-11 rounded-lg text-inverse-on-surface hover:bg-tertiary text-sm font-medium'
                  : 'px-3 py-2 min-h-11 rounded-lg text-on-surface-variant hover:bg-surface-container text-sm font-medium'
              }
            >
              {isAuthenticated ? 'Conta' : 'Entrar'}
            </NavLink>
          ) : null}
        </nav>
      </header>
      <main className="flex-1 flex flex-col min-h-0">
        <Outlet />
      </main>
    </div>
  );
}
