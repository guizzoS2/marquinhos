import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDashboardApi } from '../contexts/DashboardApiContext';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { useModal } from '../contexts/ModalContext';

export function InventoryPage() {
  const { api, tenantId } = useDashboardApi();
  const [filter, setFilter] = useState('Todos');
  const { openModal } = useModal();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['inventory', tenantId],
    queryFn: api.fetchInventory,
  });

  const items = useMemo(() => {
    if (!data?.items) return [];
    if (filter === 'Todos') return data.items;
    return data.items.filter((item) => item.category === filter);
  }, [data, filter]);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['inventory', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['cash-flow', tenantId] });
    queryClient.invalidateQueries({ queryKey: ['overview', tenantId] });
  }

  if (isLoading || !data) {
    return <p className="text-[var(--muted,#5c5c5c)]">Abrindo o estoque...</p>;
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="font-display text-4xl uppercase tracking-wide">Estoque</h2>
          <p className="text-sm text-[var(--muted,#5c5c5c)]">
            Cadastre o produto. Entrada de compra vira saída no caixa.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => openModal('new-product', { onSuccess: refresh })}
          >
            Novo produto
          </Button>
          <Button onClick={() => openModal('stock-entry', { items: data.items, onSuccess: refresh })}>
            Entrada
          </Button>
        </div>
      </header>

      <section className="bar-strip">
        {(data.metrics || []).map((metric) => (
          <div key={metric.id} className="bar-strip-cell">
            <p className="font-display text-sm tracking-widest uppercase text-[var(--muted,#5c5c5c)]">
              {metric.label}
            </p>
            <p className="font-mono text-2xl mt-1">{metric.value}</p>
          </div>
        ))}
      </section>

      <div className="flex flex-wrap gap-2">
        {(data.filters || ['Todos']).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={filter === item ? 'bar-sticker bar-sticker-on' : 'bar-sticker'}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="bar-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Categoria</th>
              <th>Atual</th>
              <th>Mínimo</th>
              <th className="text-right">Custo</th>
              <th>Status</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <p>{item.name}</p>
                  <p className="text-xs text-[var(--muted,#5c5c5c)]">{item.subtitle}</p>
                </td>
                <td>{item.category}</td>
                <td className={item.status === 'low' ? 'bar-neg' : ''}>{item.stock}</td>
                <td>{item.minStock}</td>
                <td className="text-right">{item.cost}</td>
                <td>{item.statusLabel}</td>
                <td className="text-right">
                  <button
                    type="button"
                    className="min-h-11 min-w-11 px-2"
                    aria-label={`Excluir ${item.name}`}
                    onClick={() =>
                      openModal('confirm', {
                        message: `Remover "${item.name}"?`,
                        confirmLabel: 'Excluir',
                        successMessage: 'Item removido.',
                        errorMessage: 'Falha ao remover.',
                        onConfirm: async () => {
                          await api.removeInventoryItem(item.id);
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
            {!items.length ? (
              <tr>
                <td colSpan={7} className="text-[var(--muted,#5c5c5c)]">
                  Estoque vazio. Cadastre um produto.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
