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
    <div className="flex flex-col md:flex-row w-full h-dvh">
      <section className="h-1/2 md:h-full md:w-1/2 bg-primary text-on-primary flex flex-col items-center justify-center p-4 md:p-8 gap-6">
        <p className="text-xs font-bold uppercase tracking-[0.35em]">Contratante</p>
        <h1 className="font-headline font-extrabold text-4xl md:text-6xl uppercase tracking-tighter text-center">
          Bar
        </h1>
        <Link
          to="/login/bar"
          className="inline-flex items-center justify-center min-h-11 md:min-h-32 w-full max-w-sm px-6 border-4 border-on-surface bg-primary text-on-surface font-headline font-extrabold text-2xl md:text-5xl uppercase tracking-tighter hover:bg-on-surface hover:text-primary"
        >
          Sou Bar
        </Link>
      </section>

      <section className="h-1/2 md:h-full md:w-1/2 bg-inverse-surface text-inverse-on-surface flex flex-col items-center justify-center p-4 md:p-8 gap-6">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-primary">Profissional</p>
        <h2 className="font-headline font-extrabold text-4xl md:text-6xl uppercase tracking-tighter text-center">
          Freela
        </h2>
        <Link
          to="/login/freela"
          className="inline-flex items-center justify-center min-h-11 md:min-h-32 w-full max-w-sm px-6 border-4 border-primary bg-inverse-surface text-primary font-headline font-extrabold text-2xl md:text-5xl uppercase tracking-tighter hover:bg-primary hover:text-on-primary"
        >
          Sou Freela
        </Link>
      </section>
    </div>
  );
}
