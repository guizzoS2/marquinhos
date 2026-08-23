import { Navigate } from 'react-router-dom';

export function RoleSignupPage({ role }) {
  return <Navigate to={role === 'owner' ? '/cadastro-bar' : '/cadastro-freela'} replace />;
}
