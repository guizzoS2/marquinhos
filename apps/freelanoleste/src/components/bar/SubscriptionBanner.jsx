import { Link } from 'react-router-dom';
import { fetchBarSubscription } from '../../services/ownerApi';

export function SubscriptionBanner() {
  const subscription = fetchBarSubscription();
  if (subscription.active) return null;

  return (
    <p className="text-sm font-medium bg-error/10 text-error rounded-2xl p-4">
      Assinatura Stripe {subscription.status}. Escritas do operacional bloqueadas.{' '}
      <Link
        to="/bar/pagamentos"
        className="font-semibold underline min-h-11 inline-flex items-center"
      >
        Gerenciar pagamentos
      </Link>
    </p>
  );
}

export function isOpsWritable() {
  return fetchBarSubscription().active;
}
