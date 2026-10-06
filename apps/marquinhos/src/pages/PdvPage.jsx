import { lazy, Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCustomers, fetchInventory } from '../services/dashboardService';
import { CartProvider } from '../contexts/CartContext';
import { PdvCatalog } from '../components/pdv/PdvCatalog';
import { PdvSummary } from '../components/pdv/PdvSummary';
import { OpenComandas } from '../components/pdv/OpenComandas';
import { Button } from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';
import { isAdminRole } from '../services/roles';

const CaixaModal = lazy(() => import('../components/caixa/CaixaModal'));

export function PdvPage() {
  const { user } = useAuth();
  const [showCaixa, setShowCaixa] = useState(false);
  const inventory = useQuery({ queryKey: ['inventory'], queryFn: fetchInventory });
  const customers = useQuery({ queryKey: ['customers'], queryFn: fetchCustomers });
  const canClose = isAdminRole(user?.role);

  if (inventory.isLoading || !inventory.data) {
    return <div className="p-4 md:p-8 text-on-surface-variant">Carregando PDV...</div>;
  }

  return (
    <CartProvider>
      <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        <section className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold text-on-background tracking-tight">PDV</h2>
            <p className="text-on-surface-variant max-w-xl font-body">
              Monte a venda e confirme tudo de uma vez.
            </p>
          </div>
          {canClose ? (
            <Button type="button" className="w-full md:w-auto" onClick={() => setShowCaixa(true)}>
              Fechar Caixa
            </Button>
          ) : null}
        </section>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_24rem] gap-6 items-start">
          <PdvCatalog
            items={inventory.data.items || []}
            promotions={inventory.data.promotions || []}
            serverNow={inventory.data.serverNow}
            filters={inventory.data.filters || []}
          />
          <div className="lg:sticky lg:top-4 min-w-0">
            <PdvSummary customers={customers.data?.customers || []} />
          </div>
        </div>
        <OpenComandas sales={inventory.data.sales || []} />
      </div>
      {showCaixa ? (
        <Suspense fallback={null}>
          <CaixaModal onClose={() => setShowCaixa(false)} />
        </Suspense>
      ) : null}
    </CartProvider>
  );
}
