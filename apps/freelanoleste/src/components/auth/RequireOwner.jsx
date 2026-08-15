import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function RequireOwner() {
  const { user, isOwner, isAdmin, isFreela } = useAuth();
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

  if (!isOwner) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
