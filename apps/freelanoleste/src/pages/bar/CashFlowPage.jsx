import { useMemo, useState } from 'react';
import { addCashFlow, fetchCashFlow, formatBrl, importCashStatement } from '../../services/tenantOpsApi';
import { parseStatementFile } from '../../services/statementImport';
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
  const [importRows, setImportRows] = useState([]);

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      setImportRows(await parseStatementFile(file));
    } catch (err) {
      setImportRows([]);
      setError(err.message || 'Não foi possível ler o arquivo.');
    }
  }

  function patchImport(id, patch) {
    setImportRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function confirmImport() {
    setError('');
    try {
      const result = importCashStatement(importRows);
      setRows(result.rows);
      setImportRows([]);
    } catch (err) {
      setError(err.message || 'Falha ao lançar o extrato.');
    }
  }

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

      <section className="bg-surface-container-lowest rounded-2xl p-4 md:p-6 space-y-3">
        <p className="font-headline font-bold">Importar extrato</p>
        <p className="text-sm text-on-surface-variant">
          PDF ou CSV do banco. Revise antes de gravar. Sem PIX de freela.
        </p>
        <label className="block">
          <input
            type="file"
            accept=".pdf,.csv,.txt,.ofx,application/pdf,text/csv"
            disabled={!writable}
            className="block w-full text-sm min-h-11"
            onChange={handleImportFile}
          />
        </label>
        {importRows.length ? (
          <ul className="space-y-3 max-h-80 overflow-y-auto">
            {importRows.map((row) => (
              <li key={row.id} className="bg-surface-container-low rounded-2xl p-3 space-y-2">
                <label className="flex items-center gap-3 min-h-11">
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={(event) =>
                      patchImport(row.id, { selected: event.target.checked })
                    }
                    className="h-5 w-5"
                  />
                  <span className="text-xs">{row.date}</span>
                  <span className="font-semibold">{formatBrl(row.amountCents / 100)}</span>
                </label>
                <input
                  value={row.description}
                  onChange={(event) => patchImport(row.id, { description: event.target.value })}
                  className="w-full bg-surface-container-lowest rounded-xl py-2 px-3 min-h-11 text-sm"
                />
                <select
                  value={row.kind}
                  onChange={(event) => patchImport(row.id, { kind: event.target.value })}
                  className="w-full bg-surface-container-lowest rounded-xl py-2 px-3 min-h-11 text-sm"
                >
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </li>
            ))}
          </ul>
        ) : null}
        {importRows.length ? (
          <Button type="button" disabled={!writable} onClick={confirmImport}>
            Confirmar lançamentos
          </Button>
        ) : null}
      </section>

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
