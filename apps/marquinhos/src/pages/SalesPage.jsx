import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchInventory } from '../services/dashboardService';
import { formatSaleStamp, paidSalesOnDay, productTotals, shiftAlreadyClosed, totalsByPayment } from '../services/saleRules';
import { Button } from '../components/ui/Button';
import { DataTable, EmptyRow, TableActions, TBody, Td, Th, THead, Tr } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { usePagedList } from '../components/ui/usePagedList';
import { useModal } from '../contexts/ModalContext';

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function SalesPage({ embedded = false }) {
  const { openModal } = useModal();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: fetchInventory,
  });

  const closings = useMemo(() => {
    return [...(data?.closings || [])].sort((left, right) =>
      String(right.closed_at || '').localeCompare(String(left.closed_at || ''))
    );
  }, [data]);
  const page = usePagedList(closings, String(closings.length));

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['caixa-shift'] });
  }

  function openClose() {
    const paid = paidSalesOnDay(data?.sales || []);
    const totais = totalsByPayment(paid);
    openModal('close-day', {
      lines: productTotals(paid),
      byMethod: totais.byMethod,
      total: totais.total,
      count: paid.length,
      alreadyClosed: shiftAlreadyClosed(data?.closings || []),
      onSuccess: refresh,
    });
  }

  function openClosing(closing) {
    const ids = new Set((closing.sale_ids || []).map(String));
    const linked = (data?.sales || []).filter((sale) => ids.has(String(sale.id)));
    const lines = closing.produtos?.length ? closing.produtos : productTotals(linked);
    openModal('close-day', {
      lines,
      byMethod: closing.totais?.byMethod || {},
      total: closing.totais?.total || 0,
      count: closing.vendas ?? closing.sale_ids?.length ?? linked.length,
      readOnly: true,
    });
  }

  if (isLoading || !data) {
    return (
      <div className={embedded ? 'text-on-surface-variant' : 'p-4 font-body text-on-surface-variant md:p-8'}>
        Carregando vendas...
      </div>
    );
  }

  return (
    <div className={embedded ? 'space-y-6' : 'space-y-6 p-4 font-body md:p-8'}>
      {embedded ? null : (
        <PageHeader
          title="Vendas"
          description="Fechamento do caixa do dia, com os produtos vendidos e o montante."
        />
      )}
      <FilterBar
        actions={
          <>
            <Button variant="secondary" onClick={openClose}>
              <Icon name="lock" />
              Fechar caixa
            </Button>
            <Button onClick={() => navigate('/pdv')}>
              <Icon name="add" />
              Nova venda
            </Button>
          </>
        }
      />
      <div className="space-y-4">
        <DataTable>
          <THead>
            <Th>Data</Th>
            <Th>Hora</Th>
            <Th align="right">Vendas</Th>
            <Th align="right">Total</Th>
            <Th align="right">Ações</Th>
          </THead>
          <TBody>
            {closings.length === 0 ? (
              <EmptyRow colSpan={5}>Nenhum fechamento registrado.</EmptyRow>
            ) : (
              page.rows.map((closing) => {
                const stamp = formatSaleStamp(closing.closed_at);
                const count = closing.vendas ?? closing.sale_ids?.length ?? 0;
                return (
                  <Tr key={closing.id}>
                    <Td tone="muted">{stamp.data}</Td>
                    <Td tone="muted">{stamp.hora}</Td>
                    <Td align="right">{count}</Td>
                    <Td align="right" tone="strong">
                      {money(closing.totais?.total)}
                    </Td>
                    <Td align="right">
                      <TableActions>
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          onClick={() => openClosing(closing)}
                          aria-label="Ver fechamento"
                        >
                          <Icon name="visibility" />
                        </Button>
                      </TableActions>
                    </Td>
                  </Tr>
                );
              })
            )}
          </TBody>
        </DataTable>
        <Pagination state={page} />
      </div>
    </div>
  );
}
