import { useState } from 'react';
import { fetchFreelaProfile, updateFreelaProfile } from '../../services/freelaApi';
import { Button } from '../../components/Button';

export function FreelaProfilePage() {
  const [profile, setProfile] = useState(() => fetchFreelaProfile());
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function handlePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setProfile((current) => ({ ...current, photoDataUrl: String(reader.result || '') }));
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSaved(false);
    try {
      const next = updateFreelaProfile(profile);
      setProfile(next);
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Não foi possível salvar.');
    }
  }

  return (
    <div className="space-y-6 md:space-y-8 max-w-2xl">
      <section className="space-y-2">
        <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight">
          Perfil profissional
        </h2>
        <p className="text-on-surface-variant text-sm">
          Visível para donos assinantes. Valor mínimo base trava propostas abaixo desse piso.
        </p>
      </section>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="flex flex-col md:flex-row items-start gap-4">
          <div className="w-24 h-24 rounded-2xl bg-surface-container-low overflow-hidden flex items-center justify-center">
            {profile.photoDataUrl ? (
              <img
                src={profile.photoDataUrl}
                alt="Foto do perfil"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-on-surface-variant px-2 text-center">Sem foto</span>
            )}
          </div>
          <label className="block space-y-2 flex-1 w-full">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
              Foto
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhoto}
              className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11 file:mr-3 file:border-0 file:bg-primary file:rounded-lg file:px-3 file:py-2 file:min-h-11"
            />
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
            Nome
          </span>
          <input
            required
            value={profile.name}
            onChange={(event) => setProfile({ ...profile, name: event.target.value })}
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
            Função
          </span>
          <input
            required
            value={profile.role}
            onChange={(event) => setProfile({ ...profile, role: event.target.value })}
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
            Bio
          </span>
          <textarea
            required
            rows={4}
            value={profile.bio}
            onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
          />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
              Idade
            </span>
            <input
              required
              type="number"
              min="18"
              value={profile.age}
              onChange={(event) => setProfile({ ...profile, age: event.target.value })}
              className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
            />
          </label>
          <label className="block space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
              Valor mínimo base (R$)
            </span>
            <input
              required
              type="number"
              min="0"
              step="1"
              value={profile.minBaseRate}
              onChange={(event) =>
                setProfile({ ...profile, minBaseRate: event.target.value })
              }
              className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
            />
          </label>
        </div>

        {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
        {saved ? (
          <p className="text-sm font-medium bg-primary/20 rounded-2xl p-4">Perfil atualizado.</p>
        ) : null}

        <Button type="submit" className="w-full md:w-auto">
          Salvar perfil
        </Button>
      </form>
    </div>
  );
}
