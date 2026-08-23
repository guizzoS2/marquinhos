import { useEffect, useState } from 'react';
import {
  fetchExpressDashboardUrl,
  fetchStripeBalance,
  formatBrl,
  getConnectOAuthUrl,
} from '../../services/freelaApi';
import { Button } from '../Button';

export function FreelaFinancePanel() {
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
    <div className="space-y-5">
      <p className="text-on-surface-variant text-sm">
        Stripe Connect Express. Saques no Dashboard do Stripe. Sem PIX por fora.
      </p>

      {error ? <p className="text-sm text-error font-medium">{error}</p> : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-surface-container-low rounded-2xl p-4 space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Disponível
          </p>
          <p className="font-headline font-extrabold text-xl">
            {balance ? formatBrl(balance.available) : '—'}
          </p>
        </div>
        <div className="bg-surface-container-low rounded-2xl p-4 space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Pendente
          </p>
          <p className="font-headline font-extrabold text-xl">
            {balance ? formatBrl(balance.pending) : '—'}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Button className="w-full min-h-11" onClick={handleConnect}>
          Configurar recebimentos
        </Button>
        <Button
          variant="secondary"
          className="w-full min-h-11"
          onClick={handleExpress}
          disabled={!balance?.connected}
        >
          Dashboard Stripe Express
        </Button>
      </div>
    </div>
  );
}
