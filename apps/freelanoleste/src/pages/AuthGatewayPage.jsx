import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { RoughButton } from '../components/street/RoughButton';
import { StatusStamp } from '../components/street/StatusStamp';

function homeFor(user) {
  if (user?.role === 'admin') return '/admin';
  if (user?.role === 'freela') return '/freela';
  if (user?.role === 'owner' || user?.role === 'staff' || user?.role === 'employee') return '/bar';
  return '/';
}

export function AuthGatewayPage() {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-dvh" />;
  }

  if (isAuthenticated) {
    return <Navigate to={location.state?.from || homeFor(user)} replace />;
  }

  return (
    <div className="flex flex-col md:flex-row w-full min-h-[calc(100dvh-4rem)] overflow-x-hidden">
      <section className="min-h-[50dvh] md:min-h-[calc(100dvh-4rem)] md:w-1/2 bg-primary text-on-primary flex flex-col items-center justify-center p-4 md:p-8 gap-6">
        <p className="font-display text-sm tracking-[0.35em] uppercase">Contratante</p>
        <h1 className="font-spray text-4xl md:text-6xl text-center -rotate-1 motion-reduce:rotate-0">
          Bar
        </h1>
        <RoughButton
          to="/login/bar"
          variant="ghost"
          className="w-full max-w-sm md:min-h-32 text-2xl md:text-5xl"
        >
          Sou bar
        </RoughButton>
      </section>

      <section className="min-h-[50dvh] md:min-h-[calc(100dvh-4rem)] md:w-1/2 bg-inverse-surface text-inverse-on-surface flex flex-col items-center justify-center p-4 md:p-8 gap-6">
        <StatusStamp rotate="-rotate-2">NO LESTE</StatusStamp>
        <p className="font-display text-sm tracking-[0.35em] uppercase text-primary">
          Profissional
        </p>
        <h2 className="font-spray text-4xl md:text-6xl text-center rotate-1 motion-reduce:rotate-0">
          Freela
        </h2>
        <RoughButton
          to="/login/freela"
          className="w-full max-w-sm md:min-h-32 text-2xl md:text-5xl"
        >
          Sou freela
        </RoughButton>
      </section>
    </div>
  );
}
