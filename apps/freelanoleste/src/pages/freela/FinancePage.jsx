import { useEffect, useState } from 'react';
import {
  fetchExpressDashboardUrl,
  fetchStripeBalance,
  formatBrl,
  getConnectOAuthUrl,
} from '../../services/freelaApi';
import { KpiCard } from '../../components/admin/KpiCard';
import { Button } from '../../components/Button';

export function FreelaFinancePage() {
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchStripeBalance()
      .then((data) => {
        if (!cancelled) setBalance(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleConnect() {
    window.location.assign(getConnectOAuthUrl());
  }

  async function handleExpress() {
    const url = await fetchExpressDashboardUrl();
    window.location.assign(url);
  }

  return (
    <div className="space-y-6 md:space-y-8 max-w-4xl">
      <section className="space-y-2">
        <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight">
          Recebimentos
        </h2>
        <p className="text-on-surface-variant text-sm">
          Conta Stripe Connect Express. Saques só no Dashboard do Stripe. Sem PIX e sem saque
          interno.
        </p>
      </section>

      {error ? <p className="text-sm text-error font-medium">{error}</p> : null}

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KpiCard
          icon="payments"
          label="Saldo disponível (Stripe)"
          value={balance ? formatBrl(balance.available) : '—'}
          hint={
            balance?.connected
              ? `Conta ${balance.accountId}`
              : 'Conecte o Stripe para ver o saldo real'
          }
        />
        <KpiCard
          icon="hourglass_empty"
          label="Saldo pendente (Stripe)"
          value={balance ? formatBrl(balance.pending) : '—'}
          hint="Split da diária após o turno"
        />
      </section>

      <section className="bg-surface-container-lowest rounded-2xl p-4 md:p-6 shadow-sm space-y-4">
        <p className="font-headline font-bold">Stripe Connect</p>
        <p className="text-sm text-on-surface-variant">
          Configurar recebimentos abre o OAuth Express. Payouts ficam no painel do gateway.
        </p>
        <div className="flex flex-col md:flex-row gap-3">
          <Button className="w-full md:w-auto" onClick={handleConnect}>
            Configurar Recebimentos
          </Button>
          <Button
            variant="secondary"
            className="w-full md:w-auto"
            onClick={handleExpress}
            disabled={!balance?.connected}
          >
            Dashboard do Stripe Express
          </Button>
        </div>
      </section>
    </div>
  );
}
