import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function homeFor(user) {
  if (user?.role === 'admin') return '/admin';
  if (user?.role === 'freela') return '/freela';
  if (user?.role === 'owner') return '/bar';
  return '/';
}

export function AuthGatewayPage() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isAuthenticated) {
    return <Navigate to={location.state?.from || homeFor(user)} replace />;
  }

  return (
    <div className="relative flex flex-col md:flex-row flex-1 min-h-0 w-full">
      <Link
        to="/login/bar"
        className="flex-1 min-h-11 bg-primary text-on-surface flex flex-col items-center justify-center p-4 md:p-8 gap-4 hover:bg-primary-dim"
      >
        <span className="text-xs font-bold uppercase tracking-[0.35em]">Contratante</span>
        <h1 className="font-headline font-extrabold text-5xl md:text-8xl uppercase tracking-tighter text-center">
          Bar
        </h1>
      </Link>

      <Link
        to="/login/freela"
        className="flex-1 min-h-11 bg-inverse-surface text-primary flex flex-col items-center justify-center p-4 md:p-8 gap-4 hover:bg-secondary-dim"
      >
        <span className="text-xs font-bold uppercase tracking-[0.35em]">Profissional</span>
        <h2 className="font-headline font-extrabold text-5xl md:text-8xl uppercase tracking-tighter text-center">
          Freela
        </h2>
      </Link>

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
        <div className="absolute top-1/2 left-0 h-16 w-full -translate-y-1/2 bg-gradient-to-b from-primary via-white/40 to-inverse-surface blur-md md:hidden" />
        <div className="absolute left-1/2 top-0 hidden h-full w-16 -translate-x-1/2 bg-gradient-to-r from-primary via-white/40 to-inverse-surface blur-md md:block" />
        <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-white md:hidden" />
        <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-white md:block" />
      </div>
    </div>
  );
}
