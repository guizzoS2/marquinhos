import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { BrandLogo } from '../components/layout/BrandLogo';
import { isFirebaseConfigured } from '../services/firebase';

export function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const [email, setEmail] = useState('fabio@marquinhos.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login({ email, password });
    } catch {
      setError('Credenciais inválidas.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 font-body">
      <Card className="w-full max-w-md p-8 space-y-6" as="form" onSubmit={handleSubmit}>
        <div className="flex flex-col items-center gap-4 text-center">
          <BrandLogo variant="full" className="w-44 h-44" />
          <p className="text-sm text-on-surface-variant">Acesso administrativo</p>
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

        {!isFirebaseConfigured() ? (
          <p className="text-xs text-on-surface-variant">
            Firebase não configurado: modo local ativo com dados espelhados.
          </p>
        ) : null}

        {error ? <p className="text-sm text-error font-medium">{error}</p> : null}

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Entrando...' : 'Entrar'}
        </Button>
      </Card>
    </div>
  );
}
