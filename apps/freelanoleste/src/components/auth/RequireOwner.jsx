import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const EMPLOYEE_PATHS = ['/bar/estoque', '/bar/perfil'];

export function RequireOwner() {
  const { user, isOwner, isEmployee, isAdmin, isFreela } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (isFreela) {
    return <Navigate to="/freela" replace />;
  }

  if (isEmployee) {
    const allowed = EMPLOYEE_PATHS.some(
      (path) => location.pathname === path || location.pathname.startsWith(`${path}/`)
    );
    if (!allowed) {
      return <Navigate to="/bar/estoque" replace />;
    }
    return <Outlet />;
  }

  if (!isOwner) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
