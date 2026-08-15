import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';

const demoAccounts = {
  admin: { email: 'admin@freelanoleste.local', password: 'admin123' },
  owner: { email: 'dono@bar.local', password: 'demo123' },
  freela: { email: 'freela@freelanoleste.local', password: 'demo123' },
};

const copy = {
  owner: {
    title: 'Login do bar',
    hint: 'Painel do contratante. Caixa e estoque ficam no tenant, não aqui.',
  },
  freela: {
    title: 'Login do freela',
    hint: 'Painel do profissional. Sem acesso ao operacional do bar.',
  },
  admin: {
    title: 'Login admin',
    hint: 'Somente a plataforma. Tenants e splits Stripe.',
  },
};

function homeFor(role) {
  if (role === 'admin') return '/admin';
  if (role === 'freela') return '/freela';
  if (role === 'owner') return '/bar';
  return '/';
}

export function RoleLoginPage({ role }) {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const demo = demoAccounts[role];
  const [email, setEmail] = useState(demo.email);
  const [password, setPassword] = useState(demo.password);
  const [error, setError] = useState('');

  if (isAuthenticated) {
    return <Navigate to={location.state?.from || homeFor(user.role)} replace />;
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      const session = login({ email, password, role });
      navigate(location.state?.from || homeFor(session.role), { replace: true });
    } catch (err) {
      setError(err.message || 'Falha no login.');
    }
  }

  const text = copy[role];

  return (
    <div className="min-h-dvh bg-surface text-on-surface px-4 md:px-8 py-12">
      <div className="max-w-md mx-auto space-y-8">
        <Link
          to="/login"
          className="inline-flex items-center min-h-11 font-semibold text-sm"
        >
          Voltar à escolha de perfil
        </Link>
        <div>
          <h1 className="font-headline text-3xl font-extrabold mb-2">{text.title}</h1>
          <p className="text-on-surface-variant text-sm">{text.hint}</p>
        </div>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
              E-mail
            </span>
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
              Senha
            </span>
            <input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
            />
          </label>
          {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
          <Button type="submit" className="w-full" variant="dark">
            Continuar
          </Button>
        </form>
      </div>
    </div>
  );
}
