import { useMemo, useState } from 'react';
import { compareDesc, parseISO } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import { fetchInventory } from '../services/dashboardService';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { isAdminRole } from '../services/roles';
import {
  formatSaleStamp,
  isSaleOnDay,
  paidSalesOnDay,
  shiftAlreadyClosed,
  totalsByPayment,
} from '../services/saleRules';

const PAGE_SIZE = 8;

const STATUS_LABEL = {
  aberta: 'Aberta',
  paga: 'Paga',
  cancelada: 'Cancelada',
};

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function CaixaPage() {
  const { user } = useAuth();
  const { openModal } = useModal();
  const [page, setPage] = useState(0);
  const inventory = useQuery({ queryKey: ['inventory'], queryFn: fetchInventory });

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

  if (!isAdminRole(user?.role)) {
    return <Navigate to="/" replace />;
  }

  if (inventory.isLoading) {
    return <div className="p-4 md:p-8 text-on-surface-variant">Carregando caixa...</div>;
  }

  if (inventory.isError || !inventory.data) {
    return <div className="p-4 md:p-8 text-on-surface-variant">Não foi possível carregar o caixa.</div>;
  }

  function openClose() {
    const paid = paidSalesOnDay(inventory.data.sales || []);
    const totais = totalsByPayment(paid);
    openModal('close-register', {
      byMethod: totais.byMethod,
      total: totais.total,
      count: paid.length,
      alreadyClosed: shiftAlreadyClosed(inventory.data.closings || []),
    });
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold text-on-background tracking-tight">Caixa</h2>
          <p className="text-on-surface-variant max-w-xl font-body">
            Vendas do dia. O fechamento soma só o que já foi pago.
          </p>
        </div>
        <Button type="button" className="w-full md:w-auto" onClick={openClose}>
          Fechar Caixa
        </Button>
      </section>

      <section className="bg-surface-container-low rounded-2xl overflow-hidden p-1 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant text-xs font-bold uppercase tracking-widest">
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
    </div>
  );
}
