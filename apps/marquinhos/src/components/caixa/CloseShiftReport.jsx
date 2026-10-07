import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { DataTable, TBody, Td, Th, THead, Tr } from '../ui/DataTable';
import { useToast } from '../../contexts/ToastContext';
import { closeCashShift } from '../../services/dashboardService';
import { PAYMENT_OPTIONS } from '../../services/inventoryProduct';

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function CloseShiftReport({ payload, onCancel }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const byMethod = payload?.byMethod || {};
  const alreadyClosed = Boolean(payload?.alreadyClosed);
  const canClose = !alreadyClosed && Number(payload?.count || 0) > 0;

  async function consolidate() {
    setSaving(true);
    try {
      await closeCashShift();
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['caixa-shift'] });
      toast.success('Turno consolidado.');
      onCancel();
    } catch (err) {
      toast.error(err?.message || 'Não foi possível fechar o caixa.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-on-surface-variant font-body">
        Faturamento de hoje. Só entram vendas pagas.
      </p>
      <DataTable>
        <THead>
          <Th>Forma de pagamento</Th>
          <Th align="right">Total</Th>
        </THead>
        <TBody>
          {PAYMENT_OPTIONS.map((method) => (
            <Tr key={method.value}>
              <Td>{method.label}</Td>
              <Td align="right" tone="strong">
                {money(byMethod[method.value])}
              </Td>
            </Tr>
          ))}
          <Tr>
            <Td tone="strong">Total</Td>
            <Td align="right" className="font-headline text-xl font-extrabold">
              {money(payload?.total)}
            </Td>
          </Tr>
        </TBody>
      </DataTable>
      {alreadyClosed ? (
        <p className="text-on-surface-variant">O turno de hoje já foi consolidado.</p>
      ) : null}
      {!alreadyClosed && !canClose ? (
        <p className="text-on-surface-variant">Não há vendas pagas hoje.</p>
      ) : null}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button type="button" onClick={consolidate} disabled={!canClose || saving}>
          <Icon name="check" />
          {saving ? 'Consolidando...' : 'Confirmar fechamento'}
        </Button>
      </div>
    </div>
  );
}
