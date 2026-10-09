import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { DataTable, Tag, TBody, Td, Th, THead, Tr } from '../ui/DataTable';
import { Icon } from '../ui/Icon';
import { Pagination } from '../ui/Pagination';
import { Tabs } from '../ui/Tabs';
import { usePagedList } from '../ui/usePagedList';
import { productGroupTag } from '../../services/catalogTaxonomy';
import { fetchCashFlow, fetchInventory } from '../../services/dashboardService';
import { productPriceHistory, productSaleHistory } from '../../services/productHistory';

function ProductGroup({ item }) {
  const tag = productGroupTag(item);
  return (
    <Tag tone={tag.tone} icon={tag.icon}>
      {tag.label}
    </Tag>
  );
}

function Field({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-label font-bold text-on-surface-variant uppercase">
        {label}
      </p>
      <p className="text-on-surface font-medium break-words">{value || '—'}</p>
    </div>
  );
}

export function ProductDetail({ item, canDelete, onEdit, onDelete, onCancel }) {
  const [tab, setTab] = useState('dados');
  const inventory = useQuery({ queryKey: ['inventory'], queryFn: fetchInventory });
  const cash = useQuery({ queryKey: ['cash-flow'], queryFn: fetchCashFlow });
  const prices = useMemo(
    () => productPriceHistory(item, inventory.data),
    [item, inventory.data]
  );
  const sales = useMemo(
    () => productSaleHistory(item, inventory.data, cash.data),
    [item, inventory.data, cash.data]
  );
  const pricePage = usePagedList(prices.events, `${item?.id || ''}|precos`, { after: 20, pageSize: 20 });
  const salePage = usePagedList(sales, `${item?.id || ''}|vendas`, { after: 20, pageSize: 20 });
  if (!item) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <img
          alt=""
          src={item.foto || item.image}
          className="w-20 h-20 rounded-2xl object-cover shrink-0 bg-surface"
        />
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-label font-bold text-on-surface-variant uppercase">
            Código {item.codigo || '—'}
          </p>
          <h4 className="font-headline text-2xl font-bold text-on-surface break-words">{item.nome}</h4>
          {item.lowStock ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-error-container/10 text-error-dim border border-error/20">
              <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
              Estoque Baixo
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-secondary-container/20 text-on-secondary-fixed-variant">
              Estável
            </span>
          )}
        </div>
      </div>

      <Tabs
        label="Produto"
        items={[
          { id: 'dados', label: 'Dados' },
          { id: 'precos', label: 'Preços' },
          { id: 'vendas', label: 'Vendas' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'precos' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Preço de compra atual" value={prices.compra} />
            <Field label="Preço de venda atual" value={prices.venda} />
          </div>
          {prices.events.length ? (
            <div className="space-y-4">
            <DataTable>
              <THead>
                <Th>Data</Th>
                <Th>Tipo</Th>
                <Th align="right">Preço</Th>
                <Th align="right">Qtd</Th>
              </THead>
              <TBody>
                {pricePage.rows.map((row) => (
                  <Tr key={row.id}>
                    <Td tone="muted" className="whitespace-nowrap">
                      {row.when}
                    </Td>
                    <Td>{row.kind}</Td>
                    <Td align="right" tone="strong">
                      {row.price}
                    </Td>
                    <Td align="right">{row.qty}</Td>
                  </Tr>
                ))}
              </TBody>
            </DataTable>
            <Pagination compact state={pricePage} />
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">Nenhuma compra ou venda deste produto.</p>
          )}
        </div>
      ) : null}

      {tab === 'vendas' ? (
        sales.length ? (
          <div className="space-y-4">
          <DataTable>
            <THead>
              <Th>Data</Th>
              <Th align="right">Qtd</Th>
              <Th align="right">Venda</Th>
              <Th align="right">Caixa</Th>
            </THead>
            <TBody>
              {salePage.rows.map((row) => (
                <Tr key={row.id}>
                  <Td tone="muted" className="whitespace-nowrap">
                    {row.when}
                  </Td>
                  <Td align="right">{row.qty}</Td>
                  <Td align="right" tone="strong">
                    {row.total}
                  </Td>
                  <Td align="right">{row.cash}</Td>
                </Tr>
              ))}
            </TBody>
          </DataTable>
          <Pagination compact state={salePage} />
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant">Nenhuma venda deste produto.</p>
        )
      ) : null}

      {tab === 'dados' ? (
      <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Marca" value={item.marca} />
        <div className="space-y-1">
          <p className="text-xs font-label font-bold text-on-surface-variant uppercase">Grupo</p>
          <ProductGroup item={item} />
        </div>
        <Field label="Subgrupo" value={item.subgrupo} />
        <Field label="Formato" value={item.formato} />
        <Field label="Família" value={item.familia} />
        <Field
          label="Volume / Peso"
          value={item.volume_peso == null || item.volume_peso === '' ? '' : String(item.volume_peso)}
        />
        <Field label="Medida" value={item.medida} />
        <Field label="Valor unitário" value={item.valor_unitario || item.cost} />
        <Field label="Estoque atual" value={item.stock} />
        <Field label="Estoque sugerido" value={item.minStock} />
      </div>
      <Field label="Descrição" value={item.descricao || item.subtitle} />
      </>
      ) : null}

      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="secondary" type="button" onClick={onCancel}>
          <Icon name="close" />
          Fechar
        </Button>
        {canDelete ? (
          <Button variant="danger" type="button" onClick={onDelete}>
            <Icon name="delete" />
            Excluir
          </Button>
        ) : null}
        <Button type="button" onClick={onEdit}>
          <Icon name="edit" />
          Editar
        </Button>
      </div>
    </div>
  );
}
