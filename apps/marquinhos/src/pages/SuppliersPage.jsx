import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, isValid, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fetchInventory, fetchSuppliers, removeSupplier } from '../services/dashboardService';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { useModal } from '../contexts/ModalContext';

function formatPurchaseDate(value) {
  const parsed = parse(String(value || ''), 'yyyy-MM-dd', new Date(0));
  if (!isValid(parsed)) return '—';
  return format(parsed, 'dd/MM/yyyy', { locale: ptBR });
}

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function SuppliersPage() {
  const { openModal } = useModal();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: fetchSuppliers,
  });
  const inventory = useQuery({
    queryKey: ['inventory'],
    queryFn: fetchInventory,
  });

  function refreshSuppliers() {
    queryClient.invalidateQueries({ queryKey: ['suppliers'] });
  }

  function refreshPurchase() {
    refreshSuppliers();
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
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
  const purchases = inventory.data?.purchases || [];

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
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="secondary"
            onClick={() =>
              openModal('new-purchase', {
                items: inventory.data?.items || [],
                suppliers,
                onSuccess: refreshPurchase,
              })
            }
          >
            <Icon name="add" />
            Nova compra
          </Button>
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
        </div>
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
                  <td className="px-6 py-5 text-right" onClick={(event) => event.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="p-2 min-h-11 min-w-11 rounded-full text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
                        onClick={() =>
                          openModal('edit-supplier', {
                            supplier,
                            onSuccess: refreshSuppliers,
                          })
                        }
                        aria-label={`Editar ${supplier.name}`}
                      >
                        <Icon name="edit" />
                      </button>
                      <button
                        type="button"
                        className="p-2 min-h-11 min-w-11 rounded-full text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors"
                        onClick={() => confirmDelete(supplier)}
                        aria-label={`Excluir ${supplier.name}`}
                      >
                        <Icon name="delete" />
                      </button>
                    </div>
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

      <section className="space-y-4">
        <h2 className="text-xl font-headline font-bold text-on-surface">Histórico de compras</h2>
        <div className="bg-surface-container-low rounded-2xl overflow-hidden p-1 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant text-xs font-bold uppercase tracking-widest">
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Fornecedor</th>
                  <th className="px-6 py-4">Categoria</th>
                  <th className="px-6 py-4">Produtos</th>
                  <th className="px-6 py-4 text-right">Valor total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant/30">
                {purchases.length === 0 ? (
                  <tr className="bg-surface-container-lowest">
                    <td className="px-6 py-5 text-on-surface-variant" colSpan={5}>
                      Nenhuma compra registrada.
                    </td>
                  </tr>
                ) : (
                  purchases.map((row) => (
                    <tr key={row.id} className="bg-surface-container-lowest">
                      <td className="px-6 py-5 text-on-surface">{formatPurchaseDate(row.date)}</td>
                      <td className="px-6 py-5 font-bold text-on-surface">{row.supplierName}</td>
                      <td className="px-6 py-5 text-on-surface">{row.categoryName}</td>
                      <td className="px-6 py-5 text-on-surface-variant">
                        {(row.itens || [])
                          .map((item) => `${item.nome} × ${item.quantidade}`)
                          .join(', ') || '—'}
                      </td>
                      <td className="px-6 py-5 text-right font-bold text-on-surface">{money(row.total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
