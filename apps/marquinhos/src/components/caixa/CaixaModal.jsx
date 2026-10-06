import { useMemo, useState } from 'react';
import { compareDesc, parseISO } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { fetchInventory } from '../../services/dashboardService';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { useAuth } from '../../contexts/AuthContext';
import { isAdminRole } from '../../services/roles';
import {
  formatSaleStamp,
  isSaleOnDay,
  paidSalesOnDay,
  shiftAlreadyClosed,
  totalsByPayment,
} from '../../services/saleRules';
import { CloseShiftReport } from './CloseShiftReport';

const PAGE_SIZE = 8;

const STATUS_LABEL = {
  aberta: 'Aberta',
  paga: 'Paga',
  cancelada: 'Cancelada',
};

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function CaixaModal({ onClose }) {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const inventory = useQuery({ queryKey: ['caixa-shift'], queryFn: fetchInventory });

  const today = useMemo(() => {
    const sales = inventory.data?.sales || [];
    return sales
      .filter((sale) => isSaleOnDay(sale))
      .slice()
      .sort((a, b) => compareDesc(parseISO(String(a.created_at || '')), parseISO(String(b.created_at || ''))));
  }, [inventory.data]);

  const pageCount = Math.max(1, Math.ceil(today.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const rows = today.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  if (!isAdminRole(user?.role)) return null;

  const paid = paidSalesOnDay(inventory.data?.sales || []);
  const totais = totalsByPayment(paid);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar modal"
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-7xl max-h-[90vh] overflow-y-auto bg-surface-container-lowest rounded-2xl shadow-2xl shadow-on-surface/10 p-5 md:p-8 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-on-surface">
              <Icon name="account_balance" />
            </div>
            <h3 className="font-headline text-xl font-bold text-on-surface">Fechamento de caixa</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 min-h-11 min-w-11 rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            <Icon name="close" />
          </button>
        </div>

        {inventory.isLoading ? (
          <p className="text-on-surface-variant">Carregando caixa...</p>
        ) : inventory.isError || !inventory.data ? (
          <p className="text-on-surface-variant">Não foi possível carregar o caixa.</p>
        ) : (
          <>
            <p className="text-on-surface-variant font-body">
              Vendas do dia. O fechamento soma só o que já foi pago.
            </p>
            <section className="bg-surface-container-low rounded-2xl overflow-hidden p-1 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface-variant text-xs font-bold uppercase">
                      <th className="px-6 py-4">Data</th>
                      <th className="px-6 py-4">Hora</th>
                      <th className="px-6 py-4">Nº Comanda</th>
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-variant/30">
                    {rows.length === 0 ? (
                      <tr className="bg-surface-container-lowest">
                        <td className="px-6 py-5 text-on-surface-variant" colSpan={6}>
                          Nenhuma venda hoje.
                        </td>
                      </tr>
                    ) : (
                      rows.map((sale) => {
                        const stamp = formatSaleStamp(sale.created_at);
                        return (
                          <tr key={sale.id} className="bg-surface-container-lowest">
                            <td className="px-6 py-5 text-on-surface">{stamp.data}</td>
                            <td className="px-6 py-5 text-on-surface">{stamp.hora}</td>
                            <td className="px-6 py-5 font-bold text-on-surface">{sale.numero_comanda ?? '—'}</td>
                            <td className="px-6 py-5 text-on-surface">{sale.cliente_nome || 'Consumidor'}</td>
                            <td className="px-6 py-5 text-on-surface">{STATUS_LABEL[sale.status] || sale.status}</td>
                            <td className="px-6 py-5 text-right font-semibold text-on-surface">{money(sale.total)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="secondary"
                disabled={current === 0}
                onClick={() => setPage(current - 1)}
              >
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

            <CloseShiftReport
              payload={{
                byMethod: totais.byMethod,
                total: totais.total,
                count: paid.length,
                alreadyClosed: shiftAlreadyClosed(inventory.data.closings || []),
              }}
              onCancel={onClose}
            />
          </>
        )}
      </div>
    </div>
  );
}
