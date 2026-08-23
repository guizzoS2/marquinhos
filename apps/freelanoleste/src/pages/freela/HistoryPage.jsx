import { useEffect, useState } from 'react';
import { fetchHistory, formatBrl, submitFreelaReview } from '../../services/freelaApi';
import { hasReview, subscribeFreelaStore } from '../../services/freelaStore';
import { DataTable } from '../../components/admin/DataTable';
import { ReviewForm } from '../../components/freela/ReviewForm';
import { ReviewStars } from '../../components/freela/ReviewStars';
import { Button } from '../../components/Button';

const PAGE_SIZE = 5;

function ReviewBlock({ item }) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Review ao bar
        </p>
        {hasReview(item.reviewGiven) ? (
          <>
            <ReviewStars value={item.reviewGiven.rating} />
            <p className="text-sm">{item.reviewGiven.comment}</p>
          </>
        ) : item.proposalId ? (
          <ReviewForm
            title="Avalie o bar"
            onSubmit={({ rating, comment }) =>
              submitFreelaReview({ proposalId: item.proposalId, rating, comment })
            }
          />
        ) : (
          <p className="text-sm text-on-surface-variant">Sem review deste lado.</p>
        )}
      </div>
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
          Review recebido
        </p>
        {hasReview(item.reviewReceived) ? (
          <>
            <ReviewStars value={item.reviewReceived.rating} />
            <p className="text-sm">{item.reviewReceived.comment}</p>
          </>
        ) : (
          <p className="text-sm text-on-surface-variant">Aguardando review do bar.</p>
        )}
      </div>
    </div>
  );
}

export function FreelaHistoryPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(() => fetchHistory({ page, pageSize: PAGE_SIZE }));

  useEffect(() => {
    setData(fetchHistory({ page, pageSize: PAGE_SIZE }));
    return subscribeFreelaStore(() => {
      setData(fetchHistory({ page, pageSize: PAGE_SIZE }));
    });
  }, [page]);

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl">
      <section className="space-y-2">
        <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight">
          Histórico e avaliações
        </h2>
        <p className="text-on-surface-variant text-sm">
          Só os seus turnos. Review depois de proposta aceita (pagamento mock).
        </p>
      </section>

      {data.items.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Nenhum turno no seu histórico.</p>
      ) : null}

      <div className="flex flex-col gap-4 md:hidden">
        {data.items.map((job) => (
          <article
            key={job.id}
            className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm space-y-3 min-h-11"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-headline font-bold">{job.barName}</p>
                <p className="text-sm text-on-surface-variant">{job.title}</p>
              </div>
              <p className="font-bold whitespace-nowrap">{formatBrl(job.amountReceived)}</p>
            </div>
            <p className="text-xs text-on-surface-variant">
              {new Date(`${job.date}T12:00:00`).toLocaleDateString('pt-BR')} · {job.stripeTransferId}
            </p>
            <ReviewBlock item={job} />
          </article>
        ))}
      </div>

      <div className="hidden md:block">
        {data.items.length ? (
          <DataTable
            columns={['Bar', 'Turno', 'Recebido', 'Review ao bar', 'Review recebido']}
          >
            {data.items.map((job) => (
              <tr key={job.id} className="bg-surface-container-lowest">
                <td className="px-4 md:px-6 py-4 font-bold whitespace-nowrap">{job.barName}</td>
                <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                  {job.title}
                  <p className="text-xs text-on-surface-variant">
                    {new Date(`${job.date}T12:00:00`).toLocaleDateString('pt-BR')}
                  </p>
                </td>
                <td className="px-4 md:px-6 py-4 font-bold whitespace-nowrap">
                  {formatBrl(job.amountReceived)}
                </td>
                <td className="px-4 md:px-6 py-4 min-w-56">
                  {hasReview(job.reviewGiven) ? (
                    <>
                      <ReviewStars value={job.reviewGiven.rating} />
                      <p className="text-xs text-on-surface-variant mt-1">
                        {job.reviewGiven.comment}
                      </p>
                    </>
                  ) : job.proposalId ? (
                    <ReviewForm
                      title="Avalie o bar"
                      onSubmit={({ rating, comment }) =>
                        submitFreelaReview({ proposalId: job.proposalId, rating, comment })
                      }
                    />
                  ) : (
                    <p className="text-sm text-on-surface-variant">Sem review.</p>
                  )}
                </td>
                <td className="px-4 md:px-6 py-4 min-w-56">
                  {hasReview(job.reviewReceived) ? (
                    <>
                      <ReviewStars value={job.reviewReceived.rating} />
                      <p className="text-xs text-on-surface-variant mt-1">
                        {job.reviewReceived.comment}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-on-surface-variant">Aguardando o bar.</p>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
        ) : null}
      </div>

      <div className="flex items-center justify-center gap-3">
        <Button
          variant="secondary"
          disabled={page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          Anterior
        </Button>
        <p className="text-sm text-on-surface-variant">
          {page} / {data.pages}
        </p>
        <Button
          variant="secondary"
          disabled={page >= data.pages}
          onClick={() => setPage((current) => Math.min(data.pages, current + 1))}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}
