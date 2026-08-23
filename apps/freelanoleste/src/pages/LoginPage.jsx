import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { PosterCard } from '../components/street/PosterCard';
import { RoughButton } from '../components/street/RoughButton';
import { StatusStamp } from '../components/street/StatusStamp';

const demoAccounts = {
  admin: { email: 'admin@freelanoleste.local', password: 'admin123' },
  owner: { email: 'dono@bar.local', password: 'demo123' },
  freela: { email: 'freela@freelanoleste.local', password: 'demo123' },
};

const copy = {
  owner: {
    title: 'Login do bar',
    hint: 'Dono e funcionários entram aqui. Permissões vêm da Equipe.',
    stamp: 'SOU BAR',
  },
  freela: {
    title: 'Login do freela',
    hint: 'Painel do profissional. Sem acesso ao operacional do bar.',
    stamp: 'SOU FREELA',
  },
  admin: {
    title: 'Login admin',
    hint: 'Somente a plataforma. Tenants e splits Stripe.',
    stamp: 'ADMIN',
  },
};

function homeFor(role) {
  if (role === 'admin') return '/admin';
  if (role === 'freela') return '/freela';
  if (role === 'owner' || role === 'staff') return '/bar';
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
    <div className="min-h-dvh px-4 md:px-8 py-12 overflow-x-hidden">
      <div className="max-w-md mx-auto space-y-6">
        <RoughButton to="/login" variant="ink" className="w-fit">
          Voltar
        </RoughButton>
        <PosterCard variant="ink" rotate="-rotate-1">
          <StatusStamp rotate="rotate-1">{text.stamp}</StatusStamp>
          <h1 className="font-display text-3xl md:text-4xl tracking-tight mt-4 mb-2">
            {text.title}
          </h1>
          <p className="text-outline text-sm mb-6">{text.hint}</p>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="font-display text-sm tracking-widest uppercase">E-mail</span>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="street-input"
              />
            </label>
            <label className="block space-y-2">
              <span className="font-display text-sm tracking-widest uppercase">Senha</span>
              <input
                required
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="street-input"
              />
            </label>
            {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
            <RoughButton type="submit" className="w-full">
              Continuar
            </RoughButton>
            {role === 'owner' ? (
              <RoughButton to="/cadastro-bar" variant="ghost" className="w-full">
                Cadastrar bar
              </RoughButton>
            ) : null}
            {role === 'freela' ? (
              <RoughButton to="/cadastro-freela" variant="ghost" className="w-full">
                Cadastrar freela
              </RoughButton>
            ) : null}
          </form>
        </PosterCard>
      </div>
    </div>
  );
}
