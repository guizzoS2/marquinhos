import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  applyToJob,
  fetchJobs,
  fetchFreelaProfile,
  formatBrl,
} from '../../services/freelaApi';
import { proposalStatusLabel } from '../../services/freelaStore';
import { Button } from '../../components/Button';

export function FreelaJobsPage() {
  const navigate = useNavigate();
  const profile = useMemo(() => fetchFreelaProfile(), []);
  const [jobs, setJobs] = useState(() => fetchJobs());
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState('');

  function patchDraft(jobId, patch) {
    setDrafts((current) => ({
      ...current,
      [jobId]: { locked: false, amount: '', ...current[jobId], ...patch },
    }));
  }

  function handleApply(job) {
    const draft = drafts[job.id] || {};
    setError('');
    try {
      const result = applyToJob({
        jobId: job.id,
        amount: draft.amount || job.suggestedRate,
        isNegotiable: !draft.locked,
      });
      setJobs(fetchJobs());
      navigate(`/freela/chat/${result.roomId}`);
    } catch (err) {
      setError(err.message || 'Falha ao enviar proposta.');
    }
  }

  return (
    <div className="space-y-6 md:space-y-8 max-w-4xl">
      <section className="space-y-2">
        <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight">
          Vagas e propostas
        </h2>
        <p className="text-on-surface-variant text-sm">
          Candidatura abre uma sala de chat da vaga. Valor travado bloqueia contra-proposta.
          Piso atual: {formatBrl(profile.minBaseRate)}.
        </p>
      </section>

      {error ? <p className="text-sm text-error font-medium">{error}</p> : null}

      <div className="grid grid-cols-1 gap-4">
        {jobs.map((job) => {
          const draft = drafts[job.id] || {
            amount: String(job.suggestedRate),
            locked: false,
          };
          const proposal = job.proposal;

          return (
            <article
              key={job.id}
              className="bg-surface-container-lowest rounded-2xl p-4 md:p-6 shadow-sm space-y-4 min-h-11"
            >
              <div className="flex flex-col gap-2">
                <p className="font-headline font-bold text-lg">{job.barName}</p>
                <p className="text-sm">{job.title}</p>
                <p className="text-xs text-on-surface-variant">
                  {new Date(`${job.date}T12:00:00`).toLocaleDateString('pt-BR')} · sugestão{' '}
                  {formatBrl(job.suggestedRate)}
                </p>
                <p className="text-sm text-on-surface-variant">{job.description}</p>
              </div>

              {proposal ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <p className="text-sm">
                    {proposalStatusLabel[proposal.status]} · {formatBrl(proposal.lastAmount)}
                    {proposal.isNegotiable ? '' : ' · valor travado'}
                  </p>
                  <Button
                    className="w-full sm:w-auto"
                    onClick={() => navigate(`/freela/chat/${proposal.roomId}`)}
                  >
                    Abrir chat
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block space-y-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
                      Sua proposta (R$)
                    </span>
                    <input
                      type="number"
                      min={profile.minBaseRate}
                      value={draft.amount}
                      onChange={(event) => patchDraft(job.id, { amount: event.target.value })}
                      className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
                    />
                  </label>
                  <label className="flex items-center gap-3 min-h-11">
                    <input
                      type="checkbox"
                      checked={Boolean(draft.locked)}
                      onChange={(event) =>
                        patchDraft(job.id, { locked: event.target.checked })
                      }
                      className="w-5 h-5 accent-primary"
                    />
                    <span className="text-sm">
                      Valor travado — só aceite ou recusa, sem contra-proposta
                    </span>
                  </label>
                  <Button className="w-full min-h-11" onClick={() => handleApply(job)}>
                    Enviar proposta e abrir chat
                  </Button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
