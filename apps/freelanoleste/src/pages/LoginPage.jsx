import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AuthField, AuthScreen, AuthSubmit, AuthSwitchLink } from '../components/auth/AuthScreen';

const demoAccounts = {
  admin: { email: 'admin@freelanoleste.local', password: 'admin123' },
  owner: { email: 'dono@bar.local', password: 'demo123' },
  freela: { email: 'freela@freelanoleste.local', password: 'demo123' },
};

const copy = {
  owner: {
    title: 'Bar',
    hint: 'Painel do seu bar: operacional e marketplace.',
    signupTo: '/cadastro/bar',
  },
  freela: {
    title: 'Freela',
    hint: 'Painel do profissional. Sem acesso ao operacional do bar.',
    signupTo: '/cadastro/freela',
  },
  admin: {
    title: 'Admin',
    hint: 'Somente a plataforma. Tenants e splits Stripe.',
    signupTo: null,
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
  const tone = role === 'owner' ? 'bar' : 'freela';

  return (
    <AuthScreen title={text.title} hint={text.hint} tone={tone}>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <AuthField
          id={`${role}-email`}
          label="E-mail"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <AuthField
          id={`${role}-password`}
          label="Senha"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
        <AuthSubmit>Entrar</AuthSubmit>
      </form>
      {text.signupTo ? (
        <AuthSwitchLink to={text.signupTo} prompt="Não tem conta?" action="Criar" />
      ) : null}
    </AuthScreen>
  );
}
