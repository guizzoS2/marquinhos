import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function RequireAdmin() {
  const { user, isAdmin, isFreela, isOwner } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login/admin" replace state={{ from: location.pathname }} />;
  }

  if (isAdmin) {
    return <Outlet />;
  }

  if (isFreela) {
    return <Navigate to="/freela" replace />;
  }

  if (isOwner) {
    return <Navigate to="/bar" replace />;
  }

  return <Navigate to="/" replace />;
}
