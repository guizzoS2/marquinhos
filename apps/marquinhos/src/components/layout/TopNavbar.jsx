import { Link } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { useAuth } from '../../contexts/AuthContext';

export function TopNavbar({ onMenuClick }) {
  const { user } = useAuth();

  return (
    <header className="w-full sticky top-0 z-40 bg-white border-b border-outline-variant font-headline antialiased tracking-tight flex justify-between items-center gap-3 px-4 md:px-8 h-16">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Abrir menu"
        className="md:hidden min-h-11 min-w-11 flex items-center justify-center text-on-surface-variant hover:bg-surface-container rounded-full transition-colors active:scale-95"
      >
        <Icon name="menu" />
      </button>
      <div className="flex items-center gap-2 md:gap-4 shrink-0 ml-auto">
        <Link to="/perfil" className="flex items-center gap-3 pl-1 md:pl-2 min-h-11">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-on-surface">
              {user?.name || 'Fábio Santos'}
            </p>
            <p className="text-[10px] text-on-surface-variant">
              {user?.title || 'Gerente Geral'}
            </p>
          </div>
          <img
            alt="Avatar do usuário"
            className="w-9 h-9 rounded-full object-cover ring-2 ring-primary-container/20"
            src={
              user?.photoURL ||
              'https://lh3.googleusercontent.com/aida-public/AB6AXuCnAiBdvbFHIU_AojuM_Cn4E75QDQoOBroox5x_mmIuyPtLglF2xWJGOozljzpOGnCppjIVxXHVKxzvLzjMBQDIQzU2T4ZQ0hQbmldgvmx_xCvZ6sH5tSpX1P0eJLMQFfWQFi1FrZuH_Bme_XWdML3-fLQtPDh8iTKJ6xBuCYGqTvbWusWjrl0pJhurURv6caCcWDYKtdzuJ-tzU2NGYfkNcSWFMSBXl_e0hR-l2RSs7YJQzTfKuZlNceLdZlSHJUUGUR0RKgDSGPi_'
            }
          />
        </Link>
      </div>
    </header>
  );
}
