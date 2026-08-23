import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDashboardApi } from '../contexts/DashboardApiContext';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { useModal } from '../contexts/ModalContext';
import { useToast } from '../contexts/ToastContext';
import {
  buildCashFlowCsv,
  buildCashFlowSummary,
  downloadCsv,
  natureLabel,
} from '../services/cashFlowUtils';

const periods = [
  { id: 'Mensal', days: 31 },
  { id: 'Trimestral', days: 90 },
  { id: 'Anual', days: 365 },
];
const natureFilters = [
  { id: 'all', label: 'Todas' },
  { id: 'fixed', label: 'Fixas' },
  { id: 'variable', label: 'Variáveis' },
];

function rowTime(row) {
  if (row.createdAt) return new Date(row.createdAt).getTime();
  if (row.isoDate) return new Date(`${row.isoDate}T12:00:00`).getTime();
  return null;
}

function inPeriod(row, days) {
  const t = rowTime(row);
  if (t == null) return true;
  return Date.now() - t <= days * 86400000;
}

export function CashFlowPage() {
  const { api, tenantId } = useDashboardApi();
  const [period, setPeriod] = useState('Mensal');
  const [natureFilter, setNatureFilter] = useState('all');
  const { openModal } = useModal();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['cash-flow', tenantId],
    queryFn: api.fetchCashFlow,
  });

  const days = periods.find((item) => item.id === period)?.days || 31;

  const incomes = useMemo(() => {
    return (data?.incomes || []).filter((row) => inPeriod(row, days));
  }, [data, days]);

  const filteredExpenses = useMemo(() => {
    return (data?.expenses || [])
      .filter((row) => inPeriod(row, days))
      .filter((row) => (natureFilter === 'all' ? true : row.nature === natureFilter));
  }, [data, days, natureFilter]);

  const summary = useMemo(() => {
    if (!data) return null;
    return buildCashFlowSummary(incomes, filteredExpenses, {
      revenueDelta: data.summary?.revenueDelta,
      expensesDelta: data.summary?.expensesDelta,
    });
  }, [data, incomes, filteredExpenses]);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['cash-flow', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['overview', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['suppliers', tenantId] });
  }

  function handleExport() {
    if (!data) return;
    downloadCsv(
      `fluxo-caixa-${new Date().toISOString().slice(0, 10)}.csv`,
      buildCashFlowCsv({ ...data, incomes, expenses: filteredExpenses }, { natureFilter })
    );
    toast.success('CSV baixado.');
  }

  if (isLoading || !data || !summary) {
    return <p className="text-[var(--muted,#5c5c5c)]">Abrindo o fluxo...</p>;
  }

  return (
    <div className="space-y-6 pb-36">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="font-display text-4xl uppercase tracking-wide">Fluxo de caixa</h2>
          <p className="text-sm text-[var(--muted,#5c5c5c)]">
            Entradas e saídas lado a lado. Edite valores das vendas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {periods.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              className={period === item.id ? 'bar-sticker bar-sticker-on' : 'bar-sticker'}
            >
              {item.id}
            </button>
          ))}
          <Button variant="secondary" onClick={handleExport}>
            CSV
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="space-y-3 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-2xl uppercase">Entradas</h3>
            <Button onClick={() => openModal('new-order', { onSuccess: refresh })}>
              Nova venda
            </Button>
          </div>
          <div className="overflow-auto max-h-[55vh]">
            <table className="bar-table">
              <thead className="sticky top-0 bg-[var(--paper,#fff)]">
                <tr>
                  <th>Data</th>
                  <th>O quê</th>
                  <th className="text-right">Valor</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {incomes.map((row) => (
                  <tr key={row.id}>
                    <td>{row.date}</td>
                    <td>
                      {row.description}
                      <span className="block text-[10px] uppercase text-[var(--muted,#5c5c5c)]">
                        {row.category}
                      </span>
                    </td>
                    <td className="text-right bar-pos">{row.value}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="min-h-11 px-3 bar-sticker"
                        onClick={() =>
                          openModal('new-order', { income: row, onSuccess: refresh })
                        }
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
                {!incomes.length ? (
                  <tr>
                    <td colSpan={4} className="text-[var(--muted,#5c5c5c)]">
                      Nenhuma entrada neste período.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="font-display text-2xl uppercase">Saídas</h3>
            <div className="flex flex-wrap gap-2">
              {natureFilters.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setNatureFilter(item.id)}
                  className={natureFilter === item.id ? 'bar-sticker bar-sticker-on' : 'bar-sticker'}
                >
                  {item.label}
                </button>
              ))}
              <Button
                variant="secondary"
                onClick={() => openModal('new-expense', { categories: data.categories, onSuccess: refresh })}
              >
                Nova despesa
              </Button>
            </div>
          </div>
          <div className="overflow-auto max-h-[55vh]">
            <table className="bar-table">
              <thead className="sticky top-0 bg-[var(--paper,#fff)]">
                <tr>
                  <th>Data</th>
                  <th>Para quem</th>
                  <th className="text-right">Valor</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((row) => (
                  <tr key={row.id}>
                    <td>{row.date}</td>
                    <td>
                      {row.supplier}
                      <span className="block text-[10px] uppercase text-[var(--muted,#5c5c5c)]">
                        {row.category} · {natureLabel(row.nature)}
                        {row.source === 'platform_daily' ? ' · Stripe' : ''}
                      </span>
                    </td>
                    <td className="text-right bar-neg">{row.value}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="min-h-11 min-w-11 px-2"
                        aria-label="Excluir despesa"
                        onClick={() =>
                          openModal('confirm', {
                            message: `Excluir "${row.supplier}" (${row.value})?`,
                            confirmLabel: 'Excluir',
                            successMessage: 'Despesa removida.',
                            errorMessage: 'Falha ao excluir.',
                            onConfirm: async () => {
                              await api.removeCashExpense(row.id);
                              refresh();
                            },
                          })
                        }
                      >
                        <Icon name="delete" />
                      </button>
                    </td>
                  </tr>
                ))}
                {!filteredExpenses.length ? (
                  <tr>
                    <td colSpan={4} className="text-[var(--muted,#5c5c5c)]">
                      Nenhuma saída neste filtro.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 right-0 left-0 md:left-64 bg-[var(--ink,#111)] text-[#f4efe6] border-t-2 border-[var(--spray,#FFDB15)] p-4 z-40">
        <dl className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <dt className="uppercase tracking-widest text-white/50">Receita</dt>
            <dd className="font-mono text-base mt-1">{summary.totalRevenue}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-widest text-white/50">Saídas</dt>
            <dd className="font-mono text-base mt-1">{summary.totalExpenses}</dd>
          </div>
          <div>
            <dt className="uppercase tracking-widest text-white/50">Sobra</dt>
            <dd className="font-spray text-xl text-[var(--spray,#FFDB15)] mt-1">
              {summary.estimatedProfit}
            </dd>
          </div>
          <div>
            <dt className="uppercase tracking-widest text-white/50">Variável</dt>
            <dd className="font-mono text-base mt-1">{summary.variableShare}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
