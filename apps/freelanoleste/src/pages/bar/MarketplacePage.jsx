import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  fetchBarSubscription,
  fetchMarketplace,
  FREELA_TAGS,
  formatBrl,
} from '../../services/ownerApi';
import { ReviewStars } from '../../components/freela/ReviewStars';
import { Button } from '../../components/Button';

export function BarMarketplacePage() {
  const subscription = useMemo(() => fetchBarSubscription(), []);
  const [query, setQuery] = useState('');
  const [maxRate, setMaxRate] = useState('');
  const [minRating, setMinRating] = useState('');
  const [tag, setTag] = useState('');
  const people = useMemo(
    () => fetchMarketplace({ query, maxRate, minRating, tag }),
    [query, maxRate, minRating, tag]
  );

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl">
      <section className="space-y-2">
        <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight">
          Vitrine de freelas
        </h2>
        <p className="text-on-surface-variant text-sm">
          Busca na base da plataforma. Contratação e diária passam pelo Stripe com split. Sem PIX.
        </p>
      </section>

      {!subscription.active ? (
        <p className="text-sm font-medium bg-error/10 text-error rounded-2xl p-4">
          Assinatura Stripe {subscription.status}. Marketplace restrito até o pagamento no Customer
          Portal.{' '}
          <Link to="/bar/pagamentos" className="font-semibold underline min-h-11 inline-flex items-center">
            Gerenciar pagamentos
          </Link>
        </p>
      ) : null}

      <form
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
            Busca
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Nome, função, bio"
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
            Valor mínimo até (R$)
          </span>
          <input
            type="number"
            min="0"
            value={maxRate}
            onChange={(event) => setMaxRate(event.target.value)}
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
            Nota mínima
          </span>
          <input
            type="number"
            min="0"
            max="5"
            step="0.1"
            value={minRating}
            onChange={(event) => setMinRating(event.target.value)}
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
            Especialidade
          </span>
          <select
            value={tag}
            onChange={(event) => setTag(event.target.value)}
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
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

      <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {people.map((person) => (
          <li
            key={person.id}
            className="bg-surface-container-lowest rounded-2xl p-4 md:p-6 shadow-sm space-y-3 min-h-11"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-headline font-bold text-lg">{person.name}</h3>
                <p className="text-sm text-on-surface-variant">{person.role}</p>
              </div>
              <ReviewStars value={person.rating} />
            </div>
            <p className="text-sm text-on-surface-variant">{person.bio}</p>
            <p className="text-sm font-semibold">Piso {formatBrl(person.minBaseRate)}</p>
            <p className="text-xs text-on-surface-variant">{person.reviewCount} reviews</p>
            <div className="flex flex-wrap gap-2">
              {person.tags.map((item) => (
                <span
                  key={item}
                  className="px-3 py-2 min-h-11 inline-flex items-center rounded-xl bg-surface-container text-xs font-medium"
                >
                  {item}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>

      {people.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Nenhum freela com esses filtros.</p>
      ) : null}

      <Link to="/bar/propostas">
        <Button variant="secondary">Ver propostas e chat</Button>
      </Link>
    </div>
  );
}
