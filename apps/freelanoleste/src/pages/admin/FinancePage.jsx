import { useMemo } from 'react';
import { fetchPayments } from '../../services/adminApi';
import { DataTable } from '../../components/admin/DataTable';

const statusLabel = {
  paid: 'Pago (Stripe)',
  past_due: 'Inadimplente (Stripe)',
  pending: 'Pendente (Stripe)',
};

const kindLabel = {
  subscription: 'Assinatura SaaS',
  split: 'Split diária',
};

export function AdminFinancePage() {
  const payments = useMemo(() => fetchPayments(), []);
  const pastDue = payments.filter((item) => item.status === 'past_due');
  const splits = payments.filter((item) => item.kind === 'split');

  return (
    <div className="space-y-8 max-w-7xl">
      <section className="space-y-2">
        <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight">
          Financeiro
        </h2>
        <p className="text-on-surface-variant text-sm">
          Tudo passa pelo Stripe: assinatura do bar e split plataforma + freela. Sem PIX ou
          transferência fora da plataforma.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <article className="bg-surface-container-lowest rounded-2xl p-5 md:p-6 shadow-sm space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Splits processados
          </p>
          <p className="font-headline text-2xl font-extrabold">{splits.length}</p>
        </article>
        <article className="bg-surface-container-lowest rounded-2xl p-5 md:p-6 shadow-sm space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Inadimplências
          </p>
          <p className="font-headline text-2xl font-extrabold text-error">{pastDue.length}</p>
        </article>
      </section>

      <DataTable columns={['Tipo', 'Parte', 'Stripe ID', 'Valor', 'Status']}>
        {payments.map((row) => (
          <tr key={row.id} className="bg-surface-container-lowest">
            <td className="px-4 md:px-6 py-4 whitespace-nowrap">
              {kindLabel[row.kind] || row.label}
            </td>
            <td className="px-4 md:px-6 py-4 whitespace-nowrap">{row.party}</td>
            <td className="px-4 md:px-6 py-4 text-on-surface-variant whitespace-nowrap">
              {row.stripeId}
            </td>
            <td className="px-4 md:px-6 py-4 font-bold whitespace-nowrap">{row.amount}</td>
            <td className="px-4 md:px-6 py-4 whitespace-nowrap">
              {statusLabel[row.status] || row.status}
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
