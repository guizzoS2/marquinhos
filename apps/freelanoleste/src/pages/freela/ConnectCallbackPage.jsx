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
    return <Navigate to="/freela?finance=open" replace />;
  }

  if (!code) {
    return <Navigate to="/freela" replace />;
  }

  if (error) {
    return (
      <div className="street min-h-dvh p-4 md:p-8">
        <p className="text-sm text-error font-medium">{error}</p>
      </div>
    );
  }

  if (done) {
    return <Navigate to="/freela?finance=open" replace />;
  }

  return (
    <div className="street min-h-dvh p-4 md:p-8">
      <p className="text-sm text-outline">Conectando conta Stripe Express…</p>
    </div>
  );
}
