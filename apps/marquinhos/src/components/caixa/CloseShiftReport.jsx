import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
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
      <div className="bg-surface-container-low rounded-2xl overflow-hidden p-1 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-on-surface-variant text-xs font-bold uppercase tracking-widest">
                <th className="px-6 py-4">Forma de pagamento</th>
                <th className="px-6 py-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant/30">
              {PAYMENT_OPTIONS.map((method) => (
                <tr key={method.value} className="bg-surface-container-lowest">
                  <td className="px-6 py-5 text-on-surface">{method.label}</td>
                  <td className="px-6 py-5 text-right font-semibold text-on-surface">
                    {money(byMethod[method.value])}
                  </td>
                </tr>
              ))}
              <tr className="bg-surface-container-lowest">
                <td className="px-6 py-5 font-bold text-on-surface">Total</td>
                <td className="px-6 py-5 text-right font-headline text-xl font-extrabold text-on-surface">
                  {money(payload?.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      {alreadyClosed ? (
        <p className="text-on-surface-variant">O turno de hoje já foi consolidado.</p>
      ) : null}
      {!alreadyClosed && !canClose ? (
        <p className="text-on-surface-variant">Não há vendas pagas hoje.</p>
      ) : null}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Fechar
        </Button>
        <Button type="button" onClick={consolidate} disabled={!canClose || saving}>
          {saving ? 'Consolidando...' : 'Consolidar turno'}
        </Button>
      </div>
    </div>
  );
}
