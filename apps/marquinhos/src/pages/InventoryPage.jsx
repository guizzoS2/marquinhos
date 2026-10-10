import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchInventory, removeInventoryItem, removeProduction } from '../services/dashboardService';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { DataTable, EmptyRow, StatusPill, TableActions, Tag, TBody, Td, Th, THead, Tr } from '../components/ui/DataTable';
import { EntityCard, EntityCardGrid, TablePhoto } from '../components/ui/EntityCard';
import { FilterSelect } from '../components/ui/FilterSelect';
import { FilterBar } from '../components/ui/FilterBar';
import { SearchField } from '../components/ui/SearchField';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { Pagination } from '../components/ui/Pagination';
import { usePagedList } from '../components/ui/usePagedList';
import { useViewMode } from '../components/ui/useViewMode';
import { useModal } from '../contexts/ModalContext';
import { useAuth } from '../contexts/AuthContext';
import { isAdminRole } from '../services/roles';
import { toIsoDate } from '../services/cashFlowUtils';
import { instantClosedByCash } from '../services/cashClose';
import { DateRangeField } from '../components/ui/DateRangeField';
import { CatalogPage } from './CatalogPage';
import { GroupsPanel } from '../components/inventory/GroupsPanel';
import { productGroupTag } from '../services/catalogTaxonomy';

function GroupTag({ item }) {
  const tag = productGroupTag(item);
  return (
    <Tag tone={tag.tone} icon={tag.icon}>
      {tag.label}
    </Tag>
  );
}

function productionStamp(value) {
  const date = parseISO(String(value || ''));
  if (!isValid(date)) return '—';
  return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
}

