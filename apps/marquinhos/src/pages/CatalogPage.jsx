import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchInventory } from '../services/dashboardService';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { useModal } from '../contexts/ModalContext';
import { formatCatalogDate } from '../services/catalogRules';

export function CatalogPage() {
  const [tab, setTab] = useState('promocoes');
  const { openModal } = useModal();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: fetchInventory,
  });

  const combos = useMemo(
    () => (data?.items || []).filter((item) => item.tipo === 'combo'),
    [data]
  );

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
  }

  function partsOf(combo) {
    return (data?.comboItems || [])
      .filter((row) => String(row.combo_id) === String(combo.id))
      .map((row) => {
        const product = (data?.items || []).find(
          (item) => String(item.id) === String(row.produto_associado_id)
        );
        return {
          ...row,
          nome: product?.nome || product?.name || 'Produto',
          foto: product?.foto || product?.image,
        };
      });
  }

  function productName(produtoId) {
    const item = (data?.items || []).find((row) => String(row.id) === String(produtoId));
    return item?.nome || item?.name || 'Produto';
  }

  if (isLoading || !data) {
    return <div className="p-4 md:p-8 text-on-surface-variant">Carregando catálogo...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 md:space-y-8">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-extrabold text-on-background tracking-tight">Catálogo</h2>
          <p className="text-on-surface-variant max-w-xl font-body">
            Promoções e combos vendidos como produto.
          </p>
        </div>
        {tab === 'promocoes' ? (
          <Button
            onClick={() =>
              openModal('new-promotion', { items: data.items || [], onSuccess: refresh })
            }
          >
            <Icon name="add" />
            Nova promoção
          </Button>
        ) : (
          <Button
            onClick={() => openModal('new-combo', { items: data.items || [], onSuccess: refresh })}
          >
            <Icon name="add" />
            Novo combo
          </Button>
        )}
      </section>

      <div className="flex p-1 gap-1 bg-surface-container-low rounded-2xl w-full sm:w-auto">
        <button
          type="button"
          onClick={() => setTab('promocoes')}
          className={
            tab === 'promocoes'
              ? 'flex-1 sm:flex-none px-4 min-h-11 rounded-xl bg-primary text-on-primary font-semibold'
              : 'flex-1 sm:flex-none px-4 min-h-11 rounded-xl text-on-surface-variant'
          }
        >
          Promoções
        </button>
        <button
          type="button"
          onClick={() => setTab('combos')}
          className={
            tab === 'combos'
              ? 'flex-1 sm:flex-none px-4 min-h-11 rounded-xl bg-primary text-on-primary font-semibold'
              : 'flex-1 sm:flex-none px-4 min-h-11 rounded-xl text-on-surface-variant'
          }
        >
          Combos
        </button>
      </div>

      {tab === 'promocoes' ? (
        <section className="bg-surface-container-low rounded-2xl overflow-hidden p-1 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant text-xs font-bold uppercase tracking-widest">
                  <th className="px-6 py-4">Produto</th>
                  <th className="px-6 py-4">Preço promocional</th>
                  <th className="px-6 py-4">Início</th>
                  <th className="px-6 py-4">Término</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant/30">
                {(data.promotions || []).length === 0 ? (
                  <tr className="bg-surface-container-lowest">
                    <td className="px-6 py-5 text-on-surface-variant" colSpan={4}>
                      Nenhuma promoção cadastrada.
                    </td>
                  </tr>
                ) : (
                  data.promotions.map((row) => (
                    <tr key={row.id} className="bg-surface-container-lowest">
                      <td className="px-6 py-5 font-bold text-on-surface">{productName(row.produto_id)}</td>
                      <td className="px-6 py-5 text-on-surface">
                        {Number(row.preco_promocional).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </td>
                      <td className="px-6 py-5 text-on-surface-variant">
                        {formatCatalogDate(row.data_inicio)}
                      </td>
                      <td className="px-6 py-5 text-on-surface-variant">
                        {formatCatalogDate(row.data_termino)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : combos.length === 0 ? (
        <p className="text-on-surface-variant">Nenhum combo cadastrado.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {combos.map((combo) => {
            const parts = partsOf(combo);
            return (
              <button
                key={combo.id}
                type="button"
                onClick={() => openModal('combo-detail', { combo, parts })}
                className="w-full text-left bg-surface-container-lowest rounded-2xl p-6 min-h-11 transition-all hover:shadow-xl hover:shadow-on-surface/5"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-headline font-bold text-lg text-on-surface">{combo.nome}</h3>
                    <p className="text-sm text-on-surface-variant">{combo.codigo}</p>
                  </div>
                  <p className="font-headline font-extrabold text-on-surface">{combo.valor_unitario}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {parts.map((part) => (
                    <span
                      key={part.id || part.produto_associado_id}
                      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary-container text-on-secondary-container"
                    >
                      <img alt="" src={part.foto} className="w-6 h-6 rounded-full object-cover" />
                      {part.nome}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
