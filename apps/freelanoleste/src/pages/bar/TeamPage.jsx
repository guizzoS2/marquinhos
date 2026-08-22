import { useMemo, useState } from 'react';
import { addTeamMember, fetchTeam } from '../../services/tenantOpsApi';
import { DataTable } from '../../components/admin/DataTable';
import { Button } from '../../components/Button';
import { SubscriptionBanner, isOpsWritable } from '../../components/bar/SubscriptionBanner';

export function TeamPage() {
  const writable = useMemo(() => isOpsWritable(), []);
  const [rows, setRows] = useState(() => fetchTeam());
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      setRows(addTeamMember({ name, role }));
      setName('');
      setRole('');
    } catch (err) {
      setError(err.message || 'Não foi possível incluir.');
    }
  }

  return (
    <div className="space-y-6 md:space-y-8 max-w-5xl">
      <section className="space-y-2">
        <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight">
          Equipe da casa
        </h2>
        <p className="text-on-surface-variant text-sm">
          Pessoal fixo deste tenant. Freelas da plataforma ficam na vitrine, não nesta lista.
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
            Função
          </span>
          <input
            value={role}
            onChange={(event) => setRole(event.target.value)}
            disabled={!writable}
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
          />
        </label>
        <Button type="submit" className="w-full md:w-auto md:col-span-2" disabled={!writable}>
          Incluir na equipe
        </Button>
      </form>
      {error ? <p className="text-sm text-error">{error}</p> : null}

      {rows.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Equipe vazia.</p>
      ) : (
        <>
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((row) => (
              <article key={row.id} className="bg-surface-container-lowest rounded-2xl p-4 space-y-1">
                <p className="font-bold">{row.name}</p>
                <p className="text-sm text-on-surface-variant">{row.role}</p>
              </article>
            ))}
          </div>
          <div className="hidden md:block">
            <DataTable columns={['Nome', 'Função']}>
              {rows.map((row) => (
                <tr key={row.id} className="bg-surface-container-lowest">
                  <td className="px-4 md:px-6 py-4 font-bold whitespace-nowrap">{row.name}</td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">{row.role}</td>
                </tr>
              ))}
            </DataTable>
          </div>
        </>
      )}
    </div>
  );
}
