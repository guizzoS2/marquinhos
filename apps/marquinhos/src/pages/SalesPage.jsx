import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCashFlow, fetchInventory, removeCashIncome } from '../services/dashboardService';
import { unifyCashMovements } from '../services/cashFlowUtils';
import { PAYMENT_OPTIONS } from '../services/inventoryProduct';
import { Button } from '../components/ui/Button';
import { DataTable, EmptyRow, StatusPill, TableActions, TBody, Td, Th, THead, Tr } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { usePagedList } from '../components/ui/usePagedList';
import { useModal } from '../contexts/ModalContext';

function isPdvEntry(row) {
  return row.source === 'pdv' || String(row.description || '').startsWith('PDV');
}

function payLabel(value) {
  return PAYMENT_OPTIONS.find((item) => item.value === value)?.label || '';
}

function linkedSale(sales, row) {
  if (row.saleId) {
    const found = (sales || []).find((sale) => String(sale.id) === String(row.saleId));
    if (found) return found;
  }
  const payId = String(row.id || '').replace(/^inc-/, '');
  if (!payId || payId === String(row.id || '')) return null;
  return (
    (sales || []).find((sale) => {
      const current = (sale.pagamentos || []).some((pay) => String(pay.id) === payId);
      const past = (sale.historico || []).some((cycle) =>
        (cycle.pagamentos || []).some((pay) => String(pay.id) === payId)
      );
      return current || past;
    }) || null
  );
}

function productText(sale, row) {
  const payId = String(row.id || '').replace(/^inc-/, '');
  const past = (sale?.historico || []).find((cycle) =>
    (cycle.pagamentos || []).some((pay) => String(pay.id) === payId)
  );
  const itens = past?.itens?.length ? past.itens : sale?.itens || [];
  const line = itens.map((item) => `${item.nome || 'Produto'} × ${item.quantidade}`).join(', ');
  return line || '—';
}

function paymentText(sale, row) {
  const payId = String(row.id || '').replace(/^inc-/, '');
  const lists = [
    ...(sale?.pagamentos || []),
    ...(sale?.historico || []).flatMap((cycle) => cycle.pagamentos || []),
  ];
  const payment = lists.find((pay) => String(pay.id) === payId);
  return payLabel(payment?.forma_pagamento) || '—';
}

export function SalesPage({ embedded = false }) {
  const { openModal } = useModal();
  const queryClient = useQueryClient();
  const inventory = useQuery({
    queryKey: ['inventory'],
    queryFn: fetchInventory,
  });
  const cash = useQuery({
    queryKey: ['cash-flow'],
    queryFn: fetchCashFlow,
  });
  const data = inventory.data;

  const entries = useMemo(() => {
    return unifyCashMovements(cash.data?.incomes || [], []).filter(isPdvEntry);
  }, [cash.data]);
  const entryPage = usePagedList(entries, entries.map((row) => row.id).join('|'));

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
    queryClient.invalidateQueries({ queryKey: ['caixa-shift'] });
  }

  function openEdit(row) {
    openModal('new-order', { income: row, onSuccess: refresh });
  }

  function confirmDelete(row) {
    openModal('confirm', {
      message: `Excluir a entrada "${row.descricao}" (${row.valor})?`,
      confirmLabel: 'Excluir',
      successMessage: 'Entrada removida.',
      errorMessage: 'Falha ao excluir entrada.',
      onConfirm: async () => {
        await removeCashIncome(row.id);
        refresh();
      },
    });
  }

  if (inventory.isLoading || cash.isLoading || !data || !cash.data) {
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
          description="Entradas do PDV. A mesma linha aparece no fluxo de caixa."
        />
      )}
      <FilterBar
        actions={
          <Button
            onClick={() =>
              openModal('new-sale', {
                items: data?.items || [],
                promotions: data?.promotions || [],
                sales: data?.sales || [],
                serverNow: data?.serverNow,
                onSuccess: refresh,
              })
            }
          >
            <Icon name="add" />
            Nova venda
          </Button>
        }
      />
      <div className="space-y-4">
        <DataTable>
          <THead>
            <Th>Data/Hora</Th>
            <Th>Descrição</Th>
            <Th>Origem</Th>
            <Th>Produtos</Th>
            <Th>Pagamento</Th>
            <Th>Categoria</Th>
            <Th align="right">Valor</Th>
            <Th align="right">Ações</Th>
          </THead>
          <TBody>
            {entries.length === 0 ? (
              <EmptyRow colSpan={8}>Nenhuma venda registrada.</EmptyRow>
            ) : (
              entryPage.rows.map((row) => {
                const sale = linkedSale(data?.sales || [], row);
                return (
                  <Tr key={row.id}>
                    <Td tone="muted" className="whitespace-nowrap">
                      {row.data_hora}
                    </Td>
                    <Td tone="strong">{row.descricao}</Td>
                    <Td>{row.entidade || sale?.cliente_nome || 'PDV'}</Td>
                    <Td tone="muted">{sale ? productText(sale, row) : '—'}</Td>
                    <Td>{sale ? paymentText(sale, row) : '—'}</Td>
                    <Td>
                      <StatusPill tone="accent">
                        <Icon name={row.categoryIcon || 'payments'} className="text-sm" />
                        {row.categoria || 'Varejo'}
                      </StatusPill>
                    </Td>
                    <Td align="right" tone="strong">
                      {row.valor}
                    </Td>
                    <Td align="right">
                      <TableActions>
                        <Button
                          type="button"
                          size="icon"
                          variant="secondary"
                          onClick={() => openEdit(row)}
                          aria-label="Editar entrada"
                        >
                          <Icon name="edit" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="danger"
                          onClick={() => confirmDelete(row)}
                          aria-label="Excluir entrada"
                        >
                          <Icon name="delete" />
                        </Button>
                      </TableActions>
                    </Td>
                  </Tr>
                );
              })
            )}
          </TBody>
        </DataTable>
        <Pagination state={entryPage} />
      </div>
    </div>
  );
}
