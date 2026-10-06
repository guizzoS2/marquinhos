import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format, isValid, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fetchInventory, fetchSuppliers, removeSupplier, reversePurchase } from '../services/dashboardService';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
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

export function SuppliersPage() {
  const { openModal } = useModal();
  const queryClient = useQueryClient();
  const suppliersQuery = useQuery({
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

  function confirmCancel(row) {
    openModal('confirm', {
      message: `Estornar a compra de ${row.supplierName || 'fornecedor'}? O estoque será reduzido e a despesa cancelada.`,
      confirmLabel: 'Estornar/Cancelar Compra',
      successMessage: 'Compra cancelada.',
      errorMessage: 'Não foi possível cancelar a compra.',
      onConfirm: async () => {
        await reversePurchase(row.id);
        refreshPurchase();
      },
    });
  }

  const purchases = inventory.data?.purchases || [];
  const purchasePage = usePagedList(purchases, String(purchases.length));

  if (inventory.isLoading || !inventory.data) {
    return (
      <div className="p-4 md:p-8 text-on-surface-variant font-body">Carregando compras...</div>
    );
  }

  const suppliers = suppliersQuery.data?.suppliers || [];

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <PageHeader
        title="Compras"
        description="Histórico das compras. Uma compra finalizada só pode ser estornada."
      >
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() =>
              openModal('suppliers-list', {
                onChanged: refreshSuppliers,
                onDelete: confirmDelete,
              })
            }
          >
            Ver fornecedores
          </Button>
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
      </PageHeader>

      <section className="bg-surface-container-low rounded-2xl overflow-hidden p-1 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant text-xs font-bold uppercase">
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Fornecedor</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Produtos</th>
                <th className="px-6 py-4 text-right">Valor total</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant/30">
              {purchases.length === 0 ? (
                <tr className="bg-surface-container-lowest">
                  <td className="px-6 py-5 text-on-surface-variant" colSpan={7}>
                    Nenhuma compra registrada.
                  </td>
                </tr>
              ) : (
                purchasePage.rows.map((row) => {
                  const cancelled = row.status === 'cancelada';
                  return (
                    <tr key={row.id} className="bg-surface-container-lowest">
                      <td className="px-6 py-5 text-on-surface">{formatPurchaseDate(row.date)}</td>
                      <td className="px-6 py-5 font-bold text-on-surface">{row.supplierName}</td>
                      <td className="px-6 py-5 text-on-surface">{row.categoryName}</td>
                      <td className="px-6 py-5 text-on-surface-variant">
                        {(row.itens || []).map((item) => `${item.nome} × ${item.quantidade}`).join(', ') || '—'}
                      </td>
                      <td className="px-6 py-5 text-right font-bold text-on-surface">{money(row.total)}</td>
                      <td className="px-6 py-5">
                        <span
                          className={
                            cancelled
                              ? 'inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-surface-variant/40 text-on-surface-variant'
                              : 'inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-secondary-container/20 text-on-secondary-fixed-variant'
                          }
                        >
                          {cancelled ? 'Cancelada' : 'Ativa'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        {cancelled ? (
                          <span className="text-on-surface-variant">—</span>
                        ) : (
                          <Button type="button" variant="danger" onClick={() => confirmCancel(row)}>
                            Estornar/Cancelar Compra
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4">
          <Pagination state={purchasePage} />
        </div>
      </section>
    </div>
  );
}
