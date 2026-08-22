export const ROLE_ADMIN = 'admin';
export const ROLE_STOCK = 'stock';

export const STOCK_PATHS = ['/estoque', '/perfil'];

export function isAdminRole(role) {
  return role === ROLE_ADMIN;
}

export function isStockRole(role) {
  return role === ROLE_STOCK;
}

export function homeForRole(role) {
  return isStockRole(role) ? '/estoque' : '/';
}

export function canAccessPath(role, pathname) {
  if (isAdminRole(role) || !role) return true;
  if (!isStockRole(role)) return false;
  return STOCK_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function roleLabel(role) {
  if (isStockRole(role)) return 'Funcionário (estoque)';
  return 'Administrador';
}
