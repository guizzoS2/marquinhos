import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, isValid, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fetchCashFlow, fetchInventory, removeCashExpense, removeSupplier, reversePurchase } from '../services/dashboardService';
import {
  describeExpense,
  expenseTag,
  expenseTypeLabel,
  partyForCategoryId,
  withoutExpenseDate,
} from '../services/catalogTaxonomy';
import { natureLabel, parseCashFlowDate, toIsoDate } from '../services/cashFlowUtils';
import { ExpenseTypesPanel } from '../components/cashflow/ExpenseTypesPanel';
import { OpenComandas } from '../components/pdv/OpenComandas';
import { SuppliersList } from '../components/suppliers/SuppliersList';
import { CloseShiftPage } from './CloseShiftPage';
import { SalesPage } from './SalesPage';
import { Button } from '../components/ui/Button';
import { DataTable, EmptyRow, StatusPill, TableActions, Tag, TBody, Td, Th, THead, Tr } from '../components/ui/DataTable';
import { FilterBar } from '../components/ui/FilterBar';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { SearchField } from '../components/ui/SearchField';
import { SegmentedControl } from '../components/ui/SegmentedControl';
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

function ExpenseTag({ row }) {
  const tag = expenseTag(row.categoryId, { icon: row.categoryIcon, name: row.category });
  return (
    <Tag tone={tag.tone} icon={tag.icon}>
      {row.category}
    </Tag>
  );
}

function productLine(row) {
  return (row?.itens || []).map((item) => `${item.nome} × ${item.quantidade}`).join(', ');
}

const SALES_TABS = [
  { id: 'vendas', label: 'Vendas' },
  { id: 'comandas', label: 'Comandas' },
  { id: 'fechamento', label: 'Fechamento' },
];

const PURCHASE_TABS = [
  { id: 'compras', label: 'Compras' },
  { id: 'fornecedores', label: 'Fornecedores' },
  { id: 'categorias', label: 'Categorias' },
];

