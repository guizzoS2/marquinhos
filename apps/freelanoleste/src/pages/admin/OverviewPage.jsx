import { useMemo } from 'react';
import { fetchOverview } from '../../services/adminApi';
import { KpiCard } from '../../components/admin/KpiCard';

export function AdminOverviewPage() {
  const data = useMemo(() => fetchOverview(), []);

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl">
      <section className="space-y-2">
        <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight">
          Visão geral
        </h2>
        <p className="text-on-surface-variant text-sm">
          Camada da plataforma: tenants, assinaturas Stripe e freelas. Sem dados operacionais de
          caixa ou estoque de um bar.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          icon="payments"
          label="Faturamento global"
          value={data.kpis.globalRevenue}
          hint="Assinaturas + taxa de split Stripe"
        />
        <KpiCard
          icon="verified"
          label="Assinaturas ativas"
          value={String(data.kpis.activeSubscriptions)}
          hint={`${data.tenantCount} tenants no total`}
        />
        <KpiCard
          icon="badge"
          label="Freelas cadastrados"
          value={String(data.kpis.registeredFreelas)}
          hint="Cadastro na plataforma, não no painel do bar"
        />
        <KpiCard
          icon="warning"
          label="Inadimplência Stripe"
          value={String(data.kpis.pastDue)}
          hint={`${data.openTickets} tickets abertos`}
        />
      </section>
    </div>
  );
}
