import { useEffect, useState } from 'react';
import { BAR_PERMISSIONS } from '@fnl/dashboard';
import { fetchPeople, fetchTickets, resolveTicket } from '../../services/adminApi';
import { formatBrl } from '../../services/money';
import { subscribeFreelaStore } from '../../services/freelaStore';
import { connectLabel, subscribePlatformStore } from '../../services/platformStore';
import { subscribeTenantOpsStore } from '../../services/tenantOpsApi';
import { Button } from '../../components/Button';

function permissionLabels(ids) {
  return BAR_PERMISSIONS.filter((item) => (ids || []).includes(item.id))
    .map((item) => item.label)
    .join(' · ');
}

export function AdminUsersPage() {
  const [people, setPeople] = useState(() => fetchPeople());
  const [tickets, setTickets] = useState(() => fetchTickets());
  const [error, setError] = useState('');

  useEffect(() => {
    const refresh = () => {
      setPeople(fetchPeople());
      setTickets(fetchTickets());
    };
    refresh();
    const offPlatform = subscribePlatformStore(refresh);
    const offFreela = subscribeFreelaStore(refresh);
    const offOps = subscribeTenantOpsStore(refresh);
    return () => {
      offPlatform();
      offFreela();
      offOps();
    };
  }, []);

  function handleResolve(id) {
    try {
      setTickets(resolveTicket(id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-8 max-w-6xl">
      <section className="space-y-2">
        <h2 className="font-display text-4xl uppercase tracking-wide">Pessoas</h2>
        <p className="text-sm text-[var(--muted)]">
          Donos, staff e freelas. Connect lê o blob Express atual (ainda global).
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-2xl uppercase">Donos</h3>
        <div className="overflow-x-auto">
          <table className="bar-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Bar</th>
                <th>Login</th>
              </tr>
            </thead>
            <tbody>
              {people.owners.map((person) => (
                <tr key={person.tenantId}>
                  <td>{person.name || '—'}</td>
                  <td>{person.email}</td>
                  <td>{person.tenantName}</td>
                  <td>{person.hasLogin ? 'Conta' : 'Só e-mail do tenant'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-2xl uppercase">Staff</h3>
        <div className="overflow-x-auto">
          <table className="bar-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cargo</th>
                <th>E-mail</th>
                <th>Bar</th>
                <th>Permissões</th>
              </tr>
            </thead>
            <tbody>
              {people.staff.map((person) => (
                <tr key={`${person.tenantId}-${person.id}`}>
                  <td>{person.name}</td>
                  <td>{person.title || '—'}</td>
                  <td>{person.email}</td>
                  <td>{person.tenantName}</td>
                  <td className="text-xs text-[var(--muted)]">
                    {permissionLabels(person.permissions) || 'Nenhum'}
                  </td>
                </tr>
              ))}
              {!people.staff.length ? (
                <tr>
                  <td colSpan={5} className="text-[var(--muted)]">
                    Nenhum funcionário cadastrado nos tenants.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-2xl uppercase">Freelas</h3>
        <div className="overflow-x-auto">
          <table className="bar-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Função</th>
                <th>Piso</th>
                <th>Rating</th>
                <th>Connect</th>
              </tr>
            </thead>
            <tbody>
              {people.freelas.map((person) => (
                <tr key={person.id}>
                  <td>
                    <p>{person.name}</p>
                    <p className="text-xs text-[var(--muted)]">{person.email}</p>
                  </td>
                  <td>{person.role}</td>
                  <td className="font-mono">{formatBrl(person.minBaseRate)}</td>
                  <td>
                    {person.rating || '—'}
                    <span className="text-xs text-[var(--muted)]"> ({person.reviewCount || 0})</span>
                  </td>
                  <td>
                    {connectLabel[person.stripeConnect] || person.stripeConnect}
                    {person.stripeAccountId ? (
                      <span className="block text-xs text-[var(--muted)]">
                        {person.stripeAccountId}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-2xl uppercase">Tickets</h3>
        <p className="text-sm text-[var(--muted)]">
          Seed de suporte. Não é disputa de PI nem fila de saque.
        </p>
        {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
        <div className="overflow-x-auto">
          <table className="bar-table">
            <thead>
              <tr>
                <th>Origem</th>
                <th>Bar</th>
                <th>Freela</th>
                <th>Assunto</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>{ticket.from === 'bar' ? 'Bar → freela' : 'Freela → bar'}</td>
                  <td>{ticket.tenantName}</td>
                  <td>{ticket.freelaName}</td>
                  <td>{ticket.subject}</td>
                  <td>{ticket.status === 'open' ? 'Aberto' : 'Resolvido'}</td>
                  <td>
                    {ticket.status === 'open' ? (
                      <Button
                        variant="secondary"
                        className="text-xs px-3"
                        onClick={() => handleResolve(ticket.id)}
                      >
                        Resolver
                      </Button>
                    ) : (
                      <span className="text-[var(--muted)] text-sm">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
