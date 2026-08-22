import { Link } from 'react-router-dom';
import { fetchBarSubscription } from '../../services/ownerApi';
import { readSession } from '../../services/session';

export function SubscriptionBanner() {
  const subscription = fetchBarSubscription();
  if (subscription.active) return null;
  const isEmployee = readSession()?.role === 'employee';

  return (
    <p className="text-sm font-medium bg-error/10 text-error rounded-2xl p-4">
      Assinatura Stripe {subscription.status}. Escritas do operacional bloqueadas.{' '}
      {isEmployee ? (
        'Peça ao dono para regularizar no portal Stripe.'
      ) : (
        <Link
          to="/bar/pagamentos"
          className="font-semibold underline min-h-11 inline-flex items-center"
        >
          Gerenciar pagamentos
        </Link>
      )}
    </p>
  );
}

export function isOpsWritable() {
  return fetchBarSubscription().active;
}
