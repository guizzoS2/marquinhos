import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, isValid, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fetchCashFlow, fetchInventory, fetchSuppliers, removeCashExpense, removeSupplier, reversePurchase } from '../services/dashboardService';
import { natureLabel } from '../services/cashFlowUtils';
import { SuppliersList } from '../components/suppliers/SuppliersList';
import { Button } from '../components/ui/Button';
import { DataTable, EmptyRow, StatusPill, TableActions, TBody, Td, Th, THead, Tr } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { SearchField } from '../components/ui/SearchField';
import { Tabs } from '../components/ui/Tabs';
import { usePagedList } from '../components/ui/usePagedList';
import { useModal } from '../contexts/ModalContext';

function formatPurchaseDate(value) {
  const parsed = parse(String(value || ''), 'yyyy-MM-dd', new Date(0));
  if (!isValid(parsed)) return '—';
  return format(parsed, 'dd/MM/yyyy', { locale: ptBR });
}

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const TABS = ['compras', 'despesas', 'fornecedores'];

export function PurchasesPage() {
  const [purchaseQuery, setPurchaseQuery] = useState('');
  const [expenseQuery, setExpenseQuery] = useState('');
  const [params, setParams] = useSearchParams();
  const requested = params.get('aba');
  const tab = TABS.includes(requested) ? requested : 'compras';
  const { openModal } = useModal();
  const queryClient = useQueryClient();
  const cash = useQuery({ queryKey: ['cash-flow'], queryFn: fetchCashFlow });
  const inventory = useQuery({ queryKey: ['inventory'], queryFn: fetchInventory });
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: fetchSuppliers });

  function setTab(next) {
    setParams(next === 'compras' ? {} : { aba: next }, { replace: true });
  }

  const purchases = useMemo(() => {
    const rows = inventory.data?.purchases || [];
    const term = purchaseQuery.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => {
      const products = (row.itens || []).map((item) => `${item.nome} ${item.quantidade}`).join(' ');
      const status = row.status === 'cancelada' ? 'cancelada' : 'ativa';
      return [row.supplierName, row.categoryName, products, formatPurchaseDate(row.date), status, money(row.total)]
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [inventory.data, purchaseQuery]);

  const expenses = useMemo(() => {
    const term = expenseQuery.trim().toLowerCase();
    return [...(cash.data?.expenses || [])]
      .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')))
      .filter((row) => {
        if (!term) return true;
        return [row.supplier, row.category, row.value].join(' ').toLowerCase().includes(term);
      });
  }, [cash.data, expenseQuery]);

  const purchasePage = usePagedList(purchases, purchaseQuery);
  const expensePage = usePagedList(expenses, expenseQuery);
  const suppliers = suppliersQuery.data?.suppliers || [];

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
    queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    queryClient.invalidateQueries({ queryKey: ['freelancers'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
  }

  function openExpense() {
    openModal('new-expense', {
      categories: cash.data?.categories,
      onSuccess: refresh,
    });
  }

  function openEdit(row) {
    openModal('new-expense', {
      expense: row,
      categories: cash.data?.categories,
      onSuccess: refresh,
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
        refresh();
      },
    });
  }

  function confirmCancel(row) {
    openModal('confirm', {
      message: `Estornar a compra de ${row.supplierName || 'fornecedor'}? O estoque será reduzido e a despesa cancelada.`,
      confirmLabel: 'Cancelar compra',
      successMessage: 'Compra cancelada.',
      errorMessage: 'Não foi possível cancelar a compra.',
      onConfirm: async () => {
        await reversePurchase(row.id);
        refresh();
      },
    });
  }

  function confirmDeleteSupplier(supplier) {
    openModal('confirm', {
      message: `Excluir o fornecedor "${supplier.name}"?`,
      confirmLabel: 'Excluir',
      successMessage: 'Fornecedor removido.',
      errorMessage: 'Falha ao excluir fornecedor.',
      onConfirm: async () => {
        await removeSupplier(supplier.id);
        refresh();
      },
    });
  }

  if (cash.isLoading || inventory.isLoading || !cash.data || !inventory.data) {
    return <div className="p-4 font-body text-on-surface-variant md:p-8">Carregando compras...</div>;
  }

  return (
    <div className="space-y-6 p-4 font-body md:p-8">
      <PageHeader
        title="Compras"
        description="Compras de estoque, despesas do caixa e fornecedores."
      />
      <Tabs
        label="Compras"
        items={[
          { id: 'compras', label: 'Compras' },
          { id: 'despesas', label: 'Despesas' },
          { id: 'fornecedores', label: 'Fornecedores' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'compras' ? (
        <section className="space-y-6">
          <FilterBar
            actions={
              <Button
                onClick={() =>
                  openModal('new-purchase', {
                    items: inventory.data?.items || [],
                    suppliers,
                    onSuccess: refresh,
                  })
                }
              >
                <Icon name="add" />
                Nova compra
              </Button>
            }
          >
            <SearchField
              value={purchaseQuery}
              onChange={setPurchaseQuery}
              placeholder="Buscar compra"
              label="Buscar compra"
            />
          </FilterBar>
          <div className="space-y-4">
            <DataTable>
              <THead>
                <Th>Data</Th>
                <Th>Fornecedor</Th>
                <Th>Categoria</Th>
                <Th>Produtos</Th>
                <Th align="right">Valor total</Th>
                <Th>Status</Th>
                <Th align="right">Ações</Th>
              </THead>
              <TBody>
                {(inventory.data?.purchases || []).length === 0 ? (
                  <EmptyRow colSpan={7}>Nenhuma compra registrada.</EmptyRow>
                ) : purchasePage.rows.length === 0 ? (
                  <EmptyRow colSpan={7}>Nenhuma compra encontrada.</EmptyRow>
                ) : (
                  purchasePage.rows.map((row) => {
                    const cancelled = row.status === 'cancelada';
                    return (
                      <Tr key={row.id}>
                        <Td tone="muted">{formatPurchaseDate(row.date)}</Td>
                        <Td tone="strong">{row.supplierName}</Td>
                        <Td>{row.categoryName}</Td>
                        <Td tone="muted">
                          {(row.itens || []).map((item) => `${item.nome} × ${item.quantidade}`).join(', ') || '—'}
                        </Td>
                        <Td align="right" tone="strong">
                          {money(row.total)}
                        </Td>
                        <Td>
                          <StatusPill tone={cancelled ? 'neutral' : 'accent'}>
                            {cancelled ? 'Cancelada' : 'Ativa'}
                          </StatusPill>
                        </Td>
                        <Td align="right" tone="muted">
                          {cancelled ? (
                            '—'
                          ) : (
                            <TableActions>
                              <Button
                                type="button"
                                size="icon"
                                variant="danger"
                                onClick={() => confirmCancel(row)}
                                aria-label="Cancelar compra"
                              >
                                <Icon name="cancel" />
                              </Button>
                            </TableActions>
                          )}
                        </Td>
                      </Tr>
                    );
                  })
                )}
              </TBody>
            </DataTable>
            <Pagination state={purchasePage} />
          </div>
        </section>
      ) : null}

      {tab === 'despesas' ? (
        <section className="space-y-6">
          <FilterBar
            actions={
              <Button onClick={openExpense}>
                <Icon name="add" />
                Nova despesa
              </Button>
            }
          >
            <SearchField
              value={expenseQuery}
              onChange={setExpenseQuery}
              placeholder="Buscar despesa"
              label="Buscar despesa"
            />
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
                  <EmptyRow colSpan={6}>
                    {expenseQuery ? 'Nenhuma despesa encontrada.' : 'Nenhuma saída registrada.'}
                  </EmptyRow>
                ) : (
                  expensePage.rows.map((row) => (
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
                            onClick={() => confirmDeleteExpense(row)}
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
            <Pagination state={expensePage} />
          </div>
        </section>
      ) : null}

      {tab === 'fornecedores' ? (
        <SuppliersList
          action={
            <Button onClick={() => openModal('new-supplier', { onSuccess: refresh })}>
              <Icon name="add" />
              Novo fornecedor
            </Button>
          }
          onOpen={(supplier) => openModal('supplier-detail', { supplierId: supplier.id, supplier })}
          onEdit={(supplier) => openModal('edit-supplier', { supplier, onSuccess: refresh })}
          onDelete={confirmDeleteSupplier}
        />
      ) : null}
    </div>
  );
}
