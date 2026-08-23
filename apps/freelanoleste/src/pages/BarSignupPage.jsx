import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { slugifyTenant } from '../services/platformStore';
import { PosterCard } from '../components/street/PosterCard';
import { RoughButton } from '../components/street/RoughButton';
import { StatusStamp } from '../components/street/StatusStamp';

function homeFor(role) {
  if (role === 'admin') return '/admin';
  if (role === 'owner') return '/bar';
  if (role === 'freela') return '/freela';
  return '/';
}

export function BarSignupPage() {
  const { registerOwner, isAuthenticated, user, isOwner } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    barName: '',
    slug: '',
    ownerName: '',
    email: '',
    password: '',
  });
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) {
    return <Navigate to={isOwner ? '/bar' : homeFor(user.role)} replace />;
  }

  function patch(next) {
    setForm((current) => ({ ...current, ...next }));
  }

  function handleBarName(value) {
    patch({
      barName: value,
      slug: slugTouched ? form.slug : slugifyTenant(value),
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      await registerOwner(form);
      navigate('/bar', { replace: true });
    } catch (err) {
      setError(err.message || 'Não foi possível cadastrar o bar.');
    }
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] px-4 md:px-8 py-12 overflow-x-hidden">
      <div className="max-w-md mx-auto">
        <PosterCard variant="ink" rotate="-rotate-1">
          <StatusStamp>SOU BAR</StatusStamp>
          <h1 className="font-display text-3xl md:text-4xl tracking-tight mt-4 mb-2">
            Abre a casa
          </h1>
          <p className="text-outline text-sm mb-8">
            Cadastro do bar na plataforma. Admin ativa a assinatura. Login continua em /login/bar.
          </p>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="font-display text-sm tracking-widest uppercase">Nome do bar</span>
              <input
                required
                value={form.barName}
                onChange={(event) => handleBarName(event.target.value)}
                className="street-input"
              />
            </label>
            <label className="block space-y-2">
              <span className="font-display text-sm tracking-widest uppercase">Slug</span>
              <input
                required
                value={form.slug}
                onChange={(event) => {
                  setSlugTouched(true);
                  patch({ slug: slugifyTenant(event.target.value) });
                }}
                className="street-input"
              />
            </label>
            <label className="block space-y-2">
              <span className="font-display text-sm tracking-widest uppercase">Nome do dono</span>
              <input
                required
                value={form.ownerName}
                onChange={(event) => patch({ ownerName: event.target.value })}
                className="street-input"
              />
            </label>
            <label className="block space-y-2">
              <span className="font-display text-sm tracking-widest uppercase">E-mail</span>
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) => patch({ email: event.target.value })}
                className="street-input"
              />
            </label>
            <label className="block space-y-2">
              <span className="font-display text-sm tracking-widest uppercase">Senha</span>
              <input
                required
                type="password"
                value={form.password}
                onChange={(event) => patch({ password: event.target.value })}
                className="street-input"
              />
            </label>
            {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
            <RoughButton type="submit" className="w-full">
              Criar bar
            </RoughButton>
          </form>
          <RoughButton to="/login/bar" variant="ghost" className="w-full mt-4">
            Já tenho conta
          </RoughButton>
        </PosterCard>
      </div>
    </div>
  );
}
