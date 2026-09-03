import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchInventory, removeInventoryItem } from '../services/dashboardService';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { useModal } from '../contexts/ModalContext';
import { useAuth } from '../contexts/AuthContext';
import { isAdminRole } from '../services/roles';

const progressWidth = {
  45: 'w-[45%]',
  65: 'w-[65%]',
  80: 'w-[80%]',
};

const metricTone = {
  error: {
    iconWrap: 'bg-error-container/10 text-error',
    badge: 'text-error',
    bar: 'bg-error',
  },
  secondary: {
    iconWrap: 'bg-primary/20 text-on-surface',
    badge: 'text-on-surface',
    bar: 'bg-primary',
  },
  tertiary: {
    iconWrap: 'bg-surface-container text-on-surface',
    badge: 'text-on-surface-variant',
    bar: 'bg-on-surface',
  },
};

export function InventoryPage() {
  const [filter, setFilter] = useState('Todos');
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
    if (filter === 'Todos') return data.items;
    return data.items.filter((item) => item.category === filter);
  }, [data, filter]);

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

  function openNewProduct() {
    openModal('new-product', { onSuccess: refreshInventory });
  }

  function openEditProduct(item) {
    openModal('edit-product', { item, onSuccess: refreshInventory });
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
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-on-background tracking-tight">
              Controle de Estoque e Produtos
            </h2>
            <p className="text-on-surface-variant max-w-xl font-body">
              Gerencie seu estoque, defina alertas de estoque mínimo e registre novas entradas
              com precisão editorial.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="secondary" onClick={openNewProduct}>
              <Icon name="add" />
              Novo produto
            </Button>
            <Button onClick={openStockEntry}>
              <Icon name="add_circle" />
              Registrar entrada
            </Button>
          </div>
        </section>

        <section className="flex flex-wrap items-center gap-3">
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
        </section>

        <div className="bg-surface-container-low rounded-2xl overflow-hidden p-1 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant text-xs font-bold uppercase tracking-widest">
                  <th className="px-6 py-4">Item</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4">Estoque Atual</th>
                  <th className="px-6 py-4">Estoque Mínimo</th>
                  <th className="px-6 py-4 text-right">Preço de Custo</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant/30">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="bg-surface-container-lowest hover:bg-surface-bright transition-colors"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-surface flex items-center justify-center overflow-hidden">
                          <img
                            className="w-full h-full object-cover"
                            alt={item.name}
                            src={item.image}
                          />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-on-surface">{item.name}</span>
                          <span className="text-xs text-on-surface-variant">{item.subtitle}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary-container text-on-secondary-container">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`font-semibold ${item.status === 'low' ? 'text-error' : 'text-on-surface'}`}
                      >
                        {item.stock}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-on-surface-variant">{item.minStock}</span>
                    </td>
                    <td className="px-6 py-5 text-right font-medium">{item.cost}</td>
                    <td className="px-6 py-5 text-center">
                      {item.status === 'low' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-error-container/10 text-error-dim border border-error/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
                          {item.statusLabel}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-secondary-container/20 text-on-secondary-fixed-variant">
                          {item.statusLabel}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="p-2 min-h-11 min-w-11 rounded-full text-on-surface-variant hover:bg-surface-container"
                          onClick={() => openEditProduct(item)}
                          aria-label={`Editar ${item.name}`}
                        >
                          <Icon name="edit" />
                        </button>
                        {canAdmin ? (
                          <button
                            type="button"
                            className="p-2 min-h-11 min-w-11 rounded-full text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors"
                            onClick={() => confirmDeleteItem(item)}
                            aria-label={`Excluir ${item.name}`}
                          >
                            <Icon name="delete" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(data.metrics || []).map((metric) => {
            const tone = metricTone[metric.tone] || metricTone.secondary;
            return (
              <div
                key={metric.id}
                className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm space-y-4"
              >
                <div className="flex justify-between items-start">
                  <Icon
                    name={metric.icon}
                    className={`p-3 rounded-xl ${tone.iconWrap}`}
                  />
                  <span className={`text-xs font-bold uppercase tracking-wider ${tone.badge}`}>
                    {metric.badge}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-on-surface-variant">{metric.label}</h3>
                  <p className="text-3xl font-extrabold text-on-surface">{metric.value}</p>
                </div>
                <div className="w-full h-1 bg-surface-variant rounded-full overflow-hidden">
                  <div
                    className={`h-full ${tone.bar} ${progressWidth[metric.progress] || 'w-1/2'}`}
                  />
                </div>
              </div>
            );
          })}
        </section>
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
        onClick={openStockEntry}
        className="fixed bottom-6 right-4 w-14 h-14 min-h-14 min-w-14 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all md:hidden z-50"
        aria-label="Registrar entrada"
      >
        <Icon name="add" />
      </button>
    </>
  );
}
