import { useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { completeStripeConnect } from '../../services/freelaApi';

export function FreelaConnectCallbackPage() {
  const [params] = useSearchParams();
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const code = params.get('code');
  const oauthError = params.get('error');

  useEffect(() => {
    if (oauthError || !code) return undefined;
    let cancelled = false;
    completeStripeConnect(code)
      .then(() => {
        if (!cancelled) setDone(true);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [code, oauthError]);

  if (oauthError) {
    return (
      <div className="p-4 md:p-8 space-y-2">
        <p className="text-sm text-error font-medium">Stripe Connect recusou a autorização.</p>
        <a href="/freela/financeiro" className="text-sm font-semibold min-h-11 inline-flex items-center">
          Voltar
        </a>
      </div>
    );
  }

  if (!code) {
    return <Navigate to="/freela/financeiro" replace />;
  }

  if (error) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-sm text-error font-medium">{error}</p>
      </div>
    );
  }

  if (done) {
    return <Navigate to="/freela/financeiro" replace />;
  }

  return (
    <div className="p-4 md:p-8">
      <p className="text-sm text-on-surface-variant">Conectando conta Stripe Express…</p>
    </div>
  );
}
