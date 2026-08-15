import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/', label: 'Início', end: true },
  { to: '/freelas', label: 'Freelas' },
  { to: '/admin', label: 'Admin' },
  { to: '/cadastro-freela', label: 'Sou freela' },
  { to: '/login', label: 'Entrar' },
];

export function Shell() {
  return (
    <div className="min-h-screen bg-surface text-on-surface font-body">
      <header className="border-b border-outline-variant px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        <NavLink to="/" className="font-headline font-extrabold text-lg tracking-tight">
          FreelaNoLeste
        </NavLink>
        <nav className="flex flex-wrap items-center gap-2">
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                isActive
                  ? 'px-3 py-2 min-h-11 rounded-lg bg-primary text-on-primary text-sm font-semibold'
                  : 'px-3 py-2 min-h-11 rounded-lg text-on-surface-variant hover:bg-surface-container text-sm font-medium'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
