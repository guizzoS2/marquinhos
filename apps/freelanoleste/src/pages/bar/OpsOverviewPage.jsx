import { useMemo } from 'react';
import { fetchOpsOverview } from '../../services/tenantOpsApi';
import { KpiCard } from '../../components/admin/KpiCard';
import { SubscriptionBanner } from '../../components/bar/SubscriptionBanner';

export function OpsOverviewPage() {
  const data = useMemo(() => fetchOpsOverview(), []);

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl">
      <section className="space-y-2">
        <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight">
          Visão geral
        </h2>
        <p className="text-on-surface-variant text-sm">
          Operacional deste tenant. Caixa interno do bar — diária de freela continua no Stripe.
        </p>
      </section>

      <SubscriptionBanner />

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon="payments"
          label="Vendas do turno"
          value={data.todaySales}
          hint="Caixa interno do bar"
        />
        <KpiCard
          icon="account_balance"
          label="Saldo do fluxo"
          value={data.cashBalance}
          hint="Entradas menos saídas"
        />
        <KpiCard
          icon="inventory_2"
          label="Itens em falta"
          value={String(data.lowStock)}
          hint="Quantidade ≤ 4"
        />
        <KpiCard
          icon="groups"
          label="Equipe da casa"
          value={String(data.teamCount)}
          hint={`${data.supplierCount} fornecedores`}
        />
      </section>
    </div>
  );
}
