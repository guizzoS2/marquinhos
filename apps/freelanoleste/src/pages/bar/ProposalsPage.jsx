import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchBarJobs,
  fetchBarProposals,
  fetchBarSubscription,
  formatBrl,
  publishOpenJob,
  submitBarReview,
} from '../../services/ownerApi';
import { hasReview, proposalStatusLabel, subscribeFreelaStore } from '../../services/freelaStore';
import { ReviewForm } from '../../components/freela/ReviewForm';
import { ReviewStars } from '../../components/freela/ReviewStars';
import { Button } from '../../components/Button';

export function BarProposalsPage() {
  const navigate = useNavigate();
  const subscription = useMemo(() => fetchBarSubscription(), []);
  const [items, setItems] = useState(() => fetchBarProposals());
  const [jobs, setJobs] = useState(() => fetchBarJobs());
  const [draft, setDraft] = useState({
    title: '',
    date: '',
    suggestedRate: '',
    description: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    function refresh() {
      setItems(fetchBarProposals());
      setJobs(fetchBarJobs());
    }
    return subscribeFreelaStore(refresh);
  }, []);

  const openCount = useMemo(
    () => items.filter((item) => item.status !== 'ACEITA' && item.status !== 'RECUSADA').length,
    [items]
  );

  function handlePublish(event) {
    event.preventDefault();
    setError('');
    try {
      publishOpenJob(draft);
      setDraft({ title: '', date: '', suggestedRate: '', description: '' });
      setJobs(fetchBarJobs());
    } catch (err) {
      setError(err.message || 'Não foi possível publicar a vaga.');
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <section className="space-y-2">
        <h2 className="font-display text-4xl uppercase tracking-wide">Propostas</h2>
        <p className="text-sm text-[var(--muted)]">
          Só deste tenant. {openCount} em aberto.
        </p>
      </section>

      <section className="bar-block space-y-4">
        <h3 className="font-display text-2xl uppercase">Publicar vaga</h3>
        {subscription.active ? (
          <form className="space-y-4" onSubmit={handlePublish}>
            <label className="block space-y-2">
              <span className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
                Função
              </span>
              <input
                required
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                className="bar-field w-full min-h-11 px-3 py-3"
              />
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-2">
                <span className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
                  Data
                </span>
                <input
                  required
                  type="date"
                  value={draft.date}
                  onChange={(event) => setDraft({ ...draft, date: event.target.value })}
                  className="bar-field w-full min-h-11 px-3 py-3"
                />
              </label>
              <label className="block space-y-2">
                <span className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
                  Sugestão (R$)
                </span>
                <input
                  required
                  type="number"
                  min="0"
                  value={draft.suggestedRate}
                  onChange={(event) => setDraft({ ...draft, suggestedRate: event.target.value })}
                  className="bar-field w-full min-h-11 px-3 py-3"
                />
              </label>
            </div>
            <label className="block space-y-2">
              <span className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
                Texto
              </span>
              <textarea
                required
                rows={3}
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                className="bar-field w-full min-h-11 px-3 py-3"
              />
            </label>
            {error ? <p className="text-sm text-error">{error}</p> : null}
            <Button type="submit">Publicar</Button>
          </form>
        ) : (
          <p className="text-sm text-[var(--muted)]">Ative a assinatura para publicar.</p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-2xl uppercase">Vagas</h3>
        {jobs.map((job) => (
          <article key={job.id} className="bar-row">
            <div>
              <p className="font-display text-xl uppercase">{job.title}</p>
              <p className="text-xs text-[var(--muted)]">
                {job.visibility === 'invite' ? 'Convite' : 'Aberta'} ·{' '}
                {new Date(`${job.date}T12:00:00`).toLocaleDateString('pt-BR')} ·{' '}
                {formatBrl(job.suggestedRate)}
              </p>
            </div>
          </article>
        ))}
        {jobs.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Nenhuma vaga neste tenant.</p>
        ) : null}
      </section>

      <div>
        {items.map((item) => (
          <article key={item.id} className="bar-row">
            <div className="min-w-0 space-y-2">
              <p className="font-display text-2xl uppercase">{item.freelaName}</p>
              <p className="text-sm">{item.job?.title || item.room?.title}</p>
              <p className="text-xs text-[var(--muted)]">
                {proposalStatusLabel[item.status]} · {formatBrl(item.lastAmount)}
                {item.isNegotiable ? '' : ' · travado'}
              </p>
              {item.status === 'ACEITA' && item.history ? (
                hasReview(item.history.reviewReceived) ? (
                  <div className="space-y-1">
                    <ReviewStars value={item.history.reviewReceived.rating} />
                    <p className="text-sm">{item.history.reviewReceived.comment}</p>
                  </div>
                ) : (
                  <ReviewForm
                    title="Avalie o freela"
                    onSubmit={({ rating, comment }) =>
                      submitBarReview({ proposalId: item.id, rating, comment })
                    }
                  />
                )
              ) : null}
            </div>
            <Button
              className="w-full md:w-auto"
              onClick={() => navigate(`/bar/chat/${item.roomId}`)}
            >
              Chat
            </Button>
          </article>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">Nenhuma proposta neste tenant.</p>
      ) : null}
    </div>
  );
}
