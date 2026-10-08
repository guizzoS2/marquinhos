import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchInventory, inactivatePromotion, removeCombo, removePromotion } from '../services/dashboardService';
import { Icon } from '../components/ui/Icon';
import { Button } from '../components/ui/Button';
import { PageHeader } from '../components/ui/PageHeader';
import { Tabs } from '../components/ui/Tabs';
import { FilterBar } from '../components/ui/FilterBar';
import { SearchField } from '../components/ui/SearchField';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { DataTable, EmptyRow, StatusPill, TableActions, TBody, Td, Th, THead, Tr } from '../components/ui/DataTable';
import { EntityCard, EntityCardGrid, EntityThumb } from '../components/ui/EntityCard';
import { Pagination } from '../components/ui/Pagination';
import { usePagedList } from '../components/ui/usePagedList';
import { useModal } from '../contexts/ModalContext';
import { formatPromotionEnd, formatPromotionStart } from '../services/catalogRules';

export function CatalogPage() {
  const [tab, setTab] = useState('promocoes');
  const [promotionView, setPromotionView] = useState('list');
  const [comboView, setComboView] = useState('cards');
  const [promotionQuery, setPromotionQuery] = useState('');
  const [comboQuery, setComboQuery] = useState('');
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
  const promotions = useMemo(() => {
    const term = promotionQuery.trim().toLowerCase();
    const rows = data?.promotions || [];
    if (!term) return rows;
    return rows.filter((row) => {
      const product = (data?.items || []).find((item) => String(item.id) === String(row.produto_id));
      const name = String(product?.nome || product?.name || '').toLowerCase();
      const status = row.status === 'Ativa' ? 'ativa' : 'inativa';
      const when = `${formatPromotionStart(row)} ${formatPromotionEnd(row)}`.toLowerCase();
      return name.includes(term) || status.includes(term) || when.includes(term);
    });
  }, [data, promotionQuery]);
  const filteredCombos = useMemo(() => {
    const term = comboQuery.trim().toLowerCase();
    if (!term) return combos;
    return combos.filter((combo) => {
      const names = (data?.comboItems || [])
        .filter((row) => String(row.combo_id) === String(combo.id))
        .map((row) => {
          const product = (data?.items || []).find(
            (item) => String(item.id) === String(row.produto_associado_id)
          );
          return product?.nome || product?.name || '';
        });
      return [combo.nome, combo.codigo, ...names].join(' ').toLowerCase().includes(term);
    });
  }, [combos, comboQuery, data]);
  const promotionPage = usePagedList(promotions, `promocoes|${promotionQuery}`);
  const comboPage = usePagedList(filteredCombos, `combos|${comboQuery}`);

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

  function inactivate(row) {
    openModal('confirm', {
      message: `Inativar a promoção de ${productName(row.produto_id)}? O preço promocional deixa de valer.`,
      confirmLabel: 'Inativar',
      successMessage: 'Promoção inativada.',
      errorMessage: 'Não foi possível inativar a promoção.',
      onConfirm: async () => {
        await inactivatePromotion(row.id);
        refresh();
      },
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
    <div className="p-4 md:p-8 space-y-6">
      <PageHeader title="Catálogo" description="Promoções e combos vendidos como produto." />

      <Tabs
        items={[
          { id: 'promocoes', label: 'Promoções' },
          { id: 'combos', label: 'Combos' },
        ]}
        value={tab}
        onChange={setTab}
      />

      <FilterBar
        actions={
          tab === 'promocoes' ? (
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
          )
        }
      >
        <SegmentedControl
          variant="primary"
          label={tab === 'promocoes' ? 'Visualização das promoções' : 'Visualização dos combos'}
          items={[
            { id: 'list', label: 'Lista' },
            { id: 'cards', label: 'Cards' },
          ]}
          value={tab === 'promocoes' ? promotionView : comboView}
          onChange={tab === 'promocoes' ? setPromotionView : setComboView}
        />
        <SearchField
          value={tab === 'promocoes' ? promotionQuery : comboQuery}
          onChange={tab === 'promocoes' ? setPromotionQuery : setComboQuery}
          placeholder={tab === 'promocoes' ? 'Buscar promoção' : 'Buscar combo'}
          label={tab === 'promocoes' ? 'Buscar promoção' : 'Buscar combo'}
        />
      </FilterBar>

      {tab === 'promocoes' ? (
        promotionView === 'list' ? (
        <section className="space-y-4">
          <DataTable>
            <THead>
              <Th>Produto</Th>
              <Th align="right">Preço promocional</Th>
              <Th>Início</Th>
              <Th>Término</Th>
              <Th>Status</Th>
              <Th align="right">Ações</Th>
            </THead>
            <TBody>
              {(data.promotions || []).length === 0 ? (
                <EmptyRow colSpan={6}>Nenhuma promoção cadastrada.</EmptyRow>
              ) : promotionPage.rows.length === 0 ? (
                <EmptyRow colSpan={6}>Nenhuma promoção encontrada.</EmptyRow>
              ) : (
                promotionPage.rows.map((row) => (
                  <Tr key={row.id}>
                    <Td tone="strong">{productName(row.produto_id)}</Td>
                    <Td align="right" tone="strong">
                      {Number(row.preco_promocional).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })}
                    </Td>
                    <Td tone="muted">{formatPromotionStart(row)}</Td>
                    <Td tone="muted">{formatPromotionEnd(row)}</Td>
                    <Td>
                      <StatusPill tone={row.status === 'Ativa' ? 'accent' : 'neutral'}>
                        {row.status === 'Ativa' ? 'Ativa' : 'Inativa'}
                      </StatusPill>
                    </Td>
                    <Td align="right">
                      <TableActions>
                          <Button
                            type="button"
                            size="icon"
                            variant="secondary"
                            aria-label="Editar promoção"
                            onClick={() =>
                              openModal('edit-promotion', {
                                promotion: row,
                                items: data.items || [],
                                onSuccess: refresh,
                              })
                            }
                          >
                            <Icon name="edit" />
                          </Button>
                          {row.status === 'Ativa' ? (
                            <Button
                              type="button"
                              size="icon"
                              variant="secondary"
                              aria-label="Inativar promoção"
                              onClick={() => inactivate(row)}
                            >
                              <Icon name="block" />
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="icon"
                              variant="secondary"
                              aria-label="Reativar promoção"
                              onClick={() =>
                                openModal('new-promotion', {
                                  reactivate: true,
                                  promotion: row,
                                  items: data.items || [],
                                  onSuccess: refresh,
                                })
                              }
                            >
                              <Icon name="restart_alt" />
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="icon"
                            variant="danger"
                            aria-label="Excluir promoção"
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
                          </Button>
                        </TableActions>
                      </Td>
                    </Tr>
                  ))
                )}
              </TBody>
            </DataTable>
          <Pagination state={promotionPage} />
        </section>
        ) : (data.promotions || []).length === 0 ? (
          <p className="text-on-surface-variant">Nenhuma promoção cadastrada.</p>
        ) : promotionPage.rows.length === 0 ? (
          <p className="text-on-surface-variant">Nenhuma promoção encontrada.</p>
        ) : (
          <div className="space-y-4">
            <EntityCardGrid>
              {promotionPage.rows.map((row) => {
                const product = (data.items || []).find((item) => String(item.id) === String(row.produto_id));
                return (
                  <EntityCard
                    key={row.id}
                    image={product?.foto || product?.image}
                    icon="sell"
                    title={productName(row.produto_id)}
                    badge={
                      <StatusPill tone={row.status === 'Ativa' ? 'accent' : 'neutral'}>
                        {row.status === 'Ativa' ? 'Ativa' : 'Inativa'}
                      </StatusPill>
                    }
                    actions={
                      <>
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
                      {row.status === 'Ativa' ? (
                        <Button type="button" variant="secondary" onClick={() => inactivate(row)}>
                          <Icon name="block" />
                          Inativar
                        </Button>
                      ) : (
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
                          <Icon name="restart_alt" />
                          Reativar
                        </Button>
                      )}
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
                      </>
                    }
                  >
                    <p className="text-sm text-on-surface-variant">
                      {formatPromotionStart(row)} — {formatPromotionEnd(row)}
                    </p>
                    <p className="mt-auto font-headline text-xl font-extrabold text-on-surface">
                      {Number(row.preco_promocional).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </EntityCard>
                );
              })}
            </EntityCardGrid>
            <Pagination state={promotionPage} />
          </div>
        )
      ) : combos.length === 0 ? (
        <p className="text-on-surface-variant">Nenhum combo cadastrado.</p>
      ) : filteredCombos.length === 0 ? (
        <p className="text-on-surface-variant">Nenhum combo encontrado.</p>
      ) : comboView === 'list' ? (
          <div className="space-y-4">
            <DataTable>
              <THead>
                <Th>Combo</Th>
                <Th>Código</Th>
                <Th>Itens</Th>
                <Th align="right">Preço</Th>
                <Th align="right">Ações</Th>
              </THead>
              <TBody>
                {comboPage.rows.map((combo) => {
                  const parts = partsOf(combo);
                  return (
                    <Tr key={combo.id}>
                      <Td tone="strong">{combo.nome}</Td>
                      <Td tone="muted">{combo.codigo}</Td>
                      <Td>{parts.map((part) => part.nome).join(', ') || '—'}</Td>
                      <Td align="right" tone="strong">
                        {combo.valor_unitario}
                      </Td>
                      <Td align="right">
                        <TableActions>
                              <Button
                                type="button"
                                size="icon"
                                variant="secondary"
                                aria-label="Editar combo"
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
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="danger"
                                aria-label="Excluir combo"
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
                              </Button>
                            </TableActions>
                          </Td>
                        </Tr>
                      );
                    })}
                  </TBody>
                </DataTable>
            <Pagination state={comboPage} />
          </div>
      ) : (
        <div className="space-y-4">
        <EntityCardGrid>
          {comboPage.rows.map((combo) => {
            const parts = partsOf(combo);
            return (
              <EntityCard
                key={combo.id}
                image={combo.foto || combo.image}
                icon="restaurant"
                title={combo.nome}
                onClick={() => openModal('combo-detail', { combo, parts })}
                actions={
                  <>
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
                  </>
                }
              >
                <p className="text-sm text-on-surface-variant">{combo.codigo}</p>
                <p className="font-headline text-xl font-extrabold text-on-surface">{combo.valor_unitario}</p>
                <div className="flex flex-wrap gap-2">
                  {parts.map((part) => (
                    <span
                      key={part.id || part.produto_associado_id}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-outline px-3 text-xs font-medium text-on-surface"
                    >
                      <EntityThumb src={part.foto} />
                      {part.nome}
                    </span>
                  ))}
                </div>
              </EntityCard>
            );
          })}
        </EntityCardGrid>
        <Pagination state={comboPage} />
        </div>
      )}
    </div>
  );
}
