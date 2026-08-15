import { useMemo, useState } from 'react';
import { fetchHistory, formatBrl } from '../../services/freelaApi';
import { DataTable } from '../../components/admin/DataTable';
import { ReviewStars } from '../../components/freela/ReviewStars';
import { Button } from '../../components/Button';

const PAGE_SIZE = 5;

export function FreelaHistoryPage() {
  const [page, setPage] = useState(1);
  const data = useMemo(() => fetchHistory({ page, pageSize: PAGE_SIZE }), [page]);

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl">
      <section className="space-y-2">
        <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight">
          Histórico e avaliações
        </h2>
        <p className="text-on-surface-variant text-sm">
          Trabalhos concluídos com pagamento Stripe. Review dado ao bar e review recebido.
        </p>
      </section>

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
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Review ao bar
              </p>
              <ReviewStars value={job.reviewGiven.rating} />
              <p className="text-sm">{job.reviewGiven.comment}</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Review recebido
              </p>
              <ReviewStars value={job.reviewReceived.rating} />
              <p className="text-sm">{job.reviewReceived.comment}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden md:block">
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
                <ReviewStars value={job.reviewGiven.rating} />
                <p className="text-xs text-on-surface-variant mt-1">{job.reviewGiven.comment}</p>
              </td>
              <td className="px-4 md:px-6 py-4 min-w-56">
                <ReviewStars value={job.reviewReceived.rating} />
                <p className="text-xs text-on-surface-variant mt-1">
                  {job.reviewReceived.comment}
                </p>
              </td>
            </tr>
          ))}
        </DataTable>
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
