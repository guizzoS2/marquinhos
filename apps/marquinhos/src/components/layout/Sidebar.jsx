import { NavLink } from 'react-router-dom';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '../../contexts/AuthContext';
import { effectivePermissions, homeForUser, isBarOwner } from '../../services/roles';

const allNavItems = [
  { to: '/', label: 'Visão Geral', icon: 'dashboard', end: true, permission: 'overview' },
  { to: '/fluxo-caixa', label: 'Fluxo de Caixa', icon: 'payments', permission: 'caixa' },
  { to: '/estoque', label: 'Estoque', icon: 'inventory_2', permission: 'estoque' },
  { to: '/catalogo', label: 'Catálogo', icon: 'storefront', permission: 'catalogo' },
  { to: '/pdv', label: 'PDV', icon: 'point_of_sale', permission: 'pdv' },
  { to: '/fornecedores', label: 'Fornecedores', icon: 'local_shipping', permission: 'fornecedores' },
  { to: '/freelancers', label: 'Freelancers', icon: 'group', owner: true },
  { to: '/equipe', label: 'Equipe da casa', icon: 'badge', permission: 'equipe' },
  { to: '/perfil', label: 'Perfil', icon: 'person', permission: 'perfil' },
];

export function Sidebar({ open = false, onNavigate }) {
  const { logout, user } = useAuth();
  const owner = isBarOwner(user);
  const permissions = effectivePermissions(user);
  const navItems = allNavItems.filter((item) => {
    if (item.owner) return owner;
    return permissions.includes(item.permission);
  });

  return (
    <aside
      className={`h-screen w-64 max-w-[80vw] fixed left-0 top-0 flex flex-col bg-white border-r border-outline-variant font-headline text-sm font-medium p-4 space-y-2 z-50 transition-transform duration-200 ${
        open ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0`}
    >
      <NavLink
        to={homeForUser(user)}
        className="mb-8 block"
        aria-label="Marquinho's"
        onClick={onNavigate}
      >
        <BrandLogo variant="sidebar" />
      </NavLink>

      <nav className="flex-1 space-y-1 overflow-y-auto">
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
        <Button type="button" variant="ghost" className="w-full justify-start" onClick={logout}>
          <Icon name="logout" />
          Sair
        </Button>
      </div>
    </aside>
  );
}
