import { useMemo } from 'react';
import { compareDesc, parseISO } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { fetchInventory } from '../../services/dashboardService';
import { Icon } from '../ui/Icon';
import { Button } from '../ui/Button';
import { DataTable, EmptyRow, TBody, Td, Th, THead, Tr } from '../ui/DataTable';
import { Pagination } from '../ui/Pagination';
import { usePagedList } from '../ui/usePagedList';
import { useAuth } from '../../contexts/AuthContext';
import { isAdminRole } from '../../services/roles';
import {
  formatSaleStamp,
  isSaleOnDay,
  salesWithReceiptsOnDay,
  shiftAlreadyClosed,
  totalsByPayment,
} from '../../services/saleRules';
import { CloseShiftReport } from './CloseShiftReport';

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
  const inventory = useQuery({ queryKey: ['caixa-shift'], queryFn: fetchInventory });

  const today = useMemo(() => {
    const sales = inventory.data?.sales || [];
    return sales
      .filter((sale) => isSaleOnDay(sale))
      .slice()
      .sort((a, b) => compareDesc(parseISO(String(a.created_at || '')), parseISO(String(b.created_at || ''))));
  }, [inventory.data]);

  const page = usePagedList(today, String(today.length));
  const rows = page.rows;

  if (!isAdminRole(user?.role)) return null;

  const sales = inventory.data?.sales || [];
  const totais = totalsByPayment(sales, new Date());

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
          <Button type="button" size="icon" variant="ghost" onClick={onClose} aria-label="Fechar">
            <Icon name="close" />
          </Button>
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
            <DataTable>
              <THead>
                <Th>Data</Th>
                <Th>Hora</Th>
                <Th>Nº comanda</Th>
                <Th>Cliente</Th>
                <Th>Status</Th>
                <Th align="right">Total</Th>
              </THead>
              <TBody>
                {rows.length === 0 ? (
                  <EmptyRow colSpan={6}>Nenhuma venda hoje.</EmptyRow>
                ) : (
                  rows.map((sale) => {
                    const stamp = formatSaleStamp(sale.created_at);
                    return (
                      <Tr key={sale.id}>
                        <Td tone="muted">{stamp.data}</Td>
                        <Td tone="muted">{stamp.hora}</Td>
                        <Td tone="strong">{sale.numero_comanda ?? '—'}</Td>
                        <Td>{sale.cliente_nome || 'Consumidor'}</Td>
                        <Td>{STATUS_LABEL[sale.status] || sale.status}</Td>
                        <Td align="right" tone="strong">
                          {money(sale.total)}
                        </Td>
                      </Tr>
                    );
                  })
                )}
              </TBody>
            </DataTable>

            <Pagination state={page} />

            <CloseShiftReport
              payload={{
                byMethod: totais.byMethod,
                total: totais.total,
                count: salesWithReceiptsOnDay(sales).length,
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
