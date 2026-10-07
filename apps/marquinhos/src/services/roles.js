export const ROLE_ADMIN = 'admin';
export const ROLE_STOCK = 'stock';

export const HOUSE_PERMISSIONS = [
  { id: 'overview', label: 'Visão geral', path: '/', end: true },
  { id: 'caixa', label: 'Fluxo de caixa', path: '/fluxo-caixa' },
  { id: 'estoque', label: 'Estoque', path: '/estoque' },
  { id: 'catalogo', label: 'Catálogo', path: '/catalogo' },
  { id: 'pdv', label: 'PDV', path: '/pdv' },
  { id: 'fornecedores', label: 'Fornecedores', path: '/fornecedores' },
  { id: 'equipe', label: 'Equipe da casa', path: '/equipe' },
  { id: 'perfil', label: 'Perfil', path: '/perfil' },
];

const LEGACY_ADMIN = HOUSE_PERMISSIONS.map((item) => item.id);
const LEGACY_STOCK = ['estoque', 'catalogo', 'pdv', 'perfil'];

export function isAdminRole(role) {
  return role === ROLE_ADMIN;
}

export function isStockRole(role) {
  return role === ROLE_STOCK;
}

export function isBarOwner(user) {
  return (user?.roles || []).includes('owner');
}

export function effectivePermissions(user) {
  if (!user) return [];
  if (isBarOwner(user)) return LEGACY_ADMIN;
  if (Array.isArray(user.permissions) && user.permissions.length) return user.permissions;
  if (isStockRole(user.role)) return LEGACY_STOCK;
  if (isAdminRole(user.role)) return LEGACY_ADMIN;
  return [];
}

export function permissionForPath(pathname) {
  const path = String(pathname || '');
  const exact = HOUSE_PERMISSIONS.find((item) => item.end && path === item.path);
  if (exact) return exact.id;
  const found = HOUSE_PERMISSIONS.filter(
    (item) => !item.end && (path === item.path || path.startsWith(`${item.path}/`))
  ).sort((a, b) => b.path.length - a.path.length)[0];
  return found?.id || '';
}

export function canAccessPath(user, pathname) {
  if (!user) return false;
  if (String(pathname || '').startsWith('/freelancers')) return isBarOwner(user);
  const key = permissionForPath(pathname);
  if (!key) return isBarOwner(user);
  return effectivePermissions(user).includes(key);
}

export function homeForUser(user) {
  if (isBarOwner(user)) return '/';
  const permissions = effectivePermissions(user);
  const found = HOUSE_PERMISSIONS.find((item) => permissions.includes(item.id));
  return found?.path || '/perfil';
}

export function homeForRole(role) {
  return isStockRole(role) ? '/estoque' : '/';
}

export function roleLabel(role) {
  if (isStockRole(role)) return 'Funcionário (estoque)';
  return 'Administrador';
}
