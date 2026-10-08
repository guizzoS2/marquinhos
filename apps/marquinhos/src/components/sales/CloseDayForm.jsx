import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { DataTable, EmptyRow, TBody, Td, Th, THead, Tr } from '../ui/DataTable';
import { Icon } from '../ui/Icon';
import { useToast } from '../../contexts/ToastContext';
import { closeCashShift } from '../../services/dashboardService';
import { PAYMENT_OPTIONS } from '../../services/inventoryProduct';

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function CloseDayForm({ payload, onCancel }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const lines = payload?.lines || [];
  const byMethod = payload?.byMethod || {};
  const readOnly = Boolean(payload?.readOnly);
  const alreadyClosed = Boolean(payload?.alreadyClosed);
  const canClose = !readOnly && !alreadyClosed && Number(payload?.count || 0) > 0;

  async function consolidate() {
    setSaving(true);
    try {
      await closeCashShift();
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['caixa-shift'] });
      toast.success('Caixa do dia fechado.');
      payload?.onSuccess?.();
      onCancel();
    } catch (err) {
      toast.error(err?.message || 'Não foi possível fechar o caixa.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="font-body text-on-surface-variant">
        {readOnly
          ? 'Produtos e valores deste fechamento.'
          : 'Vendas pagas de hoje. O fechamento grava o montante e os produtos.'}
      </p>
      <DataTable>
        <THead>
          <Th>Produto</Th>
          <Th align="right">Qtd.</Th>
          <Th align="right">Valor</Th>
        </THead>
        <TBody>
          {lines.length === 0 ? (
            <EmptyRow colSpan={3}>Nenhum produto nas vendas pagas.</EmptyRow>
          ) : (
            lines.map((line) => (
              <Tr key={line.produto_id || line.nome}>
                <Td tone="strong">{line.nome}</Td>
                <Td align="right">{line.quantidade}</Td>
                <Td align="right" tone="strong">
                  {money(line.valor_total)}
                </Td>
              </Tr>
            ))
          )}
        </TBody>
      </DataTable>
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
            <Td tone="strong">Total do dia</Td>
            <Td align="right" className="font-headline text-xl font-extrabold">
              {money(payload?.total)}
            </Td>
          </Tr>
        </TBody>
      </DataTable>
      {alreadyClosed ? <p className="text-on-surface-variant">O caixa de hoje já foi fechado.</p> : null}
      {!readOnly && !alreadyClosed && !canClose ? (
        <p className="text-on-surface-variant">Não há vendas pagas hoje.</p>
      ) : null}
      {readOnly ? null : (
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onCancel}>
            <Icon name="cancel" />
            Cancelar
          </Button>
          <Button type="button" onClick={consolidate} disabled={!canClose || saving}>
            <Icon name="lock" />
            {saving ? 'Fechando...' : 'Fechar caixa'}
          </Button>
        </div>
      )}
    </div>
  );
}
