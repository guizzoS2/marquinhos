import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCashFlow, removeCashExpense } from '../services/dashboardService';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { MetricCard } from '../components/ui/MetricCard';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { Pagination } from '../components/ui/Pagination';
import { usePagedList } from '../components/ui/usePagedList';
import { useModal } from '../contexts/ModalContext';
import { useToast } from '../contexts/ToastContext';
import {
  buildCashFlowCsv,
  buildCashFlowSummary,
  downloadCsv,
  formatIsoRange,
  inDateRange,
  natureLabel,
  startOfMonthIso,
  toIsoDate,
  unifyCashMovements,
} from '../services/cashFlowUtils';

const natureFilters = [
  { id: 'all', label: 'Todas' },
  { id: 'fixed', label: 'Fixas' },
  { id: 'variable', label: 'Variáveis' },
];

const movementFilters = [
  { id: 'todas', label: 'Todas as Movimentações' },
  { id: 'entrada', label: 'Apenas Entradas' },
  { id: 'saida', label: 'Apenas Saídas' },
];

export function CashFlowPage() {
  const [fromDate, setFromDate] = useState(startOfMonthIso);
  const [toDate, setToDate] = useState(toIsoDate);
  const [natureFilter, setNatureFilter] = useState('all');
  const [movementFilter, setMovementFilter] = useState('todas');
  const { openModal } = useModal();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['cash-flow'],
    queryFn: fetchCashFlow,
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
      if (row.tipo === 'saida' && natureFilter !== 'all' && row.nature !== natureFilter) return false;
      return true;
    });
  }, [data, fromDate, toDate, movementFilter, natureFilter]);

  const periodLabel = formatIsoRange(fromDate, toDate);
  const movementPage = usePagedList(
    movements,
    `${fromDate}|${toDate}|${movementFilter}|${natureFilter}`
  );
  const summaryCards = [
    { label: 'Receita total', value: summary.totalRevenue, icon: 'payments', badge: summary.revenueDelta },
    { label: 'Despesas totais', value: summary.totalExpenses, icon: 'money_off' },
    { label: 'Despesas fixas', value: summary.fixedExpenses, icon: 'lock' },
    { label: 'Despesas variáveis', value: summary.variableExpenses, icon: 'tune' },
    { label: '% variável / receita', value: summary.variableShare, icon: 'percent' },
    { label: 'Margem contribuição', value: summary.contributionMargin, icon: 'pie_chart' },
    { label: 'Lucro estimado', value: summary.estimatedProfit, icon: 'trending_up' },
    { label: 'Lucro líquido', value: summary.netProfit, icon: 'account_balance' },
  ];

  function refreshCashFlow() {
    queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
    queryClient.invalidateQueries({ queryKey: ['suppliers'] });
  }

  function handleExport() {
    if (!data) return;
    const csv = buildCashFlowCsv(
      { ...data, incomes: filteredIncomes, expenses: rangedExpenses, summary },
      { natureFilter }
    );
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`fluxo-caixa-${stamp}.csv`, csv);
    toast.success('Relatório CSV exportado.');
  }

  function confirmDeleteExpense(row) {
    openModal('confirm', {
      message: `Excluir a despesa "${row.entidade || row.descricao}" (${row.valor})?`,
      confirmLabel: 'Excluir',
      successMessage: 'Despesa removida.',
      errorMessage: 'Falha ao excluir despesa.',
      onConfirm: async () => {
        await removeCashExpense(row.id);
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
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 font-body">
      <PageHeader
        title="Fluxo de Caixa"
        description="Visão consolidada da saúde financeira do Artisan Lounge"
      />

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {summaryCards.map((card, index) => (
          <MetricCard key={card.label} {...card} accent={index} />
        ))}
      </section>

      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
          <label className="block space-y-2 min-w-0">
            <span className="text-xs font-label font-bold text-on-surface-variant uppercase pl-1">
              De
            </span>
            <input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(event) => setFromDate(event.target.value)}
              className="w-full bg-surface-container-low rounded-2xl py-3 px-4 min-h-11 text-on-surface focus:ring-2 focus:ring-primary-container"
            />
          </label>
          <label className="block space-y-2 min-w-0">
            <span className="text-xs font-label font-bold text-on-surface-variant uppercase pl-1">
              Até
            </span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(event) => setToDate(event.target.value)}
              className="w-full bg-surface-container-low rounded-2xl py-3 px-4 min-h-11 text-on-surface focus:ring-2 focus:ring-primary-container"
            />
          </label>
        </div>
        <Button variant="secondary" className="rounded-lg py-2" onClick={handleExport}>
          <Icon name="download" className="text-lg" />
          Exportar relatório
        </Button>
        <Button
          variant="dark"
          className="rounded-lg py-2 disabled:cursor-not-allowed"
          disabled
          aria-disabled="true"
          title="Importação de extrato desativada"
        >
          <Icon name="file_upload" className="text-lg" />
          Importar extrato/PDF
        </Button>
        <span className="text-[10px] font-bold text-error bg-error/10 px-2 py-0.5 rounded uppercase self-center">
          {periodLabel}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <Tabs items={movementFilters} value={movementFilter} onChange={setMovementFilter} />
        <div className="flex flex-wrap gap-2">
          {natureFilters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setNatureFilter(item.id)}
              className={
                natureFilter === item.id
                  ? 'px-3 py-2 min-h-11 rounded-full text-xs font-semibold bg-error text-on-error'
                  : 'px-3 py-2 min-h-11 rounded-full text-xs font-medium bg-surface-container-lowest text-on-surface-variant'
              }
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/20">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low text-on-surface-variant font-medium">
              <tr>
                <th className="px-5 py-3">Data/Hora</th>
                <th className="px-5 py-3">Descrição</th>
                <th className="px-5 py-3">Fornecedor/Origem</th>
                <th className="px-5 py-3">Categoria</th>
                <th className="px-5 py-3 text-right">Valor</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {movementPage.rows.map((row) => (
                <tr
                  key={`${row.tipo}-${row.id}`}
                  className="hover:bg-surface-container-low transition-colors"
                >
                  <td className="px-5 py-3 text-on-surface-variant whitespace-nowrap">{row.data_hora}</td>
                  <td className="px-5 py-3 font-medium text-on-surface">{row.descricao}</td>
                  <td className="px-5 py-3 text-on-surface">{row.entidade || '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                          row.tipo === 'entrada'
                            ? row.categoryTone === 'tertiary'
                              ? 'bg-tertiary-container/20 text-on-tertiary-container'
                              : 'bg-secondary-container/20 text-on-secondary-container'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        <Icon name={row.categoryIcon} className="text-sm" />
                        {row.categoria}
                      </span>
                      {row.tipo === 'saida' ? (
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            row.nature === 'fixed'
                              ? 'bg-primary text-on-primary'
                              : 'bg-surface-container text-on-surface'
                          }`}
                        >
                          {natureLabel(row.nature)}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td
                    className={`px-5 py-3 text-right font-bold ${
                      row.tipo === 'entrada' ? 'text-secondary' : 'text-error'
                    }`}
                  >
                    {row.valor}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {row.tipo === 'saida' ? (
                      <button
                        type="button"
                        className="p-2 min-h-11 min-w-11 rounded-full text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors"
                        onClick={() => confirmDeleteExpense(row)}
                        aria-label="Excluir despesa"
                      >
                        <Icon name="delete" />
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
              {!movementPage.rows.length ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-on-surface-variant text-sm">
                    Nenhuma movimentação neste filtro.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination state={movementPage} />
    </div>
  );
}
