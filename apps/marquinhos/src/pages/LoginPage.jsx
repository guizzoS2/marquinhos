import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { BrandLogo } from '../components/layout/BrandLogo';
import { isFirebaseConfigured } from '../services/firebase';
import { homeForRole } from '../services/roles';

export function LoginPage() {
  const { login, isAuthenticated, loading, user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isFirebaseConfigured()) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4 sm:p-6 font-body">
        <Card className="w-full max-w-md p-5 sm:p-8 space-y-3">
          <h1 className="font-headline text-2xl font-extrabold">Firebase obrigatório</h1>
          <p className="text-sm text-on-surface-variant">
            Configure FIREBASE_API_KEY, FIREBASE_AUTH_DOMAIN, FIREBASE_PROJECT_ID e FIREBASE_APP_ID
            em apps/marquinhos/.env
          </p>
        </Card>
      </div>
    );
  }

  if (!loading && isAuthenticated) {
    return <Navigate to={homeForRole(user?.role)} replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login({ email, password });
    } catch (err) {
      setError(err.message || 'Credenciais inválidas.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4 sm:p-6 font-body">
      <Card className="w-full max-w-md p-5 sm:p-8 space-y-6" as="form" onSubmit={handleSubmit}>
        <div className="flex flex-col items-center gap-4 text-center">
          <BrandLogo variant="full" className="w-44 h-44" />
          <p className="text-sm text-on-surface-variant">Acesso do bar — dono ou estoque</p>
        </div>

        <Input
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Senha"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error ? <p className="text-sm text-error font-medium">{error}</p> : null}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Entrando...' : 'Entrar'}
        </Button>
      </Card>
    </div>
  );
}
