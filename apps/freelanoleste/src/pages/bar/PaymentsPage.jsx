import { useMemo } from 'react';
import {
  fetchBarDailies,
  fetchBarSubscription,
  fetchCustomerPortalUrl,
  formatBrl,
  stripeStatusLabel,
} from '../../services/ownerApi';
import { Button } from '../../components/Button';

const dailyStatus = {
  paid: 'Pago (Stripe split)',
  pending: 'Pendente (Stripe)',
};

export function BarPaymentsPage() {
  const subscription = useMemo(() => fetchBarSubscription(), []);
  const dailies = useMemo(() => fetchBarDailies(), []);

  async function handlePortal() {
    const url = await fetchCustomerPortalUrl();
    window.location.assign(url);
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <section className="space-y-2">
        <h2 className="font-display text-4xl uppercase tracking-wide">Pagamentos</h2>
        <p className="text-sm text-[var(--muted)]">
          Assinatura e diárias no Stripe. Sem PIX. Cartão fica no Customer Portal.
        </p>
      </section>

      <section className="bar-strip">
        <div className="bar-strip-cell">
          <p className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
            Assinatura
          </p>
          <p className="font-mono text-xl mt-1">
            {stripeStatusLabel[subscription.status] || subscription.status}
          </p>
        </div>
        <div className="bar-strip-cell">
          <p className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
            Diárias Stripe
          </p>
          <p className="font-spray text-3xl text-[var(--spray)] mt-1">{dailies.length}</p>
        </div>
      </section>

      <section className="bar-block space-y-3">
        <h3 className="font-display text-2xl uppercase">Customer Portal</h3>
        <p className="text-sm text-[var(--muted)]">
          Cartão, faturas e cancelamento na API do Stripe.
        </p>
        <Button onClick={handlePortal}>Gerenciar pagamentos</Button>
      </section>

      {subscription.invoices.length ? (
        <section className="space-y-3">
          <h3 className="font-display text-2xl uppercase">Faturas</h3>
          <div className="overflow-x-auto">
            <table className="bar-table">
              <thead>
                <tr>
                  <th>Fatura</th>
                  <th>Stripe</th>
                  <th className="text-right">Valor</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {subscription.invoices.map((row) => (
                  <tr key={row.id}>
                    <td>{row.label}</td>
                    <td>{row.stripeId}</td>
                    <td className="text-right">{row.amount}</td>
                    <td>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="font-display text-2xl uppercase">Diárias</h3>
        <div className="overflow-x-auto">
          <table className="bar-table">
            <thead>
              <tr>
                <th>Freela</th>
                <th>Turno</th>
                <th>Stripe</th>
                <th className="text-right">Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {dailies.map((row) => (
                <tr key={row.id}>
                  <td>{row.freelaName}</td>
                  <td>{row.title}</td>
                  <td>{row.stripeId}</td>
                  <td className="text-right">{formatBrl(row.amount)}</td>
                  <td>{dailyStatus[row.status] || row.status}</td>
                </tr>
              ))}
              {!dailies.length ? (
                <tr>
                  <td colSpan={5} className="text-[var(--muted)]">
                    Nenhuma diária neste tenant.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
