import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCashFlow, removeCashExpense } from '../services/dashboardService';
import { natureLabel } from '../services/cashFlowUtils';
import { Button } from '../components/ui/Button';
import { DataTable, EmptyRow, StatusPill, TableActions, TBody, Td, Th, THead, Tr } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { SearchField } from '../components/ui/SearchField';
import { usePagedList } from '../components/ui/usePagedList';
import { useModal } from '../contexts/ModalContext';

export function PurchasesPage() {
  const [query, setQuery] = useState('');
  const { openModal } = useModal();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['cash-flow'],
    queryFn: fetchCashFlow,
  });

  const expenses = useMemo(() => {
    const term = query.trim().toLowerCase();
    return [...(data?.expenses || [])]
      .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')))
      .filter((row) => {
        if (!term) return true;
        return [row.supplier, row.category, row.value].join(' ').toLowerCase().includes(term);
      });
  }, [data, query]);

  const page = usePagedList(expenses, query);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
    queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    queryClient.invalidateQueries({ queryKey: ['freelancers'] });
  }

  function openCreate() {
    openModal('new-expense', {
      categories: data?.categories,
      onSuccess: refresh,
    });
  }

  function openEdit(row) {
    openModal('new-expense', {
      expense: row,
      categories: data?.categories,
      onSuccess: refresh,
    });
  }

  function confirmDelete(row) {
    openModal('confirm', {
      message: `Excluir a despesa "${row.supplier}" (${row.value})?`,
      confirmLabel: 'Excluir',
      successMessage: 'Despesa removida.',
      errorMessage: 'Falha ao excluir despesa.',
      onConfirm: async () => {
        await removeCashExpense(row.id);
        refresh();
      },
    });
  }

  if (isLoading || !data) {
    return <div className="p-4 text-on-surface-variant font-body md:p-8">Carregando compras...</div>;
  }

  return (
    <div className="space-y-6 p-4 font-body md:p-8">
      <PageHeader
        title="Compras"
        description="Todas as saídas do caixa. Fornecedor e freelancer ficam vinculados ao cadastro."
      />
      <FilterBar
        actions={
          <Button onClick={openCreate}>
            <Icon name="add" />
            Nova despesa
          </Button>
        }
      >
        <SearchField value={query} onChange={setQuery} placeholder="Buscar despesa" label="Buscar despesa" />
      </FilterBar>
      <div className="space-y-4">
        <DataTable>
          <THead>
            <Th>Data</Th>
            <Th>Descrição</Th>
            <Th>Categoria</Th>
            <Th>Natureza</Th>
            <Th align="right">Valor</Th>
            <Th align="right">Ações</Th>
          </THead>
          <TBody>
            {expenses.length === 0 ? (
              <EmptyRow colSpan={6}>{query ? 'Nenhuma despesa encontrada.' : 'Nenhuma saída registrada.'}</EmptyRow>
            ) : (
              page.rows.map((row) => (
                <Tr key={row.id}>
                  <Td tone="muted" className="whitespace-nowrap">
                    {row.date}
                  </Td>
                  <Td tone="strong">{row.supplier || '—'}</Td>
                  <Td>
                    <StatusPill tone="neutral">
                      <Icon name={row.categoryIcon || 'payments'} className="text-sm" />
                      {row.category}
                    </StatusPill>
                  </Td>
                  <Td>{natureLabel(row.nature)}</Td>
                  <Td align="right" tone="danger">
                    {row.value}
                  </Td>
                  <Td align="right">
                    <TableActions>
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        onClick={() => openEdit(row)}
                        aria-label="Editar despesa"
                      >
                        <Icon name="edit" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="danger"
                        onClick={() => confirmDelete(row)}
                        aria-label="Excluir despesa"
                      >
                        <Icon name="delete" />
                      </Button>
                    </TableActions>
                  </Td>
                </Tr>
              ))
            )}
          </TBody>
        </DataTable>
        <Pagination state={page} />
      </div>
    </div>
  );
}
