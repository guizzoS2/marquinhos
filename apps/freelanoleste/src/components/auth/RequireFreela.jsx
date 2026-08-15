import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function RequireFreela() {
  const { user, isFreela, isAdmin, isOwner } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (isOwner) {
    return <Navigate to="/bar" replace />;
  }

  if (!isFreela) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
