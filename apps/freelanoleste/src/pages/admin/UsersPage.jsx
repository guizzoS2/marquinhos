import { useState } from 'react';
import { fetchFreelas, fetchTickets, resolveTicket } from '../../services/adminApi';
import { connectLabel } from '../../services/platformStore';
import { DataTable } from '../../components/admin/DataTable';
import { Button } from '../../components/Button';

export function AdminUsersPage() {
  const [freelas] = useState(() => fetchFreelas());
  const [tickets, setTickets] = useState(() => fetchTickets());
  const [error, setError] = useState('');

  function handleResolve(id) {
    try {
      setTickets(resolveTicket(id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-8 max-w-7xl">
      <section className="space-y-2">
        <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight">
          Usuários e reclamações
        </h2>
        <p className="text-on-surface-variant text-sm">
          Freelas da plataforma. Reviews e reclamações só após serviço com pagamento Stripe.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="font-headline font-bold text-xl">Freelas cadastrados</h3>
        <DataTable columns={['Nome', 'Função', 'E-mail', 'Stripe Connect']}>
          {freelas.map((person) => (
            <tr key={person.id} className="bg-surface-container-lowest">
              <td className="px-4 md:px-6 py-4 font-bold whitespace-nowrap">{person.name}</td>
              <td className="px-4 md:px-6 py-4 text-on-surface-variant whitespace-nowrap">
                {person.role}
              </td>
              <td className="px-4 md:px-6 py-4 whitespace-nowrap">{person.email}</td>
              <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                {connectLabel[person.stripeConnect] || person.stripeConnect}
              </td>
            </tr>
          ))}
        </DataTable>
      </section>

      <section className="space-y-4">
        <h3 className="font-headline font-bold text-xl">Central de resoluções</h3>
        {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
        <DataTable columns={['Origem', 'Bar', 'Freela', 'Assunto', 'Status', 'Ação']}>
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="bg-surface-container-lowest">
              <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                {ticket.from === 'bar' ? 'Bar → freela' : 'Freela → bar'}
              </td>
              <td className="px-4 md:px-6 py-4 whitespace-nowrap">{ticket.tenantName}</td>
              <td className="px-4 md:px-6 py-4 whitespace-nowrap">{ticket.freelaName}</td>
              <td className="px-4 md:px-6 py-4">{ticket.subject}</td>
              <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                {ticket.status === 'open' ? 'Aberto' : 'Resolvido'}
              </td>
              <td className="px-4 md:px-6 py-4">
                {ticket.status === 'open' ? (
                  <Button
                    variant="secondary"
                    className="text-xs px-3"
                    onClick={() => handleResolve(ticket.id)}
                  >
                    Resolver
                  </Button>
                ) : (
                  <span className="text-on-surface-variant text-sm">—</span>
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      </section>
    </div>
  );
}
