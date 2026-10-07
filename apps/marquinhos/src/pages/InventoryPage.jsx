import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchInventory, removeInventoryItem, removeProduction } from '../services/dashboardService';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { Pagination } from '../components/ui/Pagination';
import { usePagedList } from '../components/ui/usePagedList';
import { useModal } from '../contexts/ModalContext';
import { useAuth } from '../contexts/AuthContext';
import { isAdminRole } from '../services/roles';

export function InventoryPage() {
  const [filter, setFilter] = useState('Todos');
  const [query, setQuery] = useState('');
  const [view, setView] = useState('list');
  const [section, setSection] = useState('stock');
  const { openModal } = useModal();
  const { user } = useAuth();
  const canAdmin = isAdminRole(user?.role);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: fetchInventory,
  });

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

  function openStockEntry() {
    openModal('stock-entry', {
      items: data?.items,
      onSuccess: refreshInventory,
    });
  }

  const todayProductions = useMemo(() => {
    const now = new Date();
    return (data?.productions || []).filter((row) => {
      const date = new Date(row.data_producao);
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    });
  }, [data]);
  const stockPage = usePagedList(items, `${filter}|${query}`);
  const productionPage = usePagedList(todayProductions, section);

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
      <div className="p-4 md:p-8 space-y-6 md:space-y-8">
        <PageHeader
          title="Controle de Estoque e Produtos"
          description="Gerencie seu estoque, defina alertas de estoque mínimo e registre novas entradas com precisão editorial."
        >
          <div className="flex flex-col sm:flex-row gap-3">
            {section === 'production' ? (
              <Button onClick={openProduction}>
                <Icon name="add" />
                Registrar Produção
              </Button>
            ) : (
              <>
                <Button variant="secondary" onClick={openNewProduct}>
                  <Icon name="add" />
                  Novo produto
                </Button>
                <Button onClick={openStockEntry}>
                  <Icon name="add_circle" />
                  Registrar entrada
                </Button>
              </>
            )}
          </div>
        </PageHeader>

        <Tabs
          items={[
            { id: 'stock', label: 'Estoque' },
            { id: 'production', label: 'Produção' },
          ]}
          value={section}
          onChange={setSection}
        />

        {section === 'stock' ? (
        <>
        <section className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {(data.filters || []).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={
                  filter === item
                    ? 'px-5 py-2 min-h-11 bg-primary text-on-primary rounded-full text-sm font-semibold transition-all'
                    : 'px-5 py-2 min-h-11 bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high rounded-full text-sm font-medium transition-all'
                }
              >
                {item}
              </button>
            ))}
            <button
              type="button"
              onClick={openNewCategory}
              className="inline-flex items-center gap-1 px-5 py-2 min-h-11 bg-surface-container-low text-on-surface hover:bg-surface-container-high rounded-full text-sm font-semibold transition-all"
            >
              <Icon name="add" />
              Nova categoria
            </button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative w-full sm:w-64">
              <Icon
                name="search"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar por nome ou código"
                aria-label="Buscar produto por nome ou código"
                className="w-full pl-11 pr-4 min-h-11 bg-surface-container-low border-none rounded-full text-sm text-on-surface focus:ring-2 focus:ring-primary-container"
              />
            </div>
            <SegmentedControl
              label="Visualização do estoque"
              items={[
                { id: 'list', label: 'Lista' },
                { id: 'cards', label: 'Cards' },
              ]}
              value={view}
              onChange={setView}
            />
          </div>
        </section>

        {items.length === 0 ? (
          <p className="text-on-surface-variant">Nenhum produto encontrado.</p>
        ) : view === 'list' ? (
          <div className="bg-surface-container-low rounded-2xl overflow-hidden p-1 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant text-xs font-bold uppercase">
                    <th className="px-6 py-4">Item</th>
                    <th className="px-6 py-4">Código</th>
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4">Estoque Atual</th>
                    <th className="px-6 py-4">Estoque Sugerido</th>
                    <th className="px-6 py-4 text-right">Valor unitário</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant/30">
                  {stockPage.rows.map((item) => (
                    <tr
                      key={item.id}
                      tabIndex={0}
                      className="bg-surface-container-lowest hover:bg-surface-bright transition-colors cursor-pointer"
                      onClick={() => openProduct(item)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openProduct(item);
                        }
                      }}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center overflow-hidden">
                            <img
                              className="w-full h-full object-cover"
                              alt=""
                              src={item.image}
                            />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-on-surface">{item.nome || item.name}</span>
                            <span className="text-xs text-on-surface-variant">{item.marca}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-on-surface-variant">{item.codigo}</td>
                      <td className="px-6 py-5">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary-container text-on-secondary-container">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`font-semibold ${item.lowStock ? 'text-error' : 'text-on-surface'}`}
                        >
                          {item.stock}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-on-surface-variant">{item.minStock}</span>
                      </td>
                      <td className="px-6 py-5 text-right font-medium">{item.cost}</td>
                      <td className="px-6 py-5 text-center">
                        {item.lowStock ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-error-container/10 text-error-dim border border-error/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
                            Estoque Baixo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-secondary-container/20 text-on-secondary-fixed-variant">
                            Estável
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4">
              <Pagination state={stockPage} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stockPage.rows.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openProduct(item)}
                className="w-full text-left bg-surface-container-lowest rounded-2xl p-6 min-h-11 transition-all hover:shadow-xl hover:shadow-on-surface/5"
              >
                <div className="flex justify-between items-start mb-6 gap-3">
                  <div className="flex items-center gap-4 min-w-0">
                    <img
                      alt=""
                      className="w-14 h-14 rounded-2xl object-cover shrink-0"
                      src={item.image}
                    />
                    <div className="min-w-0">
                      <h4 className="font-headline font-bold text-lg text-on-surface truncate">
                        {item.nome || item.name}
                      </h4>
                      <p className="text-sm text-on-surface-variant font-label">
                        {item.codigo} · {item.category}
                      </p>
                      {item.marca ? (
                        <p className="text-sm text-on-surface-variant">{item.marca}</p>
                      ) : null}
                    </div>
                  </div>
                  {item.lowStock ? (
                    <span className="px-3 py-1 rounded-full bg-error-container/20 text-on-error-container text-[11px] font-bold uppercase shrink-0">
                      Estoque Baixo
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-secondary-container/30 text-on-secondary-container text-[11px] font-bold uppercase shrink-0">
                      Estável
                    </span>
                  )}
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs text-on-surface-variant font-label mb-1">Estoque atual</p>
                    <p className="text-xl font-headline font-extrabold text-on-surface">{item.stock}</p>
                  </div>
                  <p className="text-sm font-semibold text-on-surface">{item.cost}</p>
                </div>
              </button>
            ))}
          </div>
          <Pagination state={stockPage} />
          </div>
        )}
        </>
        ) : (
          <section className="bg-surface-container-low rounded-2xl overflow-hidden p-1 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-on-surface-variant text-xs font-bold uppercase">
                    <th className="px-6 py-4">Produto</th>
                    <th className="px-6 py-4">Quantidade Produzida</th>
                    <th className="px-6 py-4">Estoque Atual</th>
                    <th className="px-6 py-4">Horário</th>
                    <th className="px-6 py-4">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant/30">
                  {todayProductions.length === 0 ? (
                    <tr className="bg-surface-container-lowest">
                      <td className="px-6 py-5 text-on-surface-variant" colSpan={5}>
                        Nenhuma produção hoje.
                      </td>
                    </tr>
                  ) : (
                    productionPage.rows.map((row) => (
                      <tr key={row.id} className="bg-surface-container-lowest">
                        <td className="px-6 py-5 font-bold text-on-surface">
                          {productName(row.produto_id)}
                        </td>
                        <td className="px-6 py-5 text-on-surface">{row.quantidade}</td>
                        <td className="px-6 py-5 text-on-surface">{productStock(row.produto_id)}</td>
                        <td className="px-6 py-5 text-on-surface-variant">
                          {new Date(row.data_producao).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="secondary" onClick={() => openEditProduction(row)}>
                              <Icon name="edit" />
                              Editar
                            </Button>
                            <Button type="button" variant="danger" onClick={() => confirmDeleteProduction(row)}>
                              <Icon name="delete" />
                              Excluir
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-4">
              <Pagination state={productionPage} />
            </div>
          </section>
        )}
      </div>

      <footer className="mt-12 px-4 md:px-8 py-6 border-t border-surface-variant/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-on-surface-variant text-sm font-body">
        <div className="flex flex-wrap gap-4 md:gap-6">
          <span className="font-semibold text-on-surface">Marquinho's</span>
          <span>Bar e Petiscos</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <a className="hover:text-on-surface transition-colors min-h-11 inline-flex items-center" href="#">
            Política de Privacidade
          </a>
          <a className="hover:text-on-surface transition-colors min-h-11 inline-flex items-center" href="#">
            Termos de Uso
          </a>
        </div>
      </footer>

      <button
        type="button"
        onClick={section === 'production' ? openProduction : openStockEntry}
        className="fixed bottom-6 right-4 w-14 h-14 min-h-14 min-w-14 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all md:hidden z-50"
        aria-label={section === 'production' ? 'Registrar produção' : 'Registrar entrada'}
      >
        <Icon name="add" />
      </button>
    </>
  );
}
