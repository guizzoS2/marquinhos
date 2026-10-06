import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchOverview } from '../services/dashboardService';
import { MetricCard } from '../components/ui/MetricCard';
import { WeeklyChart } from '../components/dashboard/WeeklyChart';
import { TopSoldList } from '../components/dashboard/TopSoldList';
import { Button } from '../components/ui/Button';
import { useModal } from '../contexts/ModalContext';

export function OverviewPage() {
  const { openModal } = useModal();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['overview'],
    queryFn: fetchOverview,
  });

  if (isLoading || !data) {
    return <div className="p-4 md:p-8 text-on-surface-variant font-body">Carregando visão geral...</div>;
  }

  return (
    <>
      <div className="p-4 md:p-8 space-y-6 md:space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {(data.metrics || []).map((metric) => (
            <MetricCard key={metric.id} {...metric} />
          ))}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <WeeklyChart data={data.weeklyPerformance} />
          <TopSoldList items={data.topSold} />
        </div>

        {data.suggestion ? <section className="bg-primary/5 rounded-2xl p-4 md:p-8 border border-primary/10 flex flex-col md:flex-row items-center gap-6 md:gap-8">
          <div className="md:w-1/4">
            <img
              alt="Stock Promotion"
              className="rounded-xl shadow-xl rotate-3"
              src={data.suggestion.image}
            />
          </div>
          <div className="flex-1 space-y-4 text-center md:text-left">
            <h2 className="text-2xl font-black text-on-primary-container tracking-tight">
              {data.suggestion.title}
            </h2>
            <p className="text-on-surface-variant max-w-xl text-lg leading-relaxed">
              {data.suggestion.description}
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <Button
                onClick={() =>
                  openModal('stock-entry', {
                    onSuccess: () => {
                      queryClient.invalidateQueries({ queryKey: ['inventory'] });
                      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
                      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
                    },
                  })
                }
              >
                Configurar agora
              </Button>
              <Button variant="secondary">Ignorar</Button>
            </div>
          </div>
        </section> : null}
      </div>

      <footer className="mt-auto p-4 md:p-8 text-center text-xs text-on-surface-variant/60 font-medium">
        © {new Date().getFullYear()} Marquinho's. Bar e petiscos.
      </footer>
    </>
  );
}
