import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchSuppliers, removeSupplier } from '../services/dashboardService';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { useModal } from '../contexts/ModalContext';

export function SuppliersPage() {
  const { openModal } = useModal();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: fetchSuppliers,
  });

  function refreshSuppliers() {
    queryClient.invalidateQueries({ queryKey: ['suppliers'] });
  }

  function confirmDelete(supplier) {
    openModal('confirm', {
      message: `Excluir o fornecedor "${supplier.name}"?`,
      confirmLabel: 'Excluir',
      successMessage: 'Fornecedor removido.',
      errorMessage: 'Falha ao excluir fornecedor.',
      onConfirm: async () => {
        await removeSupplier(supplier.id);
        refreshSuppliers();
      },
    });
  }

  if (isLoading || !data) {
    return (
      <div className="p-4 md:p-8 text-on-surface-variant font-body">
        Carregando fornecedores...
      </div>
    );
  }

  const suppliers = data.suppliers || [];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-on-background tracking-tight font-headline">
            Fornecedores
          </h1>
          <p className="text-on-surface-variant max-w-xl font-body">
            Cadastre fornecedores e acompanhe a última compra vinculada aos gastos.
          </p>
        </div>
        <Button
          onClick={() =>
            openModal('new-supplier', {
              onSuccess: refreshSuppliers,
            })
          }
        >
          <Icon name="add" />
          Novo fornecedor
        </Button>
      </section>

      <div className="bg-surface-container-low rounded-2xl overflow-hidden p-1 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant text-xs font-bold uppercase tracking-widest">
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4">Última compra</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant/30">
              {suppliers.map((supplier) => (
                <tr
                  key={supplier.id}
                  className="bg-surface-container-lowest hover:bg-surface-bright transition-colors cursor-pointer"
                  onClick={() =>
                    openModal('supplier-detail', {
                      supplierId: supplier.id,
                    })
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      openModal('supplier-detail', {
                        supplierId: supplier.id,
                      });
                    }
                  }}
                  tabIndex={0}
                >
                  <td className="px-6 py-5 font-bold text-on-surface">{supplier.name}</td>
                  <td className="px-6 py-5 text-on-surface-variant">{supplier.contact || '—'}</td>
                  <td className="px-6 py-5 text-on-surface-variant">
                    {supplier.lastPurchase || '—'}
                  </td>
                  <td className="px-6 py-5 text-right font-bold text-on-surface">
                    {supplier.lastValue || '—'}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button
                      type="button"
                      className="p-2 min-h-11 min-w-11 rounded-full text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors"
                      onClick={(event) => {
                        event.stopPropagation();
                        confirmDelete(supplier);
                      }}
                      aria-label={`Excluir ${supplier.name}`}
                    >
                      <Icon name="delete" />
                    </button>
                  </td>
                </tr>
              ))}
              {!suppliers.length ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-on-surface-variant text-sm"
                  >
                    Nenhum fornecedor cadastrado.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
