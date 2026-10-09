import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchInventory, fetchOverview } from '../services/dashboardService';
import { MetricCard, MetricGrid } from '../components/ui/MetricCard';
import { PageHeader } from '../components/ui/PageHeader';
import { TrendChart } from '../components/dashboard/TrendChart';
import { GroupSalesList } from '../components/dashboard/GroupSalesList';
import { TopSoldList } from '../components/dashboard/TopSoldList';
import { Icon } from '../components/ui/Icon';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { FieldModal } from '../components/ui/FieldModal';
import { DataTable, TBody, Td, Th, THead, Tr } from '../components/ui/DataTable';
import { Pagination } from '../components/ui/Pagination';
import { usePagedList } from '../components/ui/usePagedList';
import { useModal } from '../contexts/ModalContext';

const periods = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mês' },
  { id: 'ano', label: 'Ano' },
];

export function OverviewPage() {
  const [period, setPeriod] = useState('mes');
  const [kpi, setKpi] = useState(null);
  const { openModal } = useModal();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['overview', period],
    queryFn: () => fetchOverview(period),
  });
  const inventory = useQuery({ queryKey: ['inventory'], queryFn: fetchInventory });
  const kpiPage = usePagedList(kpi?.entries || [], kpi?.id || '', { after: 20, pageSize: 20 });
  const alerts = data?.alerts || [];

  function openProduct(productId) {
    const item = (inventory.data?.items || []).find((row) => String(row.id) === String(productId));
    if (!item) return;
    openModal('product-detail', {
      item,
      canDelete: false,
      onEdit: () =>
        openModal('edit-product', {
          item,
          categories: inventory.data?.filters,
          onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        }),
      onDelete: () => {},
    });
  }

  return (
    <>
      <div className="p-4 md:p-8 space-y-6">
        <PageHeader title="Visão geral" description="Acompanhe o resultado, os alertas e o que mais vende.">
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
              {data.kpis.map((card) => (
                <MetricCard key={card.id} {...card} onClick={() => setKpi(card)} />
              ))}
            </MetricGrid>

            <div className="grid grid-cols-1 items-stretch gap-4 md:gap-6 lg:grid-cols-3">
              <TrendChart points={data.series} unit={data.seriesUnit} />
              <section className="flex h-full min-w-0 flex-col rounded-xl border border-outline bg-surface p-4 md:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-extrabold">Alertas do sistema</h2>
                </div>
                {alerts.length ? (
                  <div className="flex min-h-0 flex-1 flex-col justify-center">
                    <ul className="divide-y divide-outline-variant overflow-y-auto">
                      {alerts.map((alert) => (
                        <li key={alert.id}>
                          <button
                            type="button"
                            onClick={() => openProduct(alert.productId)}
                            className="flex min-h-11 w-full items-center gap-3 py-3 text-left first:pt-0 last:pb-0"
                          >
                            <Icon name={alert.icon || 'warning'} className="text-error" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-on-surface">{alert.name}</p>
                              <p className="text-xs text-on-surface-variant">{alert.detail}</p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="flex flex-1 items-center text-sm text-on-surface-variant">Nenhum alerta.</p>
                )}
              </section>
            </div>

            <div className="grid grid-cols-1 items-stretch gap-4 md:gap-6 lg:grid-cols-2">
              <GroupSalesList slices={data.groups} />
              <TopSoldList items={data.topSold} onOpen={(item) => openProduct(item.id)} />
            </div>
          </>
        )}
      </div>
      {kpi ? (
        <FieldModal wide title={kpi.label} icon={kpi.icon || 'payments'} onClose={() => setKpi(null)}>
          <p className="font-headline text-2xl font-extrabold text-on-surface">{kpi.value}</p>
          {(kpi.entries || []).length ? (
            <DataTable>
              <THead>
                <Th>Data</Th>
                <Th>Origem</Th>
                <Th align="right">Valor</Th>
              </THead>
              <TBody>
                {kpiPage.rows.map((row) => (
                  <Tr key={row.id}>
                    <Td tone="muted" className="whitespace-nowrap">
                      {row.when}
                    </Td>
                    <Td>
                      <p className="font-semibold text-on-surface">{row.title}</p>
                      {row.detail && row.detail !== row.title ? (
                        <p className="text-xs text-on-surface-variant">{row.detail}</p>
                      ) : null}
                    </Td>
                    <Td align="right" tone={row.tone === 'positive' ? 'positive' : 'danger'}>
                      {row.value}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </DataTable>
          ) : (
            <p className="text-sm text-on-surface-variant">Nada neste período.</p>
          )}
          <Pagination compact state={kpiPage} />
        </FieldModal>
      ) : null}
    </>
  );
}
