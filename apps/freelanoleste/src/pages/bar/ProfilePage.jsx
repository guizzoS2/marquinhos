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
    <div className="space-y-6 md:space-y-8 max-w-3xl">
      <section className="space-y-2">
        <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight">
          Perfil público do bar
        </h2>
        <p className="text-on-surface-variant text-sm">
          Como o estabelecimento aparece para os freelas na plataforma. Notas só após diária Stripe.
        </p>
      </section>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="flex flex-col md:flex-row items-start gap-4">
          <div className="w-24 h-24 rounded-2xl bg-surface-container-low overflow-hidden flex items-center justify-center">
            {profile.photoDataUrl ? (
              <img
                src={profile.photoDataUrl}
                alt="Foto do local"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs text-on-surface-variant px-2 text-center">Sem foto</span>
            )}
          </div>
          <label className="block space-y-2 flex-1 w-full">
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
              Foto do local
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
            Endereço
          </span>
          <input
            required
            value={profile.address}
            onChange={(event) => setProfile({ ...profile, address: event.target.value })}
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
            Descrição
          </span>
          <textarea
            required
            rows={4}
            value={profile.description}
            onChange={(event) => setProfile({ ...profile, description: event.target.value })}
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
          />
        </label>

        {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
        {saved ? (
          <p className="text-sm font-medium bg-primary/20 rounded-2xl p-4">Perfil público atualizado.</p>
        ) : null}

        <Button type="submit" className="w-full md:w-auto">
          Salvar perfil
        </Button>
      </form>

      <section className="space-y-4">
        <h3 className="font-headline font-bold text-xl">Notas recebidas</h3>
        <div className="flex flex-col gap-3">
          {profile.reviews.map((review) => (
            <article
              key={review.id}
              className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm space-y-2"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <p className="font-semibold">{review.from}</p>
                <ReviewStars value={review.rating} />
              </div>
              <p className="text-sm">{review.comment}</p>
              <p className="text-xs text-on-surface-variant">
                {new Date(`${review.date}T12:00:00`).toLocaleDateString('pt-BR')}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
