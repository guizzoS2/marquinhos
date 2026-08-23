import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const publicLinks = [
  { to: '/', label: 'Início', end: true },
  { to: '/pessoal', label: 'Pessoal' },
];

function stickerClass(isActive) {
  return isActive ? 'sticker' : 'sticker sticker-ink';
}

export function StreetNav() {
  const { isAdmin, isFreela, isBar, isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-30 px-4 md:px-8 py-3 min-h-16 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-primary bg-inverse-surface">
      <NavLink
        to="/"
        className="font-spray text-primary text-2xl md:text-3xl -rotate-2 motion-reduce:rotate-0 min-h-11 inline-flex items-center w-fit"
      >
        FreelaNoLeste
      </NavLink>
      <nav className="flex flex-wrap items-center gap-2">
        {publicLinks.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => stickerClass(isActive)}
          >
            {item.label}
          </NavLink>
        ))}
        {isAdmin ? (
          <NavLink to="/admin" className="sticker">
            Admin
          </NavLink>
        ) : null}
        {isFreela ? (
          <NavLink to="/freela" className="sticker">
            Painel
          </NavLink>
        ) : null}
        {isBar ? (
          <NavLink to="/bar" className="sticker">
            Painel
          </NavLink>
        ) : null}
        {!isAdmin && !isFreela && !isBar ? (
          <NavLink to="/login" className="sticker sticker-ink">
            {isAuthenticated ? 'Conta' : 'Entrar'}
          </NavLink>
        ) : null}
      </nav>
    </header>
  );
}
