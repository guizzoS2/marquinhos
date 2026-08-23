import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  fetchBarSubscription,
  fetchMarketplace,
  FREELA_TAGS,
  formatBrl,
  inviteFreela,
} from '../../services/ownerApi';
import { subscribeFreelaStore } from '../../services/freelaStore';
import { ReviewStars } from '../../components/freela/ReviewStars';
import { Button } from '../../components/Button';

function InviteForm({ person }) {
  const navigate = useNavigate();
  const [date, setDate] = useState('');
  const [amount, setAmount] = useState(String(person.minBaseRate));
  const [error, setError] = useState('');

  function handleInvite(event) {
    event.preventDefault();
    setError('');
    try {
      const result = inviteFreela({
        freelaId: person.id,
        date,
        amount,
        title: `${person.role} — convite`,
      });
      navigate(`/bar/chat/${result.roomId}`);
    } catch (err) {
      setError(err.message || 'Não foi possível convidar.');
    }
  }

  return (
    <form className="space-y-3 pt-2" onSubmit={handleInvite}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block space-y-2">
          <span className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
            Data
          </span>
          <input
            required
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="bar-field w-full min-h-11 px-3 py-3"
          />
        </label>
        <label className="block space-y-2">
          <span className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
            Valor (R$)
          </span>
          <input
            required
            type="number"
            min={person.minBaseRate}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="bar-field w-full min-h-11 px-3 py-3"
          />
        </label>
      </div>
      {error ? <p className="text-sm text-error">{error}</p> : null}
      <Button type="submit" className="w-full">
        Convidar e abrir chat
      </Button>
    </form>
  );
}

export function BarMarketplacePage() {
  const subscription = useMemo(() => fetchBarSubscription(), []);
  const [query, setQuery] = useState('');
  const [maxRate, setMaxRate] = useState('');
  const [minRating, setMinRating] = useState('');
  const [tag, setTag] = useState('');
  const [people, setPeople] = useState(() =>
    fetchMarketplace({ query, maxRate, minRating, tag })
  );

  useEffect(() => {
    setPeople(fetchMarketplace({ query, maxRate, minRating, tag }));
    return subscribeFreelaStore(() => {
      setPeople(fetchMarketplace({ query, maxRate, minRating, tag }));
    });
  }, [query, maxRate, minRating, tag]);

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h2 className="font-display text-4xl uppercase tracking-wide">Vitrine</h2>
        <p className="text-sm text-[var(--muted)]">
          Base da plataforma. Diária no Stripe com split. Sem PIX.
        </p>
      </section>

      {!subscription.active ? (
        <p className="text-sm text-error">
          Assinatura {subscription.status}.{' '}
          <Link to="/bar/pagamentos" className="underline min-h-11 inline-flex items-center">
            Pagamentos
          </Link>
        </p>
      ) : null}

      <form
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="block space-y-2">
          <span className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
            Busca
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nome, função, bio"
            className="bar-field w-full min-h-11 px-3 py-3"
          />
        </label>
        <label className="block space-y-2">
          <span className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
            Piso até
          </span>
          <input
            type="number"
            min="0"
            value={maxRate}
            onChange={(event) => setMaxRate(event.target.value)}
            className="bar-field w-full min-h-11 px-3 py-3"
          />
        </label>
        <label className="block space-y-2">
          <span className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
            Nota mín.
          </span>
          <input
            type="number"
            min="0"
            max="5"
            step="0.1"
            value={minRating}
            onChange={(event) => setMinRating(event.target.value)}
            className="bar-field w-full min-h-11 px-3 py-3"
          />
        </label>
        <label className="block space-y-2">
          <span className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
            Especialidade
          </span>
          <select
            value={tag}
            onChange={(event) => setTag(event.target.value)}
            className="bar-field w-full min-h-11 px-3 py-3"
          >
            <option value="">Todas</option>
            {FREELA_TAGS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </form>

      <ul>
        {people.map((person) => (
          <li key={person.id} className="bar-row">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="w-12 h-12 border-2 border-[var(--ink)] overflow-hidden shrink-0 bg-[var(--sheet,#f7f4ee)]">
                {person.photoDataUrl ? (
                  <img
                    src={person.photoDataUrl}
                    alt={`Foto de ${person.name}`}
                    className="w-full h-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-2xl uppercase">{person.name}</h3>
                  <ReviewStars value={person.rating} />
                </div>
                <p className="text-sm text-[var(--muted)]">{person.role}</p>
                <p className="text-sm">{person.bio}</p>
                <p className="font-mono text-sm">Piso {formatBrl(person.minBaseRate)}</p>
                <div className="flex flex-wrap gap-2">
                  {(person.tags || []).map((item) => (
                    <span key={item} className="bar-sticker text-xs">
                      {item}
                    </span>
                  ))}
                </div>
                {subscription.active ? (
                  <InviteForm person={person} />
                ) : (
                  <p className="text-sm text-[var(--muted)]">Ative a assinatura para convidar.</p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {people.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Nenhum freela com esses filtros.</p>
      ) : null}

      <Link to="/bar/propostas" className="inline-flex min-h-11 items-center">
        <Button variant="secondary">Propostas e chat</Button>
      </Link>
    </div>
  );
}
