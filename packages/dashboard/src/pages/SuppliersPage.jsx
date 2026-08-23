import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDashboardApi } from '../contexts/DashboardApiContext';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { useModal } from '../contexts/ModalContext';

export function SuppliersPage() {
  const { api, tenantId } = useDashboardApi();
  const { openModal } = useModal();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', tenantId],
    queryFn: api.fetchSuppliers,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['suppliers', tenantId] });
  }

  if (isLoading || !data) {
    return <p className="text-[var(--muted,#5c5c5c)]">Abrindo fornecedores...</p>;
  }

  const suppliers = data.suppliers || [];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="font-display text-4xl uppercase tracking-wide">Fornecedores</h2>
          <p className="text-sm text-[var(--muted,#5c5c5c)]">Cadastro interno. Compra cai no caixa.</p>
        </div>
        <Button onClick={() => openModal('new-supplier', { onSuccess: refresh })}>
          Novo
        </Button>
      </header>

      <div className="overflow-x-auto">
        <table className="bar-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Contato</th>
              <th>Última compra</th>
              <th className="text-right">Valor</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier) => (
              <tr
                key={supplier.id}
                className="cursor-pointer"
                onClick={() => openModal('supplier-detail', { supplierId: supplier.id, supplier })}
              >
                <td>{supplier.name}</td>
                <td>{supplier.contact || '—'}</td>
                <td>{supplier.lastPurchase || '—'}</td>
                <td className="text-right">{supplier.lastValue || '—'}</td>
                <td className="text-right">
                  <button
                    type="button"
                    className="min-h-11 min-w-11 px-2"
                    aria-label={`Excluir ${supplier.name}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      openModal('confirm', {
                        message: `Excluir "${supplier.name}"?`,
                        confirmLabel: 'Excluir',
                        successMessage: 'Removido.',
                        errorMessage: 'Falha ao excluir.',
                        onConfirm: async () => {
                          await api.removeSupplier(supplier.id);
                          refresh();
                        },
                      });
                    }}
                  >
                    <Icon name="delete" />
                  </button>
                </td>
              </tr>
            ))}
            {!suppliers.length ? (
              <tr>
                <td colSpan={5} className="text-[var(--muted,#5c5c5c)]">
                  Nenhum fornecedor.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
