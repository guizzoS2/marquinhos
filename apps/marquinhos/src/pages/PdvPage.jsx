import { useQuery } from '@tanstack/react-query';
import { fetchCustomers, fetchInventory } from '../services/dashboardService';
import { CartProvider } from '../contexts/CartContext';
import { PdvSearch } from '../components/pdv/PdvSearch';
import { PdvSummary } from '../components/pdv/PdvSummary';

export function PdvPage() {
  const inventory = useQuery({ queryKey: ['inventory'], queryFn: fetchInventory });
  const customers = useQuery({ queryKey: ['customers'], queryFn: fetchCustomers });

  if (inventory.isLoading || !inventory.data) {
    return <div className="p-4 md:p-8 text-on-surface-variant">Carregando PDV...</div>;
  }

  return (
    <CartProvider>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <section className="space-y-2">
          <h2 className="text-3xl font-extrabold text-on-background tracking-tight">PDV</h2>
          <p className="text-on-surface-variant max-w-xl font-body">
            Monte a venda e confirme tudo de uma vez.
          </p>
        </section>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PdvSearch items={inventory.data.items || []} promotions={inventory.data.promotions || []} />
          <PdvSummary customers={customers.data?.customers || []} />
        </div>
      </div>
    </CartProvider>
  );
}
