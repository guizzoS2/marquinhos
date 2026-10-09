import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCashFlow, fetchInventory, removeCashExpense, removeCashIncome } from '../services/dashboardService';
import { linkedPurchase, linkedSale, movementCycle, saleOnPromo } from '../services/movementLink';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { DateRangeField } from '../components/ui/DateRangeField';
import { FieldModal } from '../components/ui/FieldModal';
import { FilterBar } from '../components/ui/FilterBar';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { MetricCard, MetricGrid } from '../components/ui/MetricCard';
import { PageHeader } from '../components/ui/PageHeader';
import { DataTable, EmptyRow, StatusPill, TableActions, Tag, TBody, Td, Th, THead, Tr } from '../components/ui/DataTable';
import { Tabs } from '../components/ui/Tabs';
import { Pagination } from '../components/ui/Pagination';
import { usePagedList } from '../components/ui/usePagedList';
import { useModal } from '../contexts/ModalContext';
import { useToast } from '../contexts/ToastContext';
import { expenseTag, incomeGroupTags, movementCopy } from '../services/catalogTaxonomy';
import {
  buildCashFlowSummary,
  buildMovementCsv,
  downloadCsv,
  formatIsoRange,
  inDateRange,
  natureLabel,
  startOfMonthIso,
  toIsoDate,
  unifyCashMovements,
} from '../services/cashFlowUtils';

function ExpenseTag({ row }) {
  const tag = expenseTag(row.categoryId, { icon: row.categoryIcon, name: row.categoria });
  return (
    <Tag tone={tag.tone} icon={tag.icon}>
      {row.categoria}
    </Tag>
  );
}

const movementFilters = [
  { id: 'todas', label: 'Todas as movimentações' },
  { id: 'entrada', label: 'Apenas entradas' },
  { id: 'saida', label: 'Apenas saídas' },
];

function mapMovements(data, inventory, from, to, movementFilter) {
  const source = Array.isArray(data?.movements)
    ? data.movements
    : unifyCashMovements(data?.incomes || [], data?.expenses || []);
  const sales = inventory?.sales || [];
  const purchases = inventory?.purchases || [];
  const products = inventory?.items || [];
  return source
    .filter((row) => {
      if (!inDateRange(row.date, from, to)) return false;
      if (movementFilter !== 'todas' && row.tipo !== movementFilter) return false;
      return true;
    })
    .map((row) => {
      const sale = linkedSale(sales, row);
      const purchase = row.tipo === 'saida' ? linkedPurchase(purchases, row.id) : null;
      const copy = movementCopy(row, { sale, purchase, products });
      return {
        ...row,
        descricao: copy.descricao,
        description: copy.descricao,
        categoria: copy.categoria,
        entidade: copy.origem || row.entidade,
        promocao: Boolean(sale && saleOnPromo(sale, row)),
        comanda: Boolean(sale?.numero_comanda),
        groupTags: row.tipo === 'entrada' ? incomeGroupTags({ ...row, categoria: copy.categoria }, sale, products) : [],
      };
    });
}

