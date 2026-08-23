import { useState } from 'react';
import { fetchFreelaProfile, updateFreelaProfile } from '../../services/freelaApi';
import { FREELA_TAGS } from '../../services/ownerStore';
import { fileToDataUrl } from '../../services/photo';
import { Button } from '../Button';

export function FreelaProfileForm({ onSaved }) {
  const [profile, setProfile] = useState(() => fetchFreelaProfile());
  const [error, setError] = useState('');

  async function handlePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const photoDataUrl = await fileToDataUrl(file);
      setProfile((current) => ({ ...current, photoDataUrl }));
    } catch (err) {
      event.target.value = '';
      setError(err.message || 'Foto inválida.');
    }
  }

  function toggleTag(tag) {
    setProfile((current) => {
      const tags = Array.isArray(current.tags) ? current.tags : [];
      return {
        ...current,
        tags: tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag],
      };
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      const next = updateFreelaProfile(profile);
      setProfile(next);
      onSaved?.(next);
    } catch (err) {
      setError(err.message || 'Não foi possível salvar.');
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <p className="text-on-surface-variant text-sm">
        Visível para donos assinantes. Piso trava propostas abaixo desse valor.
      </p>

      <div className="flex flex-col md:flex-row items-start gap-4">
        <div className="w-20 h-20 rounded-2xl bg-surface-container-low overflow-hidden flex items-center justify-center shrink-0">
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
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
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
        <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
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
        <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
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
        <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Bio
        </span>
        <textarea
          required
          rows={3}
          value={profile.bio}
          onChange={(event) => setProfile({ ...profile, bio: event.target.value })}
          className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Experiência
        </span>
        <textarea
          required
          rows={2}
          value={profile.experience || ''}
          onChange={(event) => setProfile({ ...profile, experience: event.target.value })}
          className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
        />
      </label>

      <fieldset className="space-y-2">
        <legend className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Tags
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FREELA_TAGS.map((tag) => {
            const tags = Array.isArray(profile.tags) ? profile.tags : [];
            return (
              <label key={tag} className="flex items-center gap-3 min-h-11">
                <input
                  type="checkbox"
                  checked={tags.includes(tag)}
                  onChange={() => toggleTag(tag)}
                  className="w-5 h-5 accent-primary"
                />
                <span className="text-sm">{tag}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
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
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Piso (R$)
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

      <Button type="submit" className="w-full min-h-11">
        Salvar
      </Button>
    </form>
  );
}
