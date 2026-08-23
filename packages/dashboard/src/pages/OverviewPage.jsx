import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDashboardApi } from '../contexts/DashboardApiContext';
import { WeeklyChart } from '../components/dashboard/WeeklyChart';
import { TopSoldList } from '../components/dashboard/TopSoldList';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { useModal } from '../contexts/ModalContext';

const verdictClass = {
  vermelho: 'bar-stamp bar-stamp-alert',
  limite: 'bar-stamp',
  sobra: 'bar-stamp',
  vazio: 'bar-stamp bar-stamp-muted',
};

export function OverviewPage() {
  const { api, tenantId, tenantName } = useDashboardApi();
  const { openModal } = useModal();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['overview', tenantId],
    queryFn: api.fetchOverview,
  });

  if (isLoading || !data) {
    return <p className="text-[var(--muted,#5c5c5c)]">Abrindo o caixa...</p>;
  }

  const verdict = data.verdict || { id: 'vazio', label: 'SEM MOVIMENTO' };

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="font-display text-sm tracking-[0.28em] text-[var(--muted,#5c5c5c)]">
            OPERAÇÕES · HOJE
          </p>
          <h2 className="font-display text-4xl md:text-5xl tracking-wide uppercase mt-1">
            Visão geral
          </h2>
        </div>
        <p className={verdictClass[verdict.id] || 'bar-stamp'}>{verdict.label}</p>
      </header>

      <section className="bar-strip">
        {data.metrics.map((metric) => (
          <div key={metric.id} className="bar-strip-cell">
            <p className="font-display text-sm tracking-widest uppercase text-[var(--muted,#5c5c5c)]">
              {metric.label}
            </p>
            <p
              className={
                metric.id === 'revenue'
                  ? 'font-spray text-3xl mt-1'
                  : 'font-mono text-2xl mt-1'
              }
            >
              {metric.value}
            </p>
            {metric.badge ? (
              <p className="text-xs text-[var(--muted,#5c5c5c)] mt-1">{metric.badge}</p>
            ) : null}
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <WeeklyChart data={data.weeklyPerformance} />
        <TopSoldList items={data.topSold} />
      </div>

      {data.suggestion ? (
        <section className="bar-block space-y-3">
          <h3 className="font-display text-2xl uppercase tracking-wide">{data.suggestion.title}</h3>
          <p className="text-sm text-[var(--muted,#5c5c5c)] max-w-xl">{data.suggestion.description}</p>
          <Button
            onClick={() =>
              openModal('stock-entry', {
                onSuccess: () => {
                  queryClient.invalidateQueries({ queryKey: ['inventory', tenantId] });
                  queryClient.invalidateQueries({ queryKey: ['cash-flow', tenantId] });
                  queryClient.invalidateQueries({ queryKey: ['overview', tenantId] });
                },
              })
            }
          >
            Entrada de estoque
          </Button>
        </section>
      ) : null}

      <p className="text-xs text-[var(--muted,#5c5c5c)]">{tenantName}</p>

      <button
        type="button"
        onClick={() =>
          openModal('new-order', {
            onSuccess: () => {
              queryClient.invalidateQueries({ queryKey: ['cash-flow', tenantId] });
              queryClient.invalidateQueries({ queryKey: ['overview', tenantId] });
            },
          })
        }
        className="fixed bottom-6 right-4 md:bottom-8 md:right-8 w-14 h-14 min-h-14 min-w-14 bg-[var(--spray,#FFDB15)] text-[var(--ink,#111)] border-2 border-[var(--ink,#111)] flex items-center justify-center z-50"
        aria-label="Nova venda"
      >
        <Icon name="add" className="text-3xl" />
        <span className="sr-only">Nova venda</span>
      </button>
    </div>
  );
}