function ExportReportForm({ fromDate, toDate, movementFilter, inventory, data, onClose }) {
  const toast = useToast();
  const [mode, setMode] = useState('filtro');
  const [from, setFrom] = useState(fromDate);
  const [to, setTo] = useState(toDate);
  const filterLabel = movementFilters.find((item) => item.id === movementFilter)?.label || 'Todas as movimentações';

  function submit() {
    const start = mode === 'filtro' ? fromDate : from;
    const end = mode === 'filtro' ? toDate : to;
    if (mode === 'outro' && (!start || !end)) {
      toast.error('Selecione a data inicial e a final.');
      return;
    }
    const rows = mapMovements(data, inventory, start, end, movementFilter);
    if (!rows.length) {
      toast.error('Nenhuma movimentação neste período.');
      return;
    }
    const stamp = `${start || 'inicio'}-${end || 'hoje'}`;
    downloadCsv(`fluxo-caixa-${stamp}.csv`, buildMovementCsv(rows));
    toast.success('Relatório CSV exportado.');
    onClose();
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-on-surface-variant">
        O arquivo sai com data/hora, descrição, origem, categoria e valor. O tipo segue o filtro da tela: {filterLabel.toLowerCase()}.
      </p>
      <SegmentedControl
        label="Período do relatório"
        className="w-full"
        value={mode}
        onChange={setMode}
        items={[
          { id: 'filtro', label: 'Período do filtro' },
          { id: 'outro', label: 'Outro período' },
        ]}
      />
      {mode === 'filtro' ? (
        <p className="text-sm font-semibold text-on-surface">{formatIsoRange(fromDate, toDate)}</p>
      ) : (
        <DateRangeField
          from={from}
          to={to}
          onChange={({ from: nextFrom, to: nextTo }) => {
            setFrom(nextFrom);
            setTo(nextTo);
          }}
        />
      )}
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>
          <Icon name="cancel" />
          Cancelar
        </Button>
        <Button type="button" onClick={submit}>
          <Icon name="download" />
          Exportar
        </Button>
      </div>
    </div>
  );
}

export function CashFlowPage() {
  const [fromDate, setFromDate] = useState(startOfMonthIso);
  const [toDate, setToDate] = useState(toIsoDate);
  const [movementFilter, setMovementFilter] = useState('todas');
  const [report, setReport] = useState(null);
  const { openModal } = useModal();
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

  const movements = useMemo(
    () => mapMovements(data, inventory.data, fromDate, toDate, movementFilter),
    [data, inventory.data, fromDate, toDate, movementFilter]
  );

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
      const sale = linkedSale(inventory.data?.sales || [], row);
      const cycle = movementCycle(sale, row);
      if (sale && cycle && !cycle.past) {
        openModal('new-sale', {
          sale,
          items: inventory.data?.items || [],
          promotions: inventory.data?.promotions || [],
          sales: inventory.data?.sales || [],
          serverNow: inventory.data?.serverNow,
          onSuccess: refreshCashFlow,
        });
        return;
      }
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
        title="Fluxo de caixa"
        description="Acompanhe entradas, saídas e o resultado do período."
      />

      <MetricGrid>
        {summaryCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </MetricGrid>

      <FilterBar
        actions={
          <Button variant="secondary" onClick={() => setReport('export')}>
            <Icon name="download" />
            Exportar relatório
          </Button>
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
          <Th>Origem</Th>
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
                  {row.tipo === 'entrada' ? (
                    (row.groupTags || []).map((tag) => (
                      <Tag key={tag.label} tone={tag.tone} icon={tag.icon}>
                        {tag.label}
                      </Tag>
                    ))
                  ) : (
                    <ExpenseTag row={row} />
                  )}
                  {row.tipo === 'entrada' && row.comanda ? (
                    <StatusPill tone="ink">
                      <Icon name="receipt_long" className="text-sm" />
                      Comanda
                    </StatusPill>
                  ) : null}
                  {row.promocao ? (
                    <StatusPill tone="success">
                      <Icon name="sell" className="text-sm" />
                      Promoção
                    </StatusPill>
                  ) : null}
                  {row.tipo === 'saida' ? (
                    <StatusPill tone={row.nature === 'fixed' ? 'ink' : 'neutral'}>
                      <Icon name={row.nature === 'fixed' ? 'lock' : 'tune'} className="text-sm" />
                      {natureLabel(row.nature)}
                    </StatusPill>
                  ) : null}
                </div>
              </Td>
              <Td align="right" tone={row.tipo === 'entrada' ? 'positive' : 'danger'}>
                {row.valor}
              </Td>
              <Td align="right" nowrap>
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

      {report === 'export' ? (
        <FieldModal title="Exportar relatório" icon="download" onClose={() => setReport(null)}>
          <ExportReportForm
            fromDate={fromDate}
            toDate={toDate}
            movementFilter={movementFilter}
            inventory={inventory.data}
            data={data}
            onClose={() => setReport(null)}
          />
        </FieldModal>
      ) : null}
    </div>
  );
}