export function PurchasesPage({ hub = 'compras' }) {
  const [query, setQuery] = useState('');
  const [nature, setNature] = useState('todas');
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const requested = params.get('aba');
  const salesHub = hub === 'vendas';
  const tab = salesHub
    ? requested === 'comandas' || requested === 'fechamento'
      ? requested
      : 'vendas'
    : requested === 'fornecedores' || requested === 'categorias'
      ? requested
      : 'compras';
  const leaving = salesHub
    ? requested === 'compras' ||
      requested === 'fornecedores' ||
      requested === 'categorias' ||
      requested === 'funcionarios' ||
      requested === 'tipos'
    : requested === 'vendas' || requested === 'comandas' || requested === 'fechamento';
  const { openModal } = useModal();
  const queryClient = useQueryClient();
  const cash = useQuery({ queryKey: ['cash-flow'], queryFn: fetchCashFlow });
  const inventory = useQuery({ queryKey: ['inventory'], queryFn: fetchInventory });
  useEffect(() => {
    if (salesHub) {
      if (requested === 'compras') navigate('/compras', { replace: true });
      else if (requested === 'funcionarios') navigate('/equipe', { replace: true });
      else if (requested === 'fornecedores' || requested === 'categorias') {
        navigate(`/compras?aba=${requested}`, { replace: true });
      }
      else if (requested === 'tipos') navigate('/compras?aba=categorias', { replace: true });
      return;
    }
    if (requested === 'vendas') navigate('/vendas', { replace: true });
    else if (requested === 'comandas' || requested === 'fechamento') navigate(`/vendas?aba=${requested}`, { replace: true });
    else if (requested === 'funcionarios') navigate('/equipe', { replace: true });
    else if (requested === 'tipos' || requested === 'despesas') setParams({ aba: 'categorias' }, { replace: true });
  }, [navigate, requested, salesHub, setParams]);

  function setTab(next) {
    const isDefault = salesHub ? next === 'vendas' : next === 'compras';
    setParams(isDefault ? {} : { aba: next }, { replace: true });
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
      if (expense.source === 'comanda_saldo') return;
      const purchase = purchaseByExpense.get(String(expense.id)) || null;
      if (purchase) used.add(String(purchase.id));
      const iso = parseCashFlowDate(expense.date) || toIsoDate(expense.createdAt) || '';
      merged.push({
        id: `exp-${expense.id}`,
        sort: `${iso} ${expense.createdAt || ''}`,
        date: iso ? formatPurchaseDate(iso) : expense.date || '—',
        description: withoutExpenseDate(
          expense.description ||
            describeExpense({
              party: partyForCategoryId(expense.categoryId),
              categoryName: expense.category,
              subtypeName: expense.subtype || '',
              supplier: expense.supplier || '',
              productNames: (purchase?.itens || []).map((item) => item.nome),
            })
        ),
        origin: expense.supplier || '',
        category: expenseTypeLabel(expense),
        categoryId: expense.categoryId || '',
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
        description: purchase.supplierName ? `Compra de estoque com ${purchase.supplierName}` : 'Compra de estoque',
        origin: purchase.supplierName || '',
        category: purchase.categoryName || '—',
        categoryId: 'compra_estoque',
        categoryIcon: 'local_shipping',
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
        if (nature === 'fixed' && row.nature !== 'fixed') return false;
        if (nature === 'variable' && row.nature !== 'variable') return false;
        if (!term) return true;
        const natureText = row.nature ? natureLabel(row.nature) : '';
        const status = row.status === 'cancelada' ? 'cancelada' : row.status === 'ativa' ? 'ativa' : '';
        return [row.date, row.description, row.origin, row.category, row.products, natureText, row.value, status]
          .join(' ')
          .toLowerCase()
          .includes(term);
      })
      .sort((left, right) => String(right.sort).localeCompare(String(left.sort)));
  }, [inventory.data, cash.data, nature, query]);

  const page = usePagedList(rows, `${query}|${nature}`);

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
        categoryId: row.expense?.categoryId || '',
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

  if (leaving) {
    return <div className="p-4 font-body text-on-surface-variant md:p-8">Abrindo...</div>;
  }

  if (cash.isLoading || inventory.isLoading || !cash.data || !inventory.data) {
    return (
      <div className="p-4 font-body text-on-surface-variant md:p-8">
        {salesHub ? 'Carregando vendas...' : 'Carregando compras...'}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 font-body md:p-8">
      <PageHeader
        title={salesHub ? 'Vendas' : 'Compras e despesas'}
        description={
          salesHub
            ? 'Venda, acompanhe as comandas e feche o caixa.'
            : 'Compre, pague e organize fornecedores, funcionários e categorias.'
        }
      />
      <Tabs
        label={salesHub ? 'Vendas' : 'Compras e despesas'}
        items={salesHub ? SALES_TABS : PURCHASE_TABS}
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
            <SegmentedControl
              className="w-full max-w-full md:w-fit"
              label="Contas fixas e variáveis"
              items={[
                { id: 'todas', label: 'Todas' },
                { id: 'fixed', label: 'Fixas' },
                { id: 'variable', label: 'Variáveis' },
              ]}
              value={nature}
              onChange={setNature}
            />
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
                <Th>Origem</Th>
                <Th>Produtos</Th>
                <Th align="right">Valor</Th>
                <Th align="right">Ações</Th>
              </THead>
              <TBody>
                {rows.length === 0 ? (
                  <EmptyRow colSpan={7}>
                    {query || nature !== 'todas' ? 'Nenhuma compra encontrada.' : 'Nenhuma saída registrada.'}
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
                          <div className="flex flex-wrap items-center gap-2">
                            <ExpenseTag row={row} />
                            {row.nature ? (
                              <StatusPill tone={row.nature === 'fixed' ? 'ink' : 'neutral'}>
                                <Icon name={row.nature === 'fixed' ? 'lock' : 'tune'} className="text-sm" />
                                {natureLabel(row.nature)}
                              </StatusPill>
                            ) : null}
                            {cancelled ? (
                              <StatusPill tone="danger">
                                <Icon name="cancel" className="text-sm" />
                                Cancelada
                              </StatusPill>
                            ) : null}
                          </div>
                        </Td>
                        <Td>{row.origin || '—'}</Td>
                        <Td tone="muted">{row.products || '—'}</Td>
                        <Td align="right" tone="danger">
                          {row.value}
                        </Td>
                        <Td align="right" tone="muted" nowrap>
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
        <OpenComandas sales={inventory.data.sales || []} />
      ) : null}

      {tab === 'fechamento' ? <CloseShiftPage /> : null}

      {tab === 'categorias' ? <ExpenseTypesPanel /> : null}

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
