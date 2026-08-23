import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function RequireFreela() {
  const { user, loading, isFreela, isAdmin, isBar } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-dvh" />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  if (isBar) {
    return <Navigate to="/bar" replace />;
  }

  if (user?.role === 'employee') {
    return <Navigate to="/bar/estoque" replace />;
  }

  if (!isFreela) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
