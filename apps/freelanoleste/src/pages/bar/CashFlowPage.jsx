import { useMemo, useState } from 'react';
import { addCashFlow, fetchCashFlow, formatBrl } from '../../services/tenantOpsApi';
import { DataTable } from '../../components/admin/DataTable';
import { Button } from '../../components/Button';
import { SubscriptionBanner, isOpsWritable } from '../../components/bar/SubscriptionBanner';

export function CashFlowPage() {
  const writable = useMemo(() => isOpsWritable(), []);
  const [rows, setRows] = useState(() => fetchCashFlow());
  const [kind, setKind] = useState('entrada');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      setRows(addCashFlow({ kind, label, amount }));
      setLabel('');
      setAmount('');
    } catch (err) {
      setError(err.message || 'Não foi possível registrar.');
    }
  }

  return (
    <div className="space-y-6 md:space-y-8 max-w-5xl">
      <section className="space-y-2">
        <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight">
          Fluxo de caixa
        </h2>
        <p className="text-on-surface-variant text-sm">
          Movimento interno do bar. Diária de freela não entra aqui — vai no Stripe com split.
        </p>
      </section>

      <SubscriptionBanner />

      <form
        className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
        onSubmit={handleSubmit}
      >
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
            Tipo
          </span>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            disabled={!writable}
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
          >
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
        </label>
        <label className="block space-y-2 md:col-span-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
            Descrição
          </span>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            disabled={!writable}
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
            Valor (R$)
          </span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            disabled={!writable}
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
          />
        </label>
        <Button type="submit" className="w-full md:w-auto md:col-span-4" disabled={!writable}>
          Registrar
        </Button>
      </form>
      {error ? <p className="text-sm text-error">{error}</p> : null}

      {rows.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Sem lançamentos.</p>
      ) : (
        <>
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((row) => (
              <article key={row.id} className="bg-surface-container-lowest rounded-2xl p-4 space-y-1">
                <p className="font-bold">{row.label}</p>
                <p className="text-sm">
                  {row.kind === 'entrada' ? 'Entrada' : 'Saída'} · {formatBrl(row.amount)}
                </p>
                <p className="text-xs text-on-surface-variant">{row.date}</p>
              </article>
            ))}
          </div>
          <div className="hidden md:block">
            <DataTable columns={['Data', 'Tipo', 'Descrição', 'Valor']}>
              {rows.map((row) => (
                <tr key={row.id} className="bg-surface-container-lowest">
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">{row.date}</td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                    {row.kind === 'entrada' ? 'Entrada' : 'Saída'}
                  </td>
                  <td className="px-4 md:px-6 py-4">{row.label}</td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap font-semibold">
                    {formatBrl(row.amount)}
                  </td>
                </tr>
              ))}
            </DataTable>
          </div>
        </>
      )}
    </div>
  );
}