export function InventoryPage() {
  const [filter, setFilter] = useState('Todos');
  const [query, setQuery] = useState('');
  const [productionQuery, setProductionQuery] = useState('');
  const today = toIsoDate();
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [view, setView] = useViewMode('estoque');
  const [params, setParams] = useSearchParams();
  const requested = params.get('aba');
  const section = ['stock', 'production', 'promocoes', 'combos', 'grupos'].includes(requested) ? requested : 'stock';
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
    const options = [{ value: 'Todos', label: 'Todos' }];
    (data?.groups || []).forEach((group) => {
      options.push({ value: `g:${group.id}`, label: group.name });
      (group.subgroups || []).forEach((sub) => {
        options.push({ value: `s:${sub.id}`, label: `${group.name} · ${sub.name}` });
      });
    });
    return options;
  }, [data]);

  const items = useMemo(() => {
    if (!data?.items) return [];
    const term = query.trim().toLowerCase();
    return data.items.filter((item) => {
      const categoryOk =
        filter === 'Todos' ||
        (filter.startsWith('g:') && item.grupoId === filter.slice(2)) ||
        (filter.startsWith('s:') && item.subgrupoId === filter.slice(2));
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

  const rangedProductions = useMemo(() => {
    const start = fromDate && toDate && fromDate > toDate ? toDate : fromDate;
    const end = fromDate && toDate && fromDate > toDate ? fromDate : toDate;
    return (data?.productions || [])
      .filter((row) => {
        const date = parseISO(String(row.data_producao || ''));
        if (!isValid(date)) return false;
        const key = format(date, 'yyyy-MM-dd');
        if (start && key < start) return false;
        if (end && key > end) return false;
        return true;
      })
      .sort((left, right) => String(right.data_producao).localeCompare(String(left.data_producao)));
  }, [data, fromDate, toDate]);
  const filteredProductions = useMemo(() => {
    const term = productionQuery.trim().toLowerCase();
    if (!term) return rangedProductions;
    return rangedProductions.filter((row) => {
      const item = (data?.items || []).find((product) => String(product.id) === String(row.produto_id));
      const name = String(item?.nome || item?.name || '').toLowerCase();
      const stamp = productionStamp(row.data_producao).toLowerCase();
      return name.includes(term) || String(row.quantidade).includes(term) || stamp.includes(term);
    });
  }, [rangedProductions, productionQuery, data]);
  const stockPage = usePagedList(items, `${filter}|${query}`);
  const productionPage = usePagedList(filteredProductions, `${section}|${productionQuery}|${fromDate}|${toDate}`);

  function productOf(produtoId) {
    return (data?.items || []).find((row) => String(row.id) === String(produtoId));
  }

  function productName(produtoId) {
    const item = productOf(produtoId);
    return item?.nome || item?.name || 'Produto';
  }

  function openNewProduct() {
    openModal('new-product', { categories: data?.filters, onSuccess: refreshInventory });
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
          title="Estoque"
          description="Veja o que tem no bar, registre a produção e monte promoções e combos."
        />

        <Tabs
          items={[
            { id: 'stock', label: 'Estoque' },
            { id: 'grupos', label: 'Grupos' },
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
            label="Grupo"
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
                <Th>Grupo</Th>
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
                        <TablePhoto src={item.image || item.foto} />
                        <div className="flex min-w-0 flex-col">
                          <span className="font-semibold text-on-surface">{item.nome || item.name}</span>
                          <span className="text-xs text-on-surface-variant">{item.marca}</span>
                        </div>
                      </div>
                    </Td>
                    <Td tone="muted">{item.codigo}</Td>
                    <Td>
                      <div className="flex min-w-0 flex-col gap-1">
                        <GroupTag item={item} />
                        {[item.subgrupo, item.formato].filter(Boolean).length ? (
                          <span className="text-xs text-on-surface-variant">
                            {[item.subgrupo, item.formato].filter(Boolean).join(' · ')}
                          </span>
                        ) : null}
                      </div>
                    </Td>
                    <Td tone={item.lowStock ? 'danger' : 'strong'}>{item.stock}</Td>
                    <Td tone="muted">{item.minStock}</Td>
                    <Td align="right" tone="strong">
                      {item.cost}
                    </Td>
                    <Td>
                      {item.lowStock ? (
                        <StatusPill tone="danger" dot>
                          <Icon name="warning" className="text-sm" />
                          Estoque baixo
                        </StatusPill>
                      ) : (
                        <StatusPill tone="success">
                          <Icon name="check" className="text-sm" />
                          Estável
                        </StatusPill>
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
                      <Icon name="warning" className="text-sm" />
                      Estoque baixo
                    </StatusPill>
                  ) : (
                    <StatusPill tone="success">
                      <Icon name="check" className="text-sm" />
                      Estável
                    </StatusPill>
                  )
                }
              >
                <p className="text-sm text-on-surface-variant">
                  {item.codigo}
                  {item.formato ? ` · ${item.formato}` : ''}
                </p>
                <GroupTag item={item} />
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
              <DateRangeField
                from={fromDate}
                to={toDate}
                onChange={({ from, to }) => {
                  setFromDate(from);
                  setToDate(to);
                }}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  const day = toIsoDate();
                  setFromDate(day);
                  setToDate(day);
                }}
              >
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
                <Th>Data/Hora</Th>
                <Th align="right">Ações</Th>
              </THead>
              <TBody>
                {rangedProductions.length === 0 ? (
                  <EmptyRow colSpan={5}>
                    {fromDate === toDate && fromDate === today
                      ? 'Nenhuma produção hoje.'
                      : fromDate === toDate
                        ? 'Nenhuma produção neste dia.'
                        : 'Nenhuma produção neste período.'}
                  </EmptyRow>
                ) : productionPage.rows.length === 0 ? (
                  <EmptyRow colSpan={5}>Nenhuma produção encontrada.</EmptyRow>
                ) : (
                  productionPage.rows.map((row) => {
                    const product = productOf(row.produto_id);
                    const locked = instantClosedByCash(row.data_producao, data?.closings);
                    return (
                    <Tr key={row.id}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <TablePhoto src={product?.foto || product?.image} />
                          <span className="font-semibold text-on-surface">{productName(row.produto_id)}</span>
                        </div>
                      </Td>
                      <Td>{row.quantidade}</Td>
                      <Td>{productStock(row.produto_id)}</Td>
                      <Td tone="muted" className="whitespace-nowrap">
                        {productionStamp(row.data_producao)}
                      </Td>
                      <Td align="right" nowrap>
                        {locked ? (
                          '—'
                        ) : (
                          <TableActions>
                            <Button type="button" size="icon" variant="secondary" onClick={() => openEditProduction(row)} aria-label="Editar produção">
                              <Icon name="edit" />
                            </Button>
                            <Button type="button" size="icon" variant="danger" onClick={() => confirmDeleteProduction(row)} aria-label="Excluir produção">
                              <Icon name="delete" />
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
            <Pagination state={productionPage} />
            </div>
          </section>
        ) : section === 'grupos' ? (
          <GroupsPanel groups={data.groups || []} formats={data.formats || []} items={data.items || []} />
        ) : (
          <CatalogPage embedded tab={section} />
        )}
      </div>

      {section === 'grupos' ? null : (
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
      )}
    </>
  );
}
