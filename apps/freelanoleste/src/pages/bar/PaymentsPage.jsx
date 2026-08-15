import { useMemo } from 'react';
import {
  fetchBarDailies,
  fetchBarSubscription,
  fetchCustomerPortalUrl,
  formatBrl,
  stripeStatusLabel,
} from '../../services/ownerApi';
import { KpiCard } from '../../components/admin/KpiCard';
import { DataTable } from '../../components/admin/DataTable';
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
    <div className="space-y-6 md:space-y-8 max-w-5xl">
      <section className="space-y-2">
        <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight">
          Pagamentos
        </h2>
        <p className="text-on-surface-variant text-sm">
          Assinatura e diárias no Stripe. Sem PIX, sem cartão gravado neste app. Cartão e fatura
          ficam no Customer Portal.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KpiCard
          icon="verified"
          label="Assinatura Stripe"
          value={stripeStatusLabel[subscription.status] || subscription.status}
          hint={subscription.stripeSubscriptionId || 'Sem subscription id'}
        />
        <KpiCard
          icon="payments"
          label="Diárias no Stripe"
          value={String(dailies.length)}
          hint="Split plataforma + freela"
        />
      </section>

      <section className="bg-surface-container-lowest rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
        <p className="font-headline font-bold">Customer Portal</p>
        <p className="text-sm text-on-surface-variant">
          Cartão, faturas e cancelamento são geridos pela API do Stripe, não por CRUD local.
        </p>
        <Button className="w-full md:w-auto" onClick={handlePortal}>
          Gerenciar Pagamentos
        </Button>
      </section>

      {subscription.invoices.length ? (
        <section className="space-y-3">
          <h3 className="font-headline font-bold text-xl">Faturas da assinatura</h3>
          <div className="flex flex-col gap-3 md:hidden">
            {subscription.invoices.map((row) => (
              <article key={row.id} className="bg-surface-container-lowest rounded-2xl p-4 space-y-1">
                <p className="font-bold">{row.label}</p>
                <p className="text-sm">{row.amount}</p>
                <p className="text-xs text-on-surface-variant">{row.stripeId}</p>
              </article>
            ))}
          </div>
          <div className="hidden md:block">
            <DataTable columns={['Fatura', 'Stripe ID', 'Valor', 'Status']}>
              {subscription.invoices.map((row) => (
                <tr key={row.id} className="bg-surface-container-lowest">
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">{row.label}</td>
                  <td className="px-4 md:px-6 py-4 text-on-surface-variant whitespace-nowrap">
                    {row.stripeId}
                  </td>
                  <td className="px-4 md:px-6 py-4 font-bold whitespace-nowrap">{row.amount}</td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">{row.status}</td>
                </tr>
              ))}
            </DataTable>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="font-headline font-bold text-xl">Histórico de diárias</h3>
        <div className="flex flex-col gap-3 md:hidden">
          {dailies.map((row) => (
            <article key={row.id} className="bg-surface-container-lowest rounded-2xl p-4 space-y-1">
              <p className="font-bold">{row.freelaName}</p>
              <p className="text-sm">{row.title}</p>
              <p className="text-sm font-semibold">{formatBrl(row.amount)}</p>
              <p className="text-xs text-on-surface-variant">
                {new Date(`${row.date}T12:00:00`).toLocaleDateString('pt-BR')} · {row.stripeId}
              </p>
            </article>
          ))}
        </div>
        <div className="hidden md:block">
          <DataTable columns={['Freela', 'Turno', 'Stripe ID', 'Valor', 'Status']}>
            {dailies.map((row) => (
              <tr key={row.id} className="bg-surface-container-lowest">
                <td className="px-4 md:px-6 py-4 font-bold whitespace-nowrap">{row.freelaName}</td>
                <td className="px-4 md:px-6 py-4 whitespace-nowrap">{row.title}</td>
                <td className="px-4 md:px-6 py-4 text-on-surface-variant whitespace-nowrap">
                  {row.stripeId}
                </td>
                <td className="px-4 md:px-6 py-4 font-bold whitespace-nowrap">
                  {formatBrl(row.amount)}
                </td>
                <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                  {dailyStatus[row.status] || row.status}
                </td>
              </tr>
            ))}
          </DataTable>
        </div>
      </section>
    </div>
  );
}
