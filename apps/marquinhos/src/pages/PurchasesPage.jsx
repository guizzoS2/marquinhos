import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, isValid, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fetchCashFlow, fetchCustomers, fetchInventory, removeCashExpense, removeSupplier, reversePurchase } from '../services/dashboardService';
import { natureLabel, parseCashFlowDate, toIsoDate } from '../services/cashFlowUtils';
import { OpenComandas } from '../components/pdv/OpenComandas';
import { SuppliersList } from '../components/suppliers/SuppliersList';
import { CloseShiftPage } from './CloseShiftPage';
import { SalesPage } from './SalesPage';
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

function productLine(row) {
  return (row?.itens || []).map((item) => `${item.nome} × ${item.quantidade}`).join(', ');
}

export function PurchasesPage() {
  const [query, setQuery] = useState('');
  const [params, setParams] = useSearchParams();
  const requested = params.get('aba');
  const tab =
    requested === 'vendas' || requested === 'fornecedores' || requested === 'comandas' || requested === 'fechamento'
      ? requested
      : 'compras';
  const { openModal } = useModal();
  const queryClient = useQueryClient();
  const cash = useQuery({ queryKey: ['cash-flow'], queryFn: fetchCashFlow });
  const inventory = useQuery({ queryKey: ['inventory'], queryFn: fetchInventory });
  const customers = useQuery({ queryKey: ['customers'], queryFn: fetchCustomers });

  useEffect(() => {
    if (requested === 'despesas') setParams({}, { replace: true });
  }, [requested, setParams]);

  function setTab(next) {
    setParams(next === 'compras' ? {} : { aba: next }, { replace: true });
  }

  const rows = useMemo(() => {
    const purchaseRows = inventory.data?.purchases || [];
    const expenseRows = cash.data?.expenses || [];
    const purchaseByExpense = new Map();
    purchaseRows.forEach((purchase) => {
      if (purchase.expenseId) purchaseByExpense.set(String(purchase.expenseId), purchase);
    });
    const used = new Set();
    const merged = [];
    expenseRows.forEach((expense) => {
      const purchase = purchaseByExpense.get(String(expense.id)) || null;
      if (purchase) used.add(String(purchase.id));
      const iso = parseCashFlowDate(expense.date) || toIsoDate(expense.createdAt) || '';
      merged.push({
        id: `exp-${expense.id}`,
        sort: `${iso} ${expense.createdAt || ''}`,
        date: iso ? formatPurchaseDate(iso) : expense.date || '—',
        description: expense.supplier || '—',
        category: expense.category || '—',
        categoryIcon: expense.categoryIcon,
        products: productLine(purchase),
        nature: expense.nature,
        value: expense.value,
        status: purchase ? (purchase.status === 'cancelada' ? 'cancelada' : 'ativa') : '',
        expense,
        purchase,
      });
    });
    purchaseRows.forEach((purchase) => {
      if (used.has(String(purchase.id))) return;
      const iso = /^\d{4}-\d{2}-\d{2}$/.test(String(purchase.date || '')) ? purchase.date : '';
      merged.push({
        id: `buy-${purchase.id}`,
        sort: purchase.created_at || iso,
        date: formatPurchaseDate(purchase.date),
        description: purchase.supplierName || '—',
        category: purchase.categoryName || '—',
        categoryIcon: '',
        products: productLine(purchase),
        nature: '',
        value: money(purchase.total),
        status: purchase.status === 'cancelada' ? 'cancelada' : 'ativa',
        expense: null,
        purchase,
      });
    });
    const term = query.trim().toLowerCase();
    return merged
      .filter((row) => {
        if (!term) return true;
        const nature = row.nature ? natureLabel(row.nature) : '';
        const status = row.status === 'cancelada' ? 'cancelada' : row.status === 'ativa' ? 'ativa' : '';
        return [row.date, row.description, row.category, row.products, nature, row.value, status]
          .join(' ')
          .toLowerCase()
          .includes(term);
      })
      .sort((left, right) => String(right.sort).localeCompare(String(left.sort)));
  }, [inventory.data, cash.data, query]);

  const page = usePagedList(rows, query);

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

  function openDetail(row) {
    openModal('movement-detail', {
      kind: 'compra',
      purchase: row.purchase,
      movement: {
        tipo: 'saida',
        id: row.expense?.id || row.purchase?.id,
        data_hora: row.date,
        descricao: row.description,
        entidade: row.purchase?.supplierName || row.expense?.supplier || row.description,
        supplier: row.expense?.supplier || row.purchase?.supplierName || '',
        categoria: row.category,
        valor: row.value,
        nature: row.nature,
      },
    });
  }

  function openEdit(row) {
    if (!row.expense) return;
    openModal('new-expense', {
      expense: row.expense,
      purchase: row.purchase,
      categories: cash.data?.categories,
      onSuccess: refresh,
    });
  }

  function confirmDeleteExpense(row) {
    openModal('confirm', {
      message: `Excluir "${row.supplier}" (${row.value})?`,
      confirmLabel: 'Excluir',
      successMessage: 'Compra removida.',
      errorMessage: 'Falha ao excluir.',
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
    return <div className="p-4 font-body text-on-surface-variant md:p-8">Carregando compras e vendas...</div>;
  }

  return (
    <div className="space-y-6 p-4 font-body md:p-8">
      <PageHeader
        title="Compras e vendas"
        description="Compras, vendas, comandas, fechamento e fornecedores."
      />
      <Tabs
        label="Compras e vendas"
        items={[
          { id: 'compras', label: 'Compras' },
          { id: 'vendas', label: 'Vendas' },
          { id: 'comandas', label: 'Comandas' },
          { id: 'fechamento', label: 'Fechamento' },
          { id: 'fornecedores', label: 'Fornecedores' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'compras' ? (
        <section className="space-y-6">
          <FilterBar
            actions={
              <Button onClick={openExpense}>
                <Icon name="add" />
                Nova compra
              </Button>
            }
          >
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Buscar compra"
              label="Buscar compra"
            />
          </FilterBar>
          <div className="space-y-4">
            <DataTable>
              <THead>
                <Th>Data</Th>
                <Th>Descrição</Th>
                <Th>Categoria</Th>
                <Th>Produtos</Th>
                <Th>Natureza</Th>
                <Th align="right">Valor</Th>
                <Th>Status</Th>
                <Th align="right">Ações</Th>
              </THead>
              <TBody>
                {rows.length === 0 ? (
                  <EmptyRow colSpan={8}>
                    {query ? 'Nenhuma compra encontrada.' : 'Nenhuma saída registrada.'}
                  </EmptyRow>
                ) : (
                  page.rows.map((row) => {
                    const cancelled = row.status === 'cancelada';
                    return (
                      <Tr key={row.id} onClick={() => openDetail(row)}>
                        <Td tone="muted" className="whitespace-nowrap">
                          {row.date}
                        </Td>
                        <Td tone="strong">{row.description}</Td>
                        <Td>
                          <StatusPill tone="neutral">
                            <Icon name={row.categoryIcon || 'payments'} className="text-sm" />
                            {row.category}
                          </StatusPill>
                        </Td>
                        <Td tone="muted">{row.products || '—'}</Td>
                        <Td>{row.nature ? natureLabel(row.nature) : '—'}</Td>
                        <Td align="right" tone="danger">
                          {row.value}
                        </Td>
                        <Td>
                          {row.status ? (
                            <StatusPill tone={cancelled ? 'neutral' : 'accent'}>
                              {cancelled ? 'Cancelada' : 'Ativa'}
                            </StatusPill>
                          ) : (
                            '—'
                          )}
                        </Td>
                        <Td align="right" tone="muted">
                          {cancelled || (!row.expense && !row.purchase) ? (
                            '—'
                          ) : (
                            <TableActions>
                              {row.expense && !cancelled ? (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="secondary"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openEdit(row);
                                  }}
                                  aria-label="Editar compra"
                                >
                                  <Icon name="edit" />
                                </Button>
                              ) : null}
                              {row.purchase && !cancelled ? (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="danger"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    confirmCancel(row.purchase);
                                  }}
                                  aria-label="Cancelar compra"
                                >
                                  <Icon name="cancel" />
                                </Button>
                              ) : null}
                              {row.expense && !row.purchase ? (
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="danger"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    confirmDeleteExpense(row.expense);
                                  }}
                                  aria-label="Excluir compra"
                                >
                                  <Icon name="delete" />
                                </Button>
                              ) : null}
                            </TableActions>
                          )}
                        </Td>
                      </Tr>
                    );
                  })
                )}
              </TBody>
            </DataTable>
            <Pagination state={page} />
          </div>
        </section>
      ) : null}

      {tab === 'vendas' ? <SalesPage embedded /> : null}

      {tab === 'comandas' ? (
        <OpenComandas sales={inventory.data.sales || []} customers={customers.data?.customers || []} />
      ) : null}

      {tab === 'fechamento' ? <CloseShiftPage /> : null}

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
