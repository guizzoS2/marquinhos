import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FREELA_TAGS } from '../services/ownerStore';
import { fileToDataUrl } from '../services/photo';
import { PosterCard } from '../components/street/PosterCard';
import { RoughButton } from '../components/street/RoughButton';
import { StatusStamp } from '../components/street/StatusStamp';

function homeFor(role) {
  if (role === 'admin') return '/admin';
  if (role === 'owner') return '/bar';
  if (role === 'freela') return '/freela';
  return '/';
}

export function FreelaSignupPage() {
  const { registerFreela, isAuthenticated, user, isFreela } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    tags: [],
    bio: '',
    experience: '',
    age: '',
    minBaseRate: '',
    photoDataUrl: '',
  });
  const [error, setError] = useState('');

  if (isAuthenticated) {
    return <Navigate to={isFreela ? '/freela' : homeFor(user.role)} replace />;
  }

  function patch(next) {
    setForm((current) => ({ ...current, ...next }));
  }

  function toggleTag(tag) {
    setForm((current) => ({
      ...current,
      tags: current.tags.includes(tag)
        ? current.tags.filter((item) => item !== tag)
        : [...current.tags, tag],
    }));
  }

  async function handlePhoto(event) {
    const file = event.target.files?.[0];
    setError('');
    if (!file) {
      patch({ photoDataUrl: '' });
      return;
    }
    try {
      const photoDataUrl = await fileToDataUrl(file);
      patch({ photoDataUrl });
    } catch (err) {
      event.target.value = '';
      patch({ photoDataUrl: '' });
      setError(err.message || 'Foto inválida.');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      await registerFreela(form);
      navigate('/freela', { replace: true });
    } catch (err) {
      setError(err.message || 'Não foi possível criar o perfil.');
    }
  }

  return (
    <div className="min-h-[calc(100dvh-4rem)] px-4 md:px-8 py-12 overflow-x-hidden">
      <div className="max-w-md mx-auto">
        <PosterCard variant="ink" rotate="-rotate-1">
          <StatusStamp>SOU FREELA</StatusStamp>
          <h1 className="font-display text-3xl md:text-4xl tracking-tight mt-4 mb-2">
            Cola teu nome
          </h1>
          <p className="text-outline text-sm mb-8">
            Cadastro na plataforma, não no painel de um bar. Depois do envio você já entra no
            perfil.
          </p>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="font-display text-sm tracking-widest uppercase">Foto</span>
              {form.photoDataUrl ? (
                <img
                  src={form.photoDataUrl}
                  alt="Prévia da foto"
                  className="w-20 h-20 object-cover border-2 border-primary"
                />
              ) : null}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhoto}
                className="street-input"
              />
            </label>
            <label className="block space-y-2">
              <span className="font-display text-sm tracking-widest uppercase">Nome</span>
              <input
                required
                value={form.name}
                onChange={(event) => patch({ name: event.target.value })}
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
            <label className="block space-y-2">
              <span className="font-display text-sm tracking-widest uppercase">Função</span>
              <input
                required
                placeholder="Barman, garçom, cozinha..."
                value={form.role}
                onChange={(event) => patch({ role: event.target.value })}
                className="street-input"
              />
            </label>
            <fieldset className="space-y-2">
              <legend className="font-display text-sm tracking-widest uppercase">Tags</legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FREELA_TAGS.map((tag) => (
                  <label key={tag} className="flex items-center gap-3 min-h-11">
                    <input
                      type="checkbox"
                      checked={form.tags.includes(tag)}
                      onChange={() => toggleTag(tag)}
                      className="w-5 h-5 accent-primary"
                    />
                    <span className="text-sm">{tag}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block space-y-2">
              <span className="font-display text-sm tracking-widest uppercase">Bio</span>
              <textarea
                required
                rows={3}
                value={form.bio}
                onChange={(event) => patch({ bio: event.target.value })}
                className="street-input"
              />
            </label>
            <label className="block space-y-2">
              <span className="font-display text-sm tracking-widest uppercase">
                Experiência
              </span>
              <textarea
                required
                rows={3}
                value={form.experience}
                onChange={(event) => patch({ experience: event.target.value })}
                className="street-input"
              />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block space-y-2">
                <span className="font-display text-sm tracking-widest uppercase">Idade</span>
                <input
                  required
                  type="number"
                  min="18"
                  value={form.age}
                  onChange={(event) => patch({ age: event.target.value })}
                  className="street-input"
                />
              </label>
              <label className="block space-y-2">
                <span className="font-display text-sm tracking-widest uppercase">
                  Piso (R$)
                </span>
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={form.minBaseRate}
                  onChange={(event) => patch({ minBaseRate: event.target.value })}
                  className="street-input"
                />
              </label>
            </div>
            {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
            <RoughButton type="submit" className="w-full">
              Criar perfil
            </RoughButton>
          </form>
        </PosterCard>
      </div>
    </div>
  );
}
