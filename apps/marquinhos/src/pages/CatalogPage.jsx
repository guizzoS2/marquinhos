import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchInventory, removeCombo, removePromotion } from '../services/dashboardService';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { Pagination } from '../components/ui/Pagination';
import { usePagedList } from '../components/ui/usePagedList';
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
  const promotionPage = usePagedList(data?.promotions || [], 'promocoes');
  const comboPage = usePagedList(combos, 'combos');

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
    <div className="p-4 md:p-8 space-y-6 md:space-y-8">
      <PageHeader title="Catálogo" description="Promoções e combos vendidos como produto.">
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
      </PageHeader>

      <Tabs
        items={[
          { id: 'promocoes', label: 'Promoções' },
          { id: 'combos', label: 'Combos' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'promocoes' ? (
        <section className="bg-surface-container-low rounded-2xl overflow-hidden p-1 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant text-xs font-bold uppercase">
                  <th className="px-6 py-4">Produto</th>
                  <th className="px-6 py-4">Preço promocional</th>
                  <th className="px-6 py-4">Início</th>
                  <th className="px-6 py-4">Término</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant/30">
                {(data.promotions || []).length === 0 ? (
                  <tr className="bg-surface-container-lowest">
                    <td className="px-6 py-5 text-on-surface-variant" colSpan={6}>
                      Nenhuma promoção cadastrada.
                    </td>
                  </tr>
                ) : (
                  promotionPage.rows.map((row) => (
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
                      <td className="px-6 py-5">
                        <span
                          className={
                            row.status === 'Ativa'
                              ? 'inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-secondary-container/20 text-on-secondary-fixed-variant'
                              : 'inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-surface-variant/40 text-on-surface-variant'
                          }
                        >
                          {row.status === 'Ativa' ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() =>
                              openModal('edit-promotion', {
                                promotion: row,
                                items: data.items || [],
                                onSuccess: refresh,
                              })
                            }
                          >
                            <Icon name="edit" />
                            Editar
                          </Button>
                          {row.status !== 'Ativa' ? (
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() =>
                                openModal('new-promotion', {
                                  reactivate: true,
                                  promotion: row,
                                  items: data.items || [],
                                  onSuccess: refresh,
                                })
                              }
                            >
                              Reativar
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="danger"
                            onClick={() =>
                              openModal('confirm', {
                                message: `Excluir a promoção de ${productName(row.produto_id)}?`,
                                confirmLabel: 'Excluir',
                                successMessage: 'Promoção excluída.',
                                errorMessage: 'Não foi possível excluir a promoção.',
                                onConfirm: async () => {
                                  await removePromotion(row.id);
                                  refresh();
                                },
                              })
                            }
                          >
                            <Icon name="delete" />
                            Excluir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4">
            <Pagination
              page={promotionPage.current}
              pageCount={promotionPage.pageCount}
              onPage={promotionPage.setPage}
            />
          </div>
        </section>
      ) : combos.length === 0 ? (
        <p className="text-on-surface-variant">Nenhum combo cadastrado.</p>
      ) : (
        <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {comboPage.rows.map((combo) => {
            const parts = partsOf(combo);
            return (
              <article
                key={combo.id}
                className="bg-surface-container-lowest rounded-2xl p-6 min-h-11"
              >
                <button
                  type="button"
                  onClick={() => openModal('combo-detail', { combo, parts })}
                  className="w-full text-left min-h-11"
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
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      openModal('edit-combo', {
                        combo,
                        parts,
                        items: data.items || [],
                        onSuccess: refresh,
                      })
                    }
                  >
                    <Icon name="edit" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() =>
                      openModal('confirm', {
                        message: `Excluir o combo ${combo.nome}?`,
                        confirmLabel: 'Excluir',
                        successMessage: 'Combo excluído.',
                        errorMessage: 'Não foi possível excluir o combo.',
                        onConfirm: async () => {
                          await removeCombo(combo.id);
                          refresh();
                        },
                      })
                    }
                  >
                    <Icon name="delete" />
                    Excluir
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
        <Pagination page={comboPage.current} pageCount={comboPage.pageCount} onPage={comboPage.setPage} />
        </div>
      )}
    </div>
  );
}
