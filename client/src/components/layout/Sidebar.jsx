import { NavLink } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';

const navItems = [
  { to: '/', label: 'Visão Geral', icon: 'dashboard', end: true },
  { to: '/fluxo-caixa', label: 'Fluxo de Caixa', icon: 'payments' },
  { to: '/estoque', label: 'Estoque', icon: 'inventory_2' },
  { to: '/freelancers', label: 'Freelancers', icon: 'group' },
  { to: '/perfil', label: 'Perfil', icon: 'person' },
];

export function Sidebar({ open = false, onNavigate }) {
  const { logout } = useAuth();
  const { openModal } = useModal();
  const queryClient = useQueryClient();

  return (
    <aside
      className={`h-screen w-64 max-w-[80vw] fixed left-0 top-0 flex flex-col bg-white border-r border-outline-variant font-headline text-sm font-medium p-4 space-y-2 z-50 transition-transform duration-200 ${
        open ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0`}
    >
      <NavLink to="/" className="mb-8 block" aria-label="Marquinho's" onClick={onNavigate}>
        <BrandLogo variant="sidebar" />
      </NavLink>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              isActive
                ? 'flex items-center gap-3 px-3 py-2.5 min-h-11 bg-primary text-on-primary rounded-lg transition-all'
                : 'flex items-center gap-3 px-3 py-2.5 min-h-11 text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-all'
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={item.icon} filled={isActive} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="pt-4 border-t border-outline-variant/20 space-y-1">
        <Button
          className="w-full"
          onClick={() =>
            openModal('new-order', {
              onSuccess: () =>
                queryClient.invalidateQueries({ queryKey: ['cash-flow'] }),
            })
          }
        >
          <Icon name="add" />
          Novo Pedido
        </Button>
        <a
          className="mt-2 flex items-center gap-3 px-3 py-2 min-h-11 text-on-surface-variant hover:text-on-surface transition-colors"
          href="#"
        >
          <Icon name="help" className="text-lg" />
          <span>Central de Ajuda</span>
        </a>
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 min-h-11 text-on-surface-variant hover:text-error transition-colors"
        >
          <Icon name="logout" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}
