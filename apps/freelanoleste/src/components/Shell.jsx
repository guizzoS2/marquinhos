import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const publicLinks = [
  { to: '/', label: 'Início', end: true },
  { to: '/freelas', label: 'Freelas' },
  { to: '/cadastro-freela', label: 'Sou freela' },
];

export function Shell() {
  const { isAdmin, isFreela, isOwner, isAuthenticated } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div
      className={`min-h-screen font-body overflow-x-hidden ${
        isHome ? 'bg-transparent text-inverse-on-surface' : 'bg-surface text-on-surface'
      }`}
    >
      <header
        className={`sticky top-0 z-30 px-4 md:px-8 min-h-16 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${
          isHome
            ? 'border-outline/30 bg-inverse-surface/90'
            : 'border-outline-variant bg-surface'
        }`}
      >
        <NavLink
          to="/"
          className={`font-headline font-extrabold text-lg tracking-tight min-h-11 inline-flex items-center ${
            isHome ? 'text-primary' : ''
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
                  : isHome
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
                isHome ? 'bg-primary text-on-primary' : 'bg-on-surface text-white'
              }`}
            >
              Admin
            </NavLink>
          ) : null}
          {isFreela ? (
            <NavLink
              to="/freela"
              className={`px-3 py-2 min-h-11 rounded-lg text-sm font-semibold ${
                isHome ? 'bg-primary text-on-primary' : 'bg-on-surface text-white'
              }`}
            >
              Painel
            </NavLink>
          ) : null}
          {isOwner ? (
            <NavLink
              to="/bar"
              className={`px-3 py-2 min-h-11 rounded-lg text-sm font-semibold ${
                isHome ? 'bg-primary text-on-primary' : 'bg-on-surface text-white'
              }`}
            >
              Painel
            </NavLink>
          ) : null}
          {!isAdmin && !isFreela && !isOwner ? (
            <NavLink
              to="/login"
              className={
                isHome
                  ? 'px-3 py-2 min-h-11 rounded-lg text-inverse-on-surface hover:bg-tertiary text-sm font-medium'
                  : 'px-3 py-2 min-h-11 rounded-lg text-on-surface-variant hover:bg-surface-container text-sm font-medium'
              }
            >
              {isAuthenticated ? 'Conta' : 'Entrar'}
            </NavLink>
          ) : null}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
