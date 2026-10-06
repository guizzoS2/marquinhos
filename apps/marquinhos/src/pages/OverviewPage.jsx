import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchOverview } from '../services/dashboardService';
import { MetricCard } from '../components/ui/MetricCard';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { usePagedList } from '../components/ui/usePagedList';
import { TrendChart } from '../components/dashboard/TrendChart';
import { CategoryDonut } from '../components/dashboard/CategoryDonut';
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
  const alertPage = usePagedList(data?.alerts || [], period);

  return (
    <>
      <div className="p-4 md:p-8 space-y-6 md:space-y-8">
        <PageHeader title="Visão Geral" description="Leitura do período. Nada é editado aqui.">
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
        </PageHeader>

        {isLoading || !data ? (
          <p className="text-on-surface-variant font-body">Carregando visão geral...</p>
        ) : (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {data.kpis.map((kpi, index) => (
                <MetricCard key={kpi.id} {...kpi} accent={index} />
              ))}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              <TrendChart points={data.series} unit={data.seriesUnit} />
              <CategoryDonut slices={data.categories} total={data.categoriesTotal} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              <section className="bg-surface-container-lowest p-4 md:p-8 rounded-xl shadow-sm">
                <h2 className="text-xl font-extrabold mb-6">Alertas do Sistema</h2>
                {alertPage.rows.length ? (
                  <ul className="space-y-4">
                    {alertPage.rows.map((alert) => (
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
                <div className="mt-6">
                  <Pagination
                    page={alertPage.current}
                    pageCount={alertPage.pageCount}
                    onPage={alertPage.setPage}
                  />
                </div>
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
