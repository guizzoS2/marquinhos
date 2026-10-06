import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSuppliers } from '../../services/dashboardService';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

const PAGE_SIZE = 8;

export function SuppliersList({ onEdit, onDelete, onOpen }) {
  const { data, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: fetchSuppliers,
  });
  const [page, setPage] = useState(0);
  const suppliers = data?.suppliers || [];
  const pageCount = Math.max(1, Math.ceil(suppliers.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const rows = suppliers.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  if (isLoading) {
    return <p className="text-on-surface-variant">Carregando fornecedores...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface-container-low rounded-2xl overflow-hidden p-1 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant text-xs font-bold uppercase">
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Contato</th>
                <th className="px-6 py-4">Última compra</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant/30">
              {rows.length === 0 ? (
                <tr className="bg-surface-container-lowest">
                  <td className="px-6 py-5 text-on-surface-variant" colSpan={5}>
                    Nenhum fornecedor cadastrado.
                  </td>
                </tr>
              ) : (
                rows.map((supplier) => (
                  <tr key={supplier.id} className="bg-surface-container-lowest">
                    <td className="px-6 py-5 font-bold text-on-surface">{supplier.name}</td>
                    <td className="px-6 py-5 text-on-surface-variant">{supplier.contact || '—'}</td>
                    <td className="px-6 py-5 text-on-surface-variant">{supplier.lastPurchase || '—'}</td>
                    <td className="px-6 py-5 text-right font-bold text-on-surface">
                      {supplier.lastValue || '—'}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          className="p-2 min-h-11 min-w-11 rounded-full text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
                          onClick={() => onOpen?.(supplier)}
                          aria-label={`Ver ${supplier.name}`}
                        >
                          <Icon name="visibility" />
                        </button>
                        <button
                          type="button"
                          className="p-2 min-h-11 min-w-11 rounded-full text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface transition-colors"
                          onClick={() => onEdit?.(supplier)}
                          aria-label={`Editar ${supplier.name}`}
                        >
                          <Icon name="edit" />
                        </button>
                        <button
                          type="button"
                          className="p-2 min-h-11 min-w-11 rounded-full text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors"
                          onClick={() => onDelete?.(supplier)}
                          aria-label={`Excluir ${supplier.name}`}
                        >
                          <Icon name="delete" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="secondary" disabled={current === 0} onClick={() => setPage(current - 1)}>
          Anterior
        </Button>
        <p className="text-on-surface-variant">
          {current + 1} / {pageCount}
        </p>
        <Button
          type="button"
          variant="secondary"
          disabled={current >= pageCount - 1}
          onClick={() => setPage(current + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}
