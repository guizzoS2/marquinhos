import { lazy, Suspense, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCustomers, fetchInventory } from '../services/dashboardService';
import { CartProvider } from '../contexts/CartContext';
import { PdvCatalog } from '../components/pdv/PdvCatalog';
import { PdvSummary } from '../components/pdv/PdvSummary';
import { OpenComandas } from '../components/pdv/OpenComandas';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
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
      <div className="p-4 md:p-8 space-y-6 md:space-y-8">
        <PageHeader title="PDV" description="Monte a venda e confirme tudo de uma vez.">
          {canClose ? (
            <Button type="button" className="w-full md:w-auto" onClick={() => setShowCaixa(true)}>
              Fechar Caixa
            </Button>
          ) : null}
        </PageHeader>
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
