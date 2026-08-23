export const BAR_PERMISSIONS = [
  { id: 'overview', label: 'Visão geral', path: '/bar', end: true },
  { id: 'caixa', label: 'Fluxo de caixa', path: '/bar/caixa' },
  { id: 'estoque', label: 'Estoque', path: '/bar/estoque' },
  { id: 'fornecedores', label: 'Fornecedores', path: '/bar/fornecedores' },
  { id: 'equipe', label: 'Equipe', path: '/bar/equipe' },
  { id: 'vitrine', label: 'Vitrine', path: '/bar/vitrine' },
  { id: 'propostas', label: 'Propostas', path: '/bar/propostas' },
  { id: 'perfil', label: 'Perfil público', path: '/bar/perfil' },
  { id: 'pagamentos', label: 'Pagamentos', path: '/bar/pagamentos' },
];

export const DEFAULT_STAFF_PERMISSIONS = ['overview', 'caixa', 'estoque'];

export function barPermissionForPath(pathname) {
  const path = String(pathname || '');
  if (path.startsWith('/bar/chat')) return 'propostas';
  const exact = BAR_PERMISSIONS.find((item) => item.end && path === item.path);
  if (exact) return exact.id;
  const found = BAR_PERMISSIONS.filter((item) => !item.end && path.startsWith(item.path)).sort(
    (a, b) => b.path.length - a.path.length
  )[0];
  return found?.id || 'overview';
}

export function firstAllowedBarPath(permissions, isOwner) {
  if (isOwner) return '/bar';
  const allowed = BAR_PERMISSIONS.find((item) => (permissions || []).includes(item.id));
  return allowed?.path || '/bar';
}
