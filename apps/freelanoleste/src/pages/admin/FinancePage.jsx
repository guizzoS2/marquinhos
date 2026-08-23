import { useEffect, useState } from 'react';
import { fetchFinanceRails } from '../../services/adminApi';
import { formatBrl } from '../../services/money';
import { subscribeFreelaStore } from '../../services/freelaStore';
import { stripeStatusLabel, subscribePlatformStore } from '../../services/platformStore';

const statusLabel = {
  paid: 'Pago (Stripe)',
  past_due: 'Inadimplente (Stripe)',
  pending: 'Pendente (Stripe)',
};

export function AdminFinancePage() {
  const [rails, setRails] = useState(() => fetchFinanceRails());

  useEffect(() => {
    const refresh = () => setRails(fetchFinanceRails());
    refresh();
    const offPlatform = subscribePlatformStore(refresh);
    const offFreela = subscribeFreelaStore(refresh);
    return () => {
      offPlatform();
      offFreela();
    };
  }, []);

  const { saas, splits, payouts } = rails;

  return (
    <div className="space-y-8 max-w-6xl">
      <section className="space-y-2">
        <h2 className="font-display text-4xl uppercase tracking-wide">Financeiro</h2>
        <p className="text-sm text-[var(--muted)]">
          Dois trilhos: SaaS do bar e split da diária. Sem PIX. Alíquota da plataforma ainda TBD.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-2xl uppercase">Faturas SaaS</h3>
        <div className="overflow-x-auto">
          <table className="bar-table">
            <thead>
              <tr>
                <th>Bar</th>
                <th>Stripe</th>
                <th className="text-right">Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {saas.map((row) => (
                <tr key={row.id}>
                  <td>
                    <p>{row.party}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {stripeStatusLabel[row.stripeStatus] || row.stripeStatus}
                    </p>
                  </td>
                  <td>{row.stripeId}</td>
                  <td className="text-right font-mono">{row.amount}</td>
                  <td>{statusLabel[row.status] || row.status}</td>
                </tr>
              ))}
              {!saas.length ? (
                <tr>
                  <td colSpan={4} className="text-[var(--muted)]">
                    Nenhuma fatura SaaS.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="font-display text-2xl uppercase">Splits de diária</h3>
        <div className="overflow-x-auto">
          <table className="bar-table">
            <thead>
              <tr>
                <th>Freela</th>
                <th>Noite</th>
                <th>Stripe</th>
                <th className="text-right">Bruto</th>
                <th className="text-right">Plataforma</th>
                <th className="text-right">Líquido</th>
              </tr>
            </thead>
            <tbody>
              {splits.map((row) => (
                <tr key={row.id}>
                  <td>{row.party}</td>
                  <td>
                    <p>{row.title || row.barName || '—'}</p>
                    <p className="text-xs text-[var(--muted)]">{row.date || ''}</p>
                  </td>
                  <td>{row.stripeId || 'mock'}</td>
                  <td className="text-right font-mono">{formatBrl(row.gross)}</td>
                  <td className="text-right font-mono text-[var(--muted)]">
                    {row.platformFee == null ? 'TBD' : formatBrl(row.platformFee)}
                  </td>
                  <td className="text-right font-mono">{formatBrl(row.freelaNet)}</td>
                </tr>
              ))}
              {!splits.length ? (
                <tr>
                  <td colSpan={6} className="text-[var(--muted)]">
                    Nenhum split de diária.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bar-block space-y-3">
        <h3 className="font-display text-2xl uppercase">Payouts Connect</h3>
        <p className="text-sm text-[var(--muted)]">
          Saldo observe-only do Express. Saque no dashboard Stripe, sem fila PIX interna.
        </p>
        <section className="bar-strip">
          <div className="bar-strip-cell">
            <p className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
              Conta
            </p>
            <p className="font-mono text-sm mt-1">
              {payouts.connected ? payouts.accountId || 'conectada' : 'Connect pendente'}
            </p>
          </div>
          <div className="bar-strip-cell">
            <p className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
              Disponível
            </p>
            <p className="font-mono text-2xl mt-1">{formatBrl(payouts.available)}</p>
          </div>
          <div className="bar-strip-cell">
            <p className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
              Pendente
            </p>
            <p className="font-mono text-2xl mt-1">{formatBrl(payouts.pending)}</p>
          </div>
        </section>
      </section>
    </div>
  );
}
