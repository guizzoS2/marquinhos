import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchInventory } from '../services/dashboardService';
import { CartProvider } from '../contexts/CartContext';
import { PdvCatalog } from '../components/pdv/PdvCatalog';
import { PdvSummary } from '../components/pdv/PdvSummary';
import { Button } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import { isAdminRole } from '../services/roles';

export function PdvPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const inventory = useQuery({ queryKey: ['inventory'], queryFn: fetchInventory });
  const canClose = isAdminRole(user?.role);

  if (inventory.isLoading || !inventory.data) {
    return <div className="p-4 md:p-8 text-on-surface-variant">Carregando PDV...</div>;
  }

  return (
    <CartProvider>
      <div className="p-4 md:p-8 space-y-6">
        <PageHeader title="PDV" description="Monte a venda e confirme tudo de uma vez.">
          {canClose ? (
            <Button type="button" className="w-full md:w-auto" onClick={() => navigate('/compras?aba=fechamento')}>
              <Icon name="lock" />
              Fechar caixa
            </Button>
          ) : null}
        </PageHeader>
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <PdvCatalog
            items={inventory.data.items || []}
            promotions={inventory.data.promotions || []}
            serverNow={inventory.data.serverNow}
            filters={inventory.data.filters || []}
          />
          <div className="min-w-0">
            <PdvSummary
              items={inventory.data.items || []}
              sales={inventory.data.sales || []}
            />
          </div>
        </div>
      </div>
    </CartProvider>
  );
}
