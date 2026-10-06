import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchOverview } from '../services/dashboardService';
import { MetricCard } from '../components/ui/MetricCard';
import { TopSoldList } from '../components/dashboard/TopSoldList';
import { Icon } from '../components/ui/Icon';

const periods = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mês' },
  { id: 'ano', label: 'Ano' },
];

export function OverviewPage() {
  const [period, setPeriod] = useState('mes');
  const { data, isLoading } = useQuery({
    queryKey: ['overview', period],
    queryFn: () => fetchOverview(period),
  });

  return (
    <>
      <div className="p-4 md:p-8 space-y-6 md:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-on-surface font-headline">
              Visão Geral
            </h1>
            <p className="text-on-surface-variant text-sm">Leitura do período. Nada é editado aqui.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {periods.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPeriod(item.id)}
                className={
                  period === item.id
                    ? 'px-4 py-2 min-h-11 rounded-full text-sm font-semibold bg-primary text-on-primary'
                    : 'px-4 py-2 min-h-11 rounded-full text-sm font-medium bg-surface-container-low text-on-surface-variant'
                }
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading || !data ? (
          <p className="text-on-surface-variant font-body">Carregando visão geral...</p>
        ) : (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
              {data.kpis.map((kpi) => (
                <MetricCard key={kpi.id} {...kpi} />
              ))}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              <section className="bg-surface-container-lowest p-4 md:p-8 rounded-xl shadow-sm">
                <h2 className="text-xl font-extrabold tracking-tight mb-6">Alertas do Sistema</h2>
                {data.alerts?.length ? (
                  <ul className="space-y-4">
                    {data.alerts.map((alert) => (
                      <li key={alert.id} className="flex items-start gap-3">
                        <Icon name={alert.icon || 'warning'} className="text-error" />
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-on-surface truncate">{alert.name}</p>
                          <p className="text-xs text-on-surface-variant">{alert.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-on-surface-variant">Nenhum alerta.</p>
                )}
              </section>
              <TopSoldList items={data.topSold} />
            </div>
          </>
        )}
      </div>

      <footer className="mt-auto p-4 md:p-8 text-center text-xs text-on-surface-variant/60 font-medium">
        © {new Date().getFullYear()} Marquinho's. Bar e petiscos.
      </footer>
    </>
  );
}
