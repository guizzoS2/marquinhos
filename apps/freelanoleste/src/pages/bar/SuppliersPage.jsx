import { useMemo, useState } from 'react';
import { addSupplier, fetchSuppliers } from '../../services/tenantOpsApi';
import { DataTable } from '../../components/admin/DataTable';
import { Button } from '../../components/Button';
import { SubscriptionBanner, isOpsWritable } from '../../components/bar/SubscriptionBanner';

export function SuppliersPage() {
  const writable = useMemo(() => isOpsWritable(), []);
  const [rows, setRows] = useState(() => fetchSuppliers());
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      setRows(addSupplier({ name, contact }));
      setName('');
      setContact('');
    } catch (err) {
      setError(err.message || 'Não foi possível incluir.');
    }
  }

  return (
    <div className="space-y-6 md:space-y-8 max-w-5xl">
      <section className="space-y-2">
        <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight">
          Fornecedores
        </h2>
        <p className="text-on-surface-variant text-sm">
          Cadastro interno do tenant. Pagamento de diária de freela não passa por aqui.
        </p>
      </section>

      <SubscriptionBanner />

      <form className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
            Nome
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={!writable}
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
            Contato
          </span>
          <input
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            disabled={!writable}
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
          />
        </label>
        <Button type="submit" className="w-full md:w-auto md:col-span-2" disabled={!writable}>
          Incluir fornecedor
        </Button>
      </form>
      {error ? <p className="text-sm text-error">{error}</p> : null}

      {rows.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Nenhum fornecedor.</p>
      ) : (
        <>
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((row) => (
              <article key={row.id} className="bg-surface-container-lowest rounded-2xl p-4 space-y-1">
                <p className="font-bold">{row.name}</p>
                <p className="text-sm text-on-surface-variant">{row.contact || 'Sem contato'}</p>
              </article>
            ))}
          </div>
          <div className="hidden md:block">
            <DataTable columns={['Fornecedor', 'Contato']}>
              {rows.map((row) => (
                <tr key={row.id} className="bg-surface-container-lowest">
                  <td className="px-4 md:px-6 py-4 font-bold whitespace-nowrap">{row.name}</td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">{row.contact || '—'}</td>
                </tr>
              ))}
            </DataTable>
          </div>
        </>
      )}
    </div>
  );
}
