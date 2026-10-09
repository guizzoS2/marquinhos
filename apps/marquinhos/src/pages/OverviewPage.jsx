import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchOverview } from '../services/dashboardService';
import { MetricCard, MetricGrid } from '../components/ui/MetricCard';
import { PageHeader } from '../components/ui/PageHeader';
import { TrendChart } from '../components/dashboard/TrendChart';
import { CategoryDonut } from '../components/dashboard/CategoryDonut';
import { TopSoldList } from '../components/dashboard/TopSoldList';
import { Icon } from '../components/ui/Icon';
import { SegmentedControl } from '../components/ui/SegmentedControl';

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
  const alerts = data?.alerts || [];

  return (
    <>
      <div className="p-4 md:p-8 space-y-6">
        <PageHeader title="Visão Geral" description="Acompanhe o resultado, os alertas e o que mais vende.">
          <SegmentedControl
            variant="primary"
            label="Período"
            items={periods}
            value={period}
            onChange={setPeriod}
          />
        </PageHeader>

        {isLoading || !data ? (
          <p className="text-on-surface-variant font-body">Carregando visão geral...</p>
        ) : (
          <>
            <MetricGrid>
              {data.kpis.map((kpi) => (
                <MetricCard key={kpi.id} {...kpi} />
              ))}
            </MetricGrid>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              <TrendChart points={data.series} unit={data.seriesUnit} />
              <CategoryDonut slices={data.categories} total={data.categoriesTotal} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              <section className="h-full bg-surface border border-outline rounded-xl p-4 md:p-5">
                <h2 className="text-xl font-extrabold mb-4">Alertas do Sistema</h2>
                {alerts.length ? (
                  <ul className="divide-y divide-outline-variant">
                    {alerts.map((alert) => (
                      <li key={alert.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
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
    </>
  );
}
