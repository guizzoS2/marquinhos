import { useState } from 'react';
import { fetchBarProfile, updateBarProfile } from '../../services/ownerApi';
import { ReviewStars } from '../../components/freela/ReviewStars';
import { Button } from '../../components/Button';

export function BarProfilePage() {
  const [profile, setProfile] = useState(() => fetchBarProfile());
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
      setProfile(updateBarProfile(profile));
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Não foi possível salvar.');
    }
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <section className="space-y-2">
        <h2 className="font-display text-4xl uppercase tracking-wide">Perfil público</h2>
        <p className="text-sm text-[var(--muted)]">
          Como o bar aparece para os freelas. Nota só após diária Stripe.
        </p>
      </section>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="flex flex-col md:flex-row items-start gap-4">
          <div className="w-24 h-24 border-2 border-[var(--ink)] overflow-hidden flex items-center justify-center">
            {profile.photoDataUrl ? (
              <img
                src={profile.photoDataUrl}
                alt="Foto do local"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-[var(--muted)] px-2 text-center">Sem foto</span>
            )}
          </div>
          <label className="block space-y-2 flex-1 w-full">
            <span className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
              Foto do local
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhoto}
              className="bar-field w-full min-h-11 px-3 py-3"
            />
          </label>
        </div>

        <label className="block space-y-2">
          <span className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
            Nome
          </span>
          <input
            required
            value={profile.name}
            onChange={(event) => setProfile({ ...profile, name: event.target.value })}
            className="bar-field w-full min-h-11 px-3 py-3"
          />
        </label>

        <label className="block space-y-2">
          <span className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
            Endereço
          </span>
          <input
            required
            value={profile.address}
            onChange={(event) => setProfile({ ...profile, address: event.target.value })}
            className="bar-field w-full min-h-11 px-3 py-3"
          />
        </label>

        <label className="block space-y-2">
          <span className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
            Descrição
          </span>
          <textarea
            required
            rows={4}
            value={profile.description}
            onChange={(event) => setProfile({ ...profile, description: event.target.value })}
            className="bar-field w-full min-h-11 px-3 py-3"
          />
        </label>

        {error ? <p className="text-sm text-error">{error}</p> : null}
        {saved ? <p className="text-sm text-[var(--spray)]">Perfil atualizado.</p> : null}

        <Button type="submit" className="w-full md:w-auto">
          Salvar perfil
        </Button>
      </form>

      <section className="space-y-4">
        <h3 className="font-display text-2xl uppercase">Notas recebidas</h3>
        {profile.reviews.map((review) => (
          <article key={review.id} className="bar-row">
            <div className="space-y-1">
              <p className="font-display text-xl uppercase">{review.from}</p>
              <ReviewStars value={review.rating} />
              <p className="text-sm">{review.comment}</p>
              <p className="text-xs text-[var(--muted)]">
                {new Date(`${review.date}T12:00:00`).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
