import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCashFlow, fetchInventory, removeCashExpense, removeCashIncome } from '../services/dashboardService';
import { linkedPurchase, linkedSale } from '../services/movementLink';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { DateRangeField } from '../components/ui/DateRangeField';
import { FilterBar } from '../components/ui/FilterBar';
import { MetricCard, MetricGrid } from '../components/ui/MetricCard';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, EmptyRow, StatusPill, TableActions, TBody, Td, Th, THead, Tr } from '../components/ui/DataTable';
import { Tabs } from '../components/ui/Tabs';
import { Pagination } from '../components/ui/Pagination';
import { usePagedList } from '../components/ui/usePagedList';
import { useModal } from '../contexts/ModalContext';
import { useToast } from '../contexts/ToastContext';
import {
  buildCashFlowCsv,
  buildCashFlowSummary,
  downloadCsv,
  inDateRange,
  natureLabel,
  startOfMonthIso,
  toIsoDate,
  unifyCashMovements,
} from '../services/cashFlowUtils';

const movementFilters = [
  { id: 'todas', label: 'Todas as Movimentações' },
  { id: 'entrada', label: 'Apenas Entradas' },
  { id: 'saida', label: 'Apenas Saídas' },
];

export function CashFlowPage() {
  const [fromDate, setFromDate] = useState(startOfMonthIso);
  const [toDate, setToDate] = useState(toIsoDate);
  const [movementFilter, setMovementFilter] = useState('todas');
  const { openModal } = useModal();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['cash-flow'],
    queryFn: fetchCashFlow,
  });
  const inventory = useQuery({
    queryKey: ['inventory'],
    queryFn: fetchInventory,
  });

  const filteredIncomes = useMemo(() => {
    return (data?.incomes || []).filter((row) => inDateRange(row.date, fromDate, toDate));
  }, [data, fromDate, toDate]);

  const rangedExpenses = useMemo(() => {
    return (data?.expenses || []).filter((row) => inDateRange(row.date, fromDate, toDate));
  }, [data, fromDate, toDate]);

  const summary = useMemo(
    () => buildCashFlowSummary(filteredIncomes, rangedExpenses),
    [filteredIncomes, rangedExpenses]
  );

  const movements = useMemo(() => {
    const source = Array.isArray(data?.movements)
      ? data.movements
      : unifyCashMovements(data?.incomes || [], data?.expenses || []);
    return source.filter((row) => {
      if (!inDateRange(row.date, fromDate, toDate)) return false;
      if (movementFilter !== 'todas' && row.tipo !== movementFilter) return false;
      return true;
    });
  }, [data, fromDate, toDate, movementFilter]);

  const movementPage = usePagedList(movements, `${fromDate}|${toDate}|${movementFilter}`);
  const summaryCards = [
    { label: 'Receita total', value: summary.totalRevenue, icon: 'payments' },
    { label: 'Despesas totais', value: summary.totalExpenses, icon: 'money_off' },
    { label: 'Despesas fixas', value: summary.fixedExpenses, icon: 'lock' },
    { label: 'Despesas variáveis', value: summary.variableExpenses, icon: 'tune' },
    { label: 'Lucro estimado', value: summary.estimatedProfit, icon: 'trending_up' },
    { label: 'Lucro líquido', value: summary.netProfit, icon: 'account_balance' },
  ];

  function refreshCashFlow() {
    queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
    queryClient.invalidateQueries({ queryKey: ['suppliers'] });
  }

  function handleExport() {
    if (!data) return;
    const csv = buildCashFlowCsv({
      ...data,
      incomes: filteredIncomes,
      expenses: rangedExpenses,
      summary,
    });
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`fluxo-caixa-${stamp}.csv`, csv);
    toast.success('Relatório CSV exportado.');
  }

  function openDetail(row) {
    const sales = inventory.data?.sales || [];
    const purchases = inventory.data?.purchases || [];
    openModal('movement-detail', {
      movement: row,
      sale: row.tipo === 'entrada' ? linkedSale(sales, row) : null,
      purchase: row.tipo === 'saida' ? linkedPurchase(purchases, row.id) : null,
    });
  }

  function openEdit(row) {
    if (row.tipo === 'entrada') {
      openModal('new-order', { income: row, onSuccess: refreshCashFlow });
      return;
    }
    openModal('new-expense', {
      expense: row,
      categories: data?.categories,
      onSuccess: refreshCashFlow,
    });
  }

  function confirmDelete(row) {
    const entrada = row.tipo === 'entrada';
    openModal('confirm', {
      message: `Excluir a ${entrada ? 'entrada' : 'despesa'} "${row.entidade || row.descricao}" (${row.valor})?`,
      confirmLabel: 'Excluir',
      successMessage: entrada ? 'Entrada removida.' : 'Despesa removida.',
      errorMessage: entrada ? 'Falha ao excluir entrada.' : 'Falha ao excluir despesa.',
      onConfirm: async () => {
        if (entrada) await removeCashIncome(row.id);
        else await removeCashExpense(row.id);
        refreshCashFlow();
      },
    });
  }

  if (isLoading || !data) {
    return (
      <div className="p-4 md:p-8 text-on-surface-variant font-body">Carregando fluxo de caixa...</div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 font-body">
      <PageHeader
        title="Fluxo de Caixa"
        description="Visão consolidada da saúde financeira do Artisan Lounge"
      />

      <MetricGrid>
        {summaryCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </MetricGrid>

      <FilterBar
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Icon name="download" />
              Exportar relatório
            </Button>
            <Button
              variant="dark"
              className="disabled:cursor-not-allowed"
              disabled
              aria-disabled="true"
              title="Importação de extrato desativada"
            >
              <Icon name="file_upload" />
              Importar extrato/pdf
            </Button>
          </>
        }
      >
        <DateRangeField
          from={fromDate}
          to={toDate}
          onChange={({ from, to }) => {
            setFromDate(from);
            setToDate(to);
          }}
        />
      </FilterBar>

      <Tabs items={movementFilters} value={movementFilter} onChange={setMovementFilter} />

      <div className="space-y-4">
      <DataTable>
        <THead>
          <Th>Data/Hora</Th>
          <Th>Descrição</Th>
          <Th>Fornecedor/Origem</Th>
          <Th>Categoria</Th>
          <Th align="right">Valor</Th>
          <Th align="right">Ações</Th>
        </THead>
        <TBody>
          {movementPage.rows.map((row) => (
            <Tr
              key={`${row.tipo}-${row.id}`}
              tone={row.tipo === 'saida' && movementFilter !== 'saida' ? 'out' : undefined}
              onClick={() => openDetail(row)}
            >
              <Td tone="muted" className="whitespace-nowrap">
                {row.data_hora}
              </Td>
              <Td tone="strong">{row.descricao}</Td>
              <Td>{row.entidade || '—'}</Td>
              <Td>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={row.tipo === 'entrada' ? 'accent' : 'neutral'}>
                    <Icon name={row.categoryIcon} className="text-sm" />
                    {row.categoria}
                  </StatusPill>
                  {row.tipo === 'saida' ? (
                    <StatusPill tone={row.nature === 'fixed' ? 'accent' : 'neutral'}>
                      {natureLabel(row.nature)}
                    </StatusPill>
                  ) : null}
                </div>
              </Td>
              <Td align="right" tone={row.tipo === 'entrada' ? 'positive' : 'danger'}>
                {row.valor}
              </Td>
              <Td align="right">
                <TableActions>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    onClick={(event) => {
                      event.stopPropagation();
                      openEdit(row);
                    }}
                    aria-label={row.tipo === 'entrada' ? 'Editar entrada' : 'Editar despesa'}
                  >
                    <Icon name="edit" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="danger"
                    onClick={(event) => {
                      event.stopPropagation();
                      confirmDelete(row);
                    }}
                    aria-label={row.tipo === 'entrada' ? 'Excluir entrada' : 'Excluir despesa'}
                  >
                    <Icon name="delete" />
                  </Button>
                </TableActions>
              </Td>
            </Tr>
          ))}
          {!movementPage.rows.length ? (
            <EmptyRow colSpan={6}>Nenhuma movimentação neste filtro.</EmptyRow>
          ) : null}
        </TBody>
      </DataTable>
      <Pagination state={movementPage} />
      </div>
    </div>
  );
}
