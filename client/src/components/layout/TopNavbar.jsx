import { Link } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { useAuth } from '../../contexts/AuthContext';

export function TopNavbar({
  searchPlaceholder = 'Buscar análises, equipe ou estoque...',
}) {
  const { user } = useAuth();

  return (
    <header className="w-full sticky top-0 z-40 bg-white border-b border-outline-variant font-headline antialiased tracking-tight flex justify-between items-center px-8 h-16">
      <div className="flex items-center gap-6">
        <div className="relative w-96 group">
          <Icon
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl"
          />
          <input
            className="w-full pl-11 pr-4 py-2 bg-surface-container-low border-none rounded-full focus:ring-2 focus:ring-primary-container/30 transition-all text-sm font-body"
            placeholder={searchPlaceholder}
            type="text"
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="w-10 h-10 flex items-center justify-center text-on-surface-variant hover:bg-surface-container rounded-full transition-colors active:scale-95"
        >
          <Icon name="notifications" />
        </button>
        <div className="h-8 w-px bg-outline-variant/30 mx-1" />
        <Link to="/perfil" className="flex items-center gap-3 pl-2">
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
