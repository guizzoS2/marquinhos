import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';

const roles = [
  { id: 'owner', label: 'Dono do bar' },
  { id: 'freela', label: 'Freela' },
  { id: 'admin', label: 'Admin da plataforma' },
];

const demoAccounts = {
  admin: { email: 'admin@freelanoleste.local', password: 'admin123' },
  owner: { email: 'dono@bar.local', password: 'demo123' },
  freela: { email: 'freela@freelanoleste.local', password: 'demo123' },
};

function homeFor(role) {
  if (role === 'admin') return '/admin';
  if (role === 'freela') return '/freela';
  if (role === 'owner') return '/bar';
  return '/';
}

export function LoginPage() {
  const { login, isAdmin, isFreela, isOwner, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [role, setRole] = useState('admin');
  const [email, setEmail] = useState(demoAccounts.admin.email);
  const [password, setPassword] = useState(demoAccounts.admin.password);
  const [error, setError] = useState('');

  if (isAuthenticated && isAdmin) {
    return <Navigate to={location.state?.from || '/admin'} replace />;
  }
  if (isAuthenticated && isFreela) {
    return <Navigate to={location.state?.from || '/freela'} replace />;
  }
  if (isAuthenticated && isOwner) {
    return <Navigate to={location.state?.from || '/bar'} replace />;
  }

  function selectRole(id) {
    setRole(id);
    setEmail(demoAccounts[id].email);
    setPassword(demoAccounts[id].password);
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

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="font-headline text-3xl font-extrabold mb-2">Entrar</h1>
      <p className="text-on-surface-variant text-sm mb-8">
        Admin → /admin. Freela → /freela. Dono → /bar. Caixa/estoque não ficam nesta app.
      </p>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="flex flex-col sm:flex-row gap-2 p-1 bg-surface-container-low rounded-2xl">
          {roles.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => selectRole(item.id)}
              className={
                role === item.id
                  ? 'flex-1 px-3 py-2 min-h-11 rounded-xl bg-primary text-on-primary text-xs font-semibold'
                  : 'flex-1 px-3 py-2 min-h-11 rounded-xl text-on-surface-variant text-xs font-medium'
              }
            >
              {item.label}
            </button>
          ))}
        </div>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
            E-mail
          </span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
          />
        </label>
        {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
        <Button type="submit" className="w-full" variant="dark">
          Continuar
        </Button>
        <p className="text-[11px] text-on-surface-variant">
          Demo dono: dono@bar.local / demo123
        </p>
      </form>
    </div>
  );
}
