import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isSameDay, isValid, parseISO } from 'date-fns';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchInventory, removeInventoryItem, removeProduction } from '../services/dashboardService';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { DataTable, EmptyRow, StatusPill, TableActions, TBody, Td, Th, THead, Tr } from '../components/ui/DataTable';
import { EntityCard, EntityCardGrid } from '../components/ui/EntityCard';
import { FilterSelect } from '../components/ui/FilterSelect';
import { FilterBar } from '../components/ui/FilterBar';
import { SearchField } from '../components/ui/SearchField';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { Pagination } from '../components/ui/Pagination';
import { usePagedList } from '../components/ui/usePagedList';
import { useModal } from '../contexts/ModalContext';
import { useAuth } from '../contexts/AuthContext';
import { isAdminRole } from '../services/roles';
import { toIsoDate } from '../services/cashFlowUtils';
import { DateField } from '../components/ui/DateField';
import { CatalogPage } from './CatalogPage';

export function InventoryPage() {
  const [filter, setFilter] = useState('Todos');
  const [query, setQuery] = useState('');
  const [productionQuery, setProductionQuery] = useState('');
  const [productionDate, setProductionDate] = useState(toIsoDate);
  const [view, setView] = useState('list');
  const [params, setParams] = useSearchParams();
  const requested = params.get('aba');
  const section = ['stock', 'production', 'promocoes', 'combos'].includes(requested) ? requested : 'stock';
  function setSection(next) {
    setParams(next === 'stock' ? {} : { aba: next }, { replace: true });
  }
  const { openModal } = useModal();
  const { user } = useAuth();
  const canAdmin = isAdminRole(user?.role);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: fetchInventory,
  });

  const categoryOptions = useMemo(() => {
    const names = data?.filters?.length ? data.filters : ['Todos'];
    const list = names.includes('Todos') ? names : ['Todos', ...names];
    return list.map((item) => ({ value: item, label: item }));
  }, [data]);

  const items = useMemo(() => {
    if (!data?.items) return [];
    const term = query.trim().toLowerCase();
    return data.items.filter((item) => {
      const categoryOk = filter === 'Todos' || item.category === filter || item.categoria === filter;
      if (!categoryOk) return false;
      if (!term) return true;
      const nome = String(item.nome || item.name || '').toLowerCase();
      const codigo = String(item.codigo || '').toLowerCase();
      return nome.includes(term) || codigo.includes(term);
    });
  }, [data, filter, query]);

  function refreshInventory() {
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
    queryClient.invalidateQueries({ queryKey: ['suppliers'] });
  }

  const dayProductions = useMemo(() => {
    const day = parseISO(productionDate);
    if (!isValid(day)) return [];
    return (data?.productions || []).filter((row) => {
      const date = parseISO(String(row.data_producao || ''));
      return isValid(date) && isSameDay(date, day);
    });
  }, [data, productionDate]);
  const filteredProductions = useMemo(() => {
    const term = productionQuery.trim().toLowerCase();
    if (!term) return dayProductions;
    return dayProductions.filter((row) => {
      const item = (data?.items || []).find((product) => String(product.id) === String(row.produto_id));
      const name = String(item?.nome || item?.name || '').toLowerCase();
      const time = new Date(row.data_producao).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      return name.includes(term) || String(row.quantidade).includes(term) || time.includes(term);
    });
  }, [dayProductions, productionQuery, data]);
  const stockPage = usePagedList(items, `${filter}|${query}`);
  const productionPage = usePagedList(filteredProductions, `${section}|${productionQuery}|${productionDate}`);

  function productName(produtoId) {
    const item = (data?.items || []).find((row) => String(row.id) === String(produtoId));
    return item?.nome || item?.name || 'Produto';
  }

  function openNewProduct() {
    openModal('new-product', { categories: data?.filters, onSuccess: refreshInventory });
  }

  function openNewCategory() {
    openModal('new-category', {
      onSuccess: (name) => {
        refreshInventory();
        if (name) setFilter(name);
      },
    });
  }

  function openProduction() {
    openModal('new-production', {
      items: data?.items || [],
      onSuccess: refreshInventory,
    });
  }

  function productStock(produtoId) {
    const item = (data?.items || []).find((row) => String(row.id) === String(produtoId));
    if (!item) return '—';
    return item.estoque_atual;
  }

  function openEditProduction(row) {
    openModal('edit-production', {
      production: row,
      items: data?.items || [],
      onSuccess: refreshInventory,
    });
  }

  function confirmDeleteProduction(row) {
    openModal('confirm', {
      message: `Excluir a produção de ${row.quantidade} un? O estoque de ${productName(row.produto_id)} será reduzido.`,
      confirmLabel: 'Excluir',
      successMessage: 'Produção excluída.',
      errorMessage: 'Não foi possível excluir a produção.',
      onConfirm: async () => {
        await removeProduction(row.id);
        refreshInventory();
      },
    });
  }

  function openProduct(item) {
    openModal('product-detail', {
      item,
      canDelete: canAdmin,
      onEdit: () =>
        openModal('edit-product', {
          item,
          categories: data?.filters,
          onSuccess: refreshInventory,
        }),
      onDelete: () => confirmDeleteItem(item),
    });
  }

  function confirmDeleteItem(item) {
    openModal('confirm', {
      message: `Remover "${item.name}" do estoque?`,
      confirmLabel: 'Excluir',
      successMessage: 'Item removido do estoque.',
      errorMessage: 'Falha ao remover item.',
      onConfirm: async () => {
        await removeInventoryItem(item.id);
        refreshInventory();
      },
    });
  }

  if (isLoading || !data) {
    return <div className="p-4 md:p-8 text-on-surface-variant">Carregando estoque...</div>;
  }

  return (
    <>
      <div className="p-4 md:p-8 space-y-6">
        <PageHeader
          title="Controle de Estoque e Produtos"
          description="Gerencie seu estoque e defina alertas de estoque mínimo."
        />

        <Tabs
          items={[
            { id: 'stock', label: 'Estoque' },
            { id: 'production', label: 'Produção' },
            { id: 'promocoes', label: 'Promoções' },
            { id: 'combos', label: 'Combos' },
          ]}
          value={section}
          onChange={setSection}
        />

        {section === 'stock' ? (
        <>
        <FilterBar
          actions={
            <>
              <Button type="button" variant="secondary" onClick={openNewCategory}>
                <Icon name="add" />
                Nova categoria
              </Button>
              <Button onClick={openNewProduct}>
                <Icon name="add" />
                Novo produto
              </Button>
            </>
          }
        >
          <SegmentedControl
            variant="primary"
            label="Visualização do estoque"
            items={[
              { id: 'list', label: 'Lista' },
              { id: 'cards', label: 'Cards' },
            ]}
            value={view}
            onChange={setView}
          />
          <FilterSelect
            id="inventory-category-filter"
            label="Categoria"
            value={filter}
            onChange={setFilter}
            options={categoryOptions}
          />
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Buscar por nome ou código"
            label="Buscar produto por nome ou código"
          />
        </FilterBar>

        {items.length === 0 ? (
          <p className="text-on-surface-variant">Nenhum produto encontrado.</p>
        ) : view === 'list' ? (
          <div className="space-y-4">
            <DataTable>
              <THead>
                <Th>Item</Th>
                <Th>Código</Th>
                <Th>Categoria</Th>
                <Th>Estoque atual</Th>
                <Th>Estoque sugerido</Th>
                <Th align="right">Valor unitário</Th>
                <Th>Status</Th>
              </THead>
              <TBody>
                {stockPage.rows.map((item) => (
                  <Tr
                    key={item.id}
                    tabIndex={0}
                    onClick={() => openProduct(item)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openProduct(item);
                      }
                    }}
                  >
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-container-low">
                          <img className="h-full w-full object-cover" alt="" src={item.image} />
                        </div>
                        <div className="flex min-w-0 flex-col">
                          <span className="font-semibold text-on-surface">{item.nome || item.name}</span>
                          <span className="text-xs text-on-surface-variant">{item.marca}</span>
                        </div>
                      </div>
                    </Td>
                    <Td tone="muted">{item.codigo}</Td>
                    <Td>
                      <StatusPill tone="neutral">{item.category}</StatusPill>
                    </Td>
                    <Td tone={item.lowStock ? 'danger' : 'strong'}>{item.stock}</Td>
                    <Td tone="muted">{item.minStock}</Td>
                    <Td align="right" tone="strong">
                      {item.cost}
                    </Td>
                    <Td>
                      {item.lowStock ? (
                        <StatusPill tone="danger" dot>
                          Estoque baixo
                        </StatusPill>
                      ) : (
                        <StatusPill tone="accent">Estável</StatusPill>
                      )}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </DataTable>
            <Pagination state={stockPage} />
          </div>
        ) : (
          <div className="space-y-4">
          <EntityCardGrid>
            {stockPage.rows.map((item) => (
              <EntityCard
                key={item.id}
                image={item.image || item.foto}
                icon="inventory_2"
                title={item.nome || item.name}
                onClick={() => openProduct(item)}
                badge={
                  item.lowStock ? (
                    <StatusPill tone="danger" dot>
                      Estoque baixo
                    </StatusPill>
                  ) : (
                    <StatusPill tone="accent">Estável</StatusPill>
                  )
                }
              >
                <p className="text-sm text-on-surface-variant">
                  {item.codigo} · {item.category}
                </p>
                {item.marca ? <p className="text-sm text-on-surface-variant">{item.marca}</p> : null}
                <div className="mt-auto flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs text-on-surface-variant">Estoque atual</p>
                    <p className={`font-headline text-xl font-extrabold ${item.lowStock ? 'text-error' : 'text-on-surface'}`}>
                      {item.stock}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-on-surface">{item.cost}</p>
                </div>
              </EntityCard>
            ))}
          </EntityCardGrid>
          <Pagination state={stockPage} />
          </div>
        )}
        </>
        ) : section === 'production' ? (
          <section className="space-y-6">
            <FilterBar
              actions={
                <Button onClick={openProduction}>
                  <Icon name="add" />
                  Registrar produção
                </Button>
              }
            >
              <SearchField
                value={productionQuery}
                onChange={setProductionQuery}
                placeholder="Buscar produção"
                label="Buscar produção"
              />
              <DateField label="Data" value={productionDate} onChange={setProductionDate} />
              <Button type="button" variant="secondary" onClick={() => setProductionDate(toIsoDate())}>
                <Icon name="today" />
                Hoje
              </Button>
            </FilterBar>
            <div className="space-y-4">
            <DataTable>
              <THead>
                <Th>Produto</Th>
                <Th>Quantidade produzida</Th>
                <Th>Estoque atual</Th>
                <Th>Horário</Th>
                <Th align="right">Ações</Th>
              </THead>
              <TBody>
                {dayProductions.length === 0 ? (
                  <EmptyRow colSpan={5}>
                    {productionDate === toIsoDate() ? 'Nenhuma produção hoje.' : 'Nenhuma produção neste dia.'}
                  </EmptyRow>
                ) : productionPage.rows.length === 0 ? (
                  <EmptyRow colSpan={5}>Nenhuma produção encontrada.</EmptyRow>
                ) : (
                  productionPage.rows.map((row) => (
                    <Tr key={row.id}>
                      <Td tone="strong">{productName(row.produto_id)}</Td>
                      <Td>{row.quantidade}</Td>
                      <Td>{productStock(row.produto_id)}</Td>
                      <Td tone="muted">
                        {new Date(row.data_producao).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Td>
                      <Td align="right">
                        <TableActions>
                          <Button type="button" size="icon" variant="secondary" onClick={() => openEditProduction(row)} aria-label="Editar produção">
                            <Icon name="edit" />
                          </Button>
                          <Button type="button" size="icon" variant="danger" onClick={() => confirmDeleteProduction(row)} aria-label="Excluir produção">
                            <Icon name="delete" />
                          </Button>
                        </TableActions>
                      </Td>
                    </Tr>
                  ))
                )}
              </TBody>
            </DataTable>
            <Pagination state={productionPage} />
            </div>
          </section>
        ) : (
          <CatalogPage embedded tab={section} />
        )}
      </div>

      <Button
        type="button"
        size="icon"
        onClick={
          section === 'production'
            ? openProduction
            : section === 'promocoes'
              ? () => openModal('new-promotion', { items: data.items || [], onSuccess: refreshInventory })
              : section === 'combos'
                ? () => openModal('new-combo', { items: data.items || [], onSuccess: refreshInventory })
                : openNewProduct
        }
        className="fixed bottom-6 right-4 z-50 shadow-lg md:hidden"
        aria-label={
          section === 'production'
            ? 'Registrar produção'
            : section === 'promocoes'
              ? 'Nova promoção'
              : section === 'combos'
                ? 'Novo combo'
                : 'Novo produto'
        }
      >
        <Icon name="add" />
      </Button>
    </>
  );
}
