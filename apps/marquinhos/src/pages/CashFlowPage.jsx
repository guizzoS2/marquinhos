import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCashFlow, removeCashExpense } from '../services/dashboardService';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
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
} from '../services/cashFlowUtils';

const natureFilters = [
  { id: 'all', label: 'Todas' },
  { id: 'fixed', label: 'Fixas' },
  { id: 'variable', label: 'Variáveis' },
];

export function CashFlowPage() {
  const [fromDate, setFromDate] = useState(startOfMonthIso);
  const [toDate, setToDate] = useState(toIsoDate);
  const [natureFilter, setNatureFilter] = useState('all');
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

  const filteredExpenses = useMemo(() => {
    if (natureFilter === 'all') return rangedExpenses;
    return rangedExpenses.filter((row) => row.nature === natureFilter);
  }, [rangedExpenses, natureFilter]);

  const summary = useMemo(
    () => buildCashFlowSummary(filteredIncomes, rangedExpenses),
    [filteredIncomes, rangedExpenses]
  );

  const periodLabel = formatIsoRange(fromDate, toDate);

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

  function openNewExpense() {
    openModal('new-expense', {
      categories: data?.categories,
      onSuccess: refreshCashFlow,
    });
  }

  function confirmDeleteExpense(row) {
    openModal('confirm', {
      message: `Excluir a despesa "${row.supplier}" (${row.value})?`,
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
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pb-72 md:pb-56 font-body">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-on-surface font-headline">
            Fluxo de Caixa
          </h1>
          <p className="text-on-surface-variant text-sm">
            Visão consolidada da saúde financeira do Artisan Lounge
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3 w-full md:w-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full sm:w-auto">
            <label className="block space-y-2 min-w-0">
              <span className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1">
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
              <span className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1">
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
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/20">
          <div className="px-4 md:px-5 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-secondary/5">
            <div className="flex items-center gap-2">
              <Icon name="trending_up" className="text-secondary" />
              <h3 className="font-headline font-bold text-on-surface">Entradas</h3>
            </div>
            <Button
              className="rounded-lg py-2 px-3 text-xs"
              onClick={() =>
                openModal('new-order', {
                  onSuccess: refreshCashFlow,
                })
              }
            >
              <Icon name="add" className="text-sm" />
              Nova venda
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-low text-on-surface-variant font-medium">
                <tr>
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Descrição</th>
                  <th className="px-5 py-3">Categoria</th>
                  <th className="px-5 py-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {filteredIncomes.map((row) => (
                  <tr
                    key={row.id || `${row.date}-${row.description}`}
                    className="hover:bg-surface-container-low transition-colors"
                  >
                    <td className="px-5 py-3 text-on-surface-variant">{row.date}</td>
                    <td className="px-5 py-3 font-medium text-on-surface">{row.description}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                          row.categoryTone === 'tertiary'
                            ? 'bg-tertiary-container/20 text-on-tertiary-container'
                            : 'bg-secondary-container/20 text-on-secondary-container'
                        }`}
                      >
                        <Icon name={row.categoryIcon} className="text-sm" />
                        {row.category}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-secondary">{row.value}</td>
                  </tr>
                ))}
                {!filteredIncomes.length ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-5 py-8 text-center text-on-surface-variant text-sm"
                    >
                      Nenhuma entrada neste período.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/20">
          <div className="px-5 py-4 flex flex-col gap-3 bg-error/5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Icon name="trending_down" className="text-error" />
                <h3 className="font-headline font-bold text-on-surface">Saídas</h3>
              </div>
              <span className="text-[10px] font-bold text-error bg-error/10 px-2 py-0.5 rounded uppercase tracking-wider">
                {periodLabel}
              </span>
            </div>
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-low text-on-surface-variant font-medium">
                <tr>
                  <th className="px-5 py-3">Data</th>
                  <th className="px-5 py-3">Fornecedor</th>
                  <th className="px-5 py-3">Categoria</th>
                  <th className="px-5 py-3 text-right">Valor</th>
                  <th className="px-5 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {filteredExpenses.map((row) => (
                  <tr
                    key={row.id || `${row.date}-${row.supplier}`}
                    className="hover:bg-surface-container-low transition-colors"
                  >
                    <td className="px-5 py-3 text-on-surface-variant">{row.date}</td>
                    <td className="px-5 py-3 font-medium text-on-surface">{row.supplier}</td>
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 bg-surface-container text-on-surface-variant text-[11px] px-2 py-0.5 rounded-full font-semibold">
                          <Icon name={row.categoryIcon} className="text-sm" />
                          {row.category}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            row.nature === 'fixed'
                              ? 'bg-primary text-on-primary'
                              : 'bg-surface-container text-on-surface'
                          }`}
                        >
                          {natureLabel(row.nature)}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-error">{row.value}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        className="p-2 min-h-11 min-w-11 rounded-full text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors"
                        onClick={() => confirmDeleteExpense(row)}
                        aria-label="Excluir despesa"
                      >
                        <Icon name="delete" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!filteredExpenses.length ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-5 py-8 text-center text-on-surface-variant text-sm"
                    >
                      Nenhuma despesa neste filtro.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 right-0 left-0 md:left-64 bg-surface/90 backdrop-blur-xl border-t border-outline-variant/20 p-4 md:p-6 z-40">
        <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3 md:gap-4">
          <div className="space-y-1 border-b sm:border-b-0 sm:border-r border-outline-variant/20 pb-3 sm:pb-0 pr-0 sm:pr-4">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              Receita total
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-extrabold text-on-surface">
                {summary.totalRevenue}
              </span>
              <span className="text-xs font-semibold text-secondary flex items-center gap-0.5">
                <Icon name="arrow_drop_up" className="text-sm" />
                {summary.revenueDelta}
              </span>
            </div>
          </div>
          <div className="space-y-1 md:border-r border-outline-variant/20 pr-2 md:pr-4">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              Despesas totais
            </p>
            <span className="text-lg font-extrabold text-on-surface">
              {summary.totalExpenses}
            </span>
          </div>
          <div className="space-y-1 md:border-r border-outline-variant/20 pr-2 md:pr-4">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              Despesas fixas
            </p>
            <span className="text-lg font-extrabold text-on-surface">
              {summary.fixedExpenses}
            </span>
          </div>
          <div className="space-y-1 md:border-r border-outline-variant/20 pr-2 md:pr-4">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              Despesas variáveis
            </p>
            <span className="text-lg font-extrabold text-tertiary">
              {summary.variableExpenses}
            </span>
          </div>
          <div className="space-y-1 md:border-r border-outline-variant/20 pr-2 md:pr-4">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              % variável / receita
            </p>
            <span className="text-lg font-extrabold text-on-surface">
              {summary.variableShare}
            </span>
          </div>
          <div className="space-y-1 md:border-r border-outline-variant/20 pr-2 md:pr-4">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              Margem contribuição
            </p>
            <span className="text-lg font-extrabold text-secondary">
              {summary.contributionMargin}
            </span>
          </div>
          <div className="space-y-1 md:border-r border-outline-variant/20 pr-2 md:pr-4">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              Lucro estimado
            </p>
            <span className="text-lg font-extrabold text-secondary">
              {summary.estimatedProfit}
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              Lucro líquido
            </p>
            <span className="text-lg font-extrabold text-on-surface">{summary.netProfit}</span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={openNewExpense}
        className="fixed bottom-36 right-4 md:bottom-28 md:right-8 w-14 h-14 min-h-14 min-w-14 bg-secondary text-on-secondary rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition-transform duration-150 z-50"
        aria-label="Nova despesa"
      >
        <Icon name="add" className="text-3xl" />
      </button>
    </div>
  );
}
