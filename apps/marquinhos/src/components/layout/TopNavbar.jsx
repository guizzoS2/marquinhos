import { Link } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { UserAvatar } from '../ui/UserAvatar';
import { useAuth } from '../../contexts/AuthContext';

export function TopNavbar({ onMenuClick }) {
  const { user } = useAuth();

  return (
    <header className="w-full sticky top-0 z-40 bg-white border-b border-outline-variant font-headline antialiased flex justify-between items-center gap-3 px-4 md:px-8 h-16">
      <Button type="button" size="icon" variant="ghost" className="md:hidden" onClick={onMenuClick} aria-label="Abrir menu">
        <Icon name="menu" />
      </Button>
      <div className="flex items-center gap-2 md:gap-4 shrink-0 ml-auto">
        <Link to="/perfil" aria-label="Perfil do usuário" className="flex items-center gap-3 pl-1 md:pl-2 min-h-11">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-on-surface">
              {user?.name || 'Fábio Santos'}
            </p>
            <p className="text-[10px] text-on-surface-variant">
              {user?.title || 'Gerente Geral'}
            </p>
          </div>
          <UserAvatar src={user?.photoURL} className="h-9 w-9" />
        </Link>
      </div>
    </header>
  );
}
