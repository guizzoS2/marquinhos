import { useEffect, useState } from 'react';
import { fetchOverview } from '../../services/adminApi';
import { subscribeFreelaStore } from '../../services/freelaStore';
import { subscribePlatformStore } from '../../services/platformStore';

export function AdminOverviewPage() {
  const [data, setData] = useState(() => fetchOverview());

  useEffect(() => {
    const refresh = () => setData(fetchOverview());
    refresh();
    const offPlatform = subscribePlatformStore(refresh);
    const offFreela = subscribeFreelaStore(refresh);
    return () => {
      offPlatform();
      offFreela();
    };
  }, []);

  return (
    <div className="space-y-8 max-w-6xl">
      <section className="space-y-2">
        <p className="font-display text-sm tracking-[0.28em] text-[var(--muted)]">
          HOJE · ESTA SEMANA
        </p>
        <h2 className="font-display text-4xl md:text-5xl uppercase tracking-wide">Visão geral</h2>
        <p className="text-sm text-[var(--muted)]">
          Plataforma: bares, noites e Stripe. Sem caixa, estoque ou equipe interna de um tenant.
        </p>
      </section>

      <section className="bar-strip">
        <div className="bar-strip-cell">
          <p className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
            Tenants
          </p>
          <p className="font-mono text-2xl mt-1">{data.tenantCount}</p>
          <p className="text-xs text-[var(--muted)] mt-1">
            {data.activeSubscriptions} ativas · {data.incomplete} incompletas
          </p>
        </div>
        <div className="bar-strip-cell">
          <p className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
            Ativos
          </p>
          <p className="font-spray text-3xl text-[var(--spray)] mt-1">
            {data.activeSubscriptions}
          </p>
        </div>
        <div className="bar-strip-cell">
          <p className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
            Freelas
          </p>
          <p className="font-mono text-2xl mt-1">{data.registeredFreelas}</p>
        </div>
      </section>

      <section className="bar-strip">
        <div className="bar-strip-cell">
          <p className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
            Inadimplência
          </p>
          <p className={`font-mono text-2xl mt-1 ${data.pastDue ? 'bar-neg' : ''}`}>
            {data.pastDue}
          </p>
          <p className="text-xs text-[var(--muted)] mt-1">{data.openTickets} tickets abertos</p>
        </div>
        <div className="bar-strip-cell">
          <p className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
            Noites hoje
          </p>
          <p className="font-mono text-2xl mt-1">{data.nightsToday}</p>
        </div>
        <div className="bar-strip-cell">
          <p className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
            ACEITA na semana
          </p>
          <p className="font-mono text-2xl mt-1">{data.acceptedThisWeek}</p>
          <p className="text-xs text-[var(--muted)] mt-1">
            Connect incompleto: {data.incompleteConnect}
          </p>
        </div>
      </section>
    </div>
  );
}
