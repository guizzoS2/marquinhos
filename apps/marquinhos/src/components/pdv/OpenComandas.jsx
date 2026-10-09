import { useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { DataTable, StatusPill, TBody, Td, Th, THead, Tr } from '../ui/DataTable';
import { FilterBar } from '../ui/FilterBar';
import { Icon } from '../ui/Icon';
import { Pagination } from '../ui/Pagination';
import { SearchField } from '../ui/SearchField';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Tabs } from '../ui/Tabs';
import { usePagedList } from '../ui/usePagedList';
import { useViewMode } from '../ui/useViewMode';
import { useModal } from '../../contexts/ModalContext';
import { PAYMENT_OPTIONS } from '../../services/inventoryProduct';
import { formatSaleStamp, saleBalance, salePaidAmount } from '../../services/saleRules';
import { PartialCloseForm } from './PartialCloseForm';
import { PdvModal } from './PdvModal';

const KINDS = [
  { id: 'aberta', label: 'Abertas' },
  { id: 'fechada', label: 'Fechadas' },
  { id: 'parcial', label: 'Parciais' },
];

const KIND_LABEL = {
  aberta: 'Aberta',
  fechada: 'Fechada',
  parcial: 'Parcial',
};

const EMPTY_KIND = {
  aberta: 'Nenhuma comanda aberta.',
  fechada: 'Nenhuma comanda fechada.',
  parcial: 'Nenhuma comanda parcial.',
};

function comandaKind(sale) {
  if (!sale?.numero_comanda) return '';
  if (sale.status === 'paga') return 'fechada';
  if (sale.status !== 'aberta') return '';
  if (salePaidAmount(sale) > 0 && saleBalance(sale) > 0) return 'parcial';
  return 'aberta';
}

function itemText(sale) {
  const itens = sale?.itens || [];
  if (!itens.length) return '—';
  return itens.map((item) => `${item.nome} × ${item.quantidade}`).join(', ');
}

function stampText(sale) {
  const stamp = formatSaleStamp(sale?.updated_at || sale?.created_at);
  if (stamp.data === '—') return '—';
  return `${stamp.data} ${stamp.hora}`;
}

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function OpenComandas({ sales = [] }) {
  const { openModal } = useModal();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('aberta');
  const [view, setView] = useViewMode('comandas');
  const [detail, setDetail] = useState(null);
  const [paying, setPaying] = useState(false);
  const grouped = useMemo(() => {
    return (sales || [])
      .filter((sale) => comandaKind(sale) === kind)
      .sort((left, right) =>
        String(right.updated_at || right.created_at || '').localeCompare(
          String(left.updated_at || left.created_at || '')
        )
      );
  }, [sales, kind]);
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return grouped;
    return grouped.filter((sale) => {
      const label = KIND_LABEL[comandaKind(sale)] || '';
      return [sale.numero_comanda, sale.cliente_nome, sale.observacao, itemText(sale), stampText(sale), label, 'comanda']
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [grouped, query]);
  const page = usePagedList(visible, `${kind}|${query}|${visible.map((sale) => sale.id).join('|')}`);

  function openDetail(sale) {
    setPaying(false);
    setDetail(sale);
  }

  return (
    <section className="min-w-0 space-y-6">
      <FilterBar
        actions={
          <Button type="button" onClick={() => openModal('new-comanda')}>
            <Icon name="add" />
            Nova comanda
          </Button>
        }
      >
        <SegmentedControl
          label="Visualização das comandas"
          items={[
            { id: 'list', label: 'Lista' },
            { id: 'cards', label: 'Cards' },
          ]}
          value={view}
          onChange={setView}
        />
        <SearchField value={query} onChange={setQuery} placeholder="Buscar comanda" label="Buscar comanda" />
      </FilterBar>

      <Tabs label="Tipo de comanda" items={KINDS} value={kind} onChange={setKind} />

      {grouped.length === 0 ? (
        <p className="rounded-2xl border border-outline bg-surface p-4 text-on-surface-variant">
          {EMPTY_KIND[kind]}
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-outline bg-surface p-4 text-on-surface-variant">
          Nenhuma comanda encontrada.
        </p>
      ) : view === 'list' ? (
        <div className="space-y-4">
          <DataTable minWidth="min-w-[72rem]">
            <THead>
              <Th>Número</Th>
              <Th>Cliente</Th>
              <Th>Data/Hora</Th>
              <Th>Itens</Th>
              <Th>Observação</Th>
              <Th align="right">Total</Th>
              <Th align="right">Pago</Th>
              <Th align="right">Saldo</Th>
              <Th>Tipo</Th>
            </THead>
            <TBody>
              {page.rows.map((sale) => {
                const type = comandaKind(sale);
                return (
                  <Tr key={sale.id} onClick={() => openDetail(sale)}>
                    <Td tone="strong">{sale.numero_comanda}</Td>
                    <Td>{sale.cliente_nome || 'Consumidor'}</Td>
                    <Td tone="muted" className="whitespace-nowrap">
                      {stampText(sale)}
                    </Td>
                    <Td tone="muted">{itemText(sale)}</Td>
                    <Td tone="muted">{sale.observacao || '—'}</Td>
                    <Td align="right" tone="strong">
                      {money(sale.total)}
                    </Td>
                    <Td align="right">{money(salePaidAmount(sale))}</Td>
                    <Td align="right" tone={saleBalance(sale) > 0 ? 'danger' : 'default'}>
                      {money(Math.max(saleBalance(sale), 0))}
                    </Td>
                    <Td>
                      <StatusPill tone={type === 'aberta' ? 'accent' : 'neutral'}>{KIND_LABEL[type]}</StatusPill>
                    </Td>
                  </Tr>
                );
              })}
            </TBody>
          </DataTable>
          <Pagination state={page} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {page.rows.map((sale) => {
              const type = comandaKind(sale);
              return (
                <button
                  key={sale.id}
                  type="button"
                  onClick={() => openDetail(sale)}
                  className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-outline bg-surface p-3 text-left hover:bg-surface-container-low"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-container-low text-on-surface">
                    <Icon name="receipt_long" className="text-xl" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-on-surface">
                      Comanda {sale.numero_comanda}
                    </span>
                    <span className="block truncate text-sm text-on-surface-variant">
                      {sale.cliente_nome || 'Consumidor'}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-headline font-extrabold text-on-surface">
                      {money(type === 'parcial' ? saleBalance(sale) : sale.total)}
                    </span>
                    <span className="block text-xs text-on-surface-variant">{KIND_LABEL[type]}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <Pagination state={page} />
        </div>
      )}

      {detail ? (
        <PdvModal
          title={`Comanda ${detail.numero_comanda}`}
          icon="receipt_long"
          onClose={() => {
            setPaying(false);
            setDetail(null);
          }}
        >
          <p className="text-sm text-on-surface-variant">
            {KIND_LABEL[comandaKind(detail)] || 'Comanda'} · Cliente {detail.cliente_nome || 'Consumidor'}
          </p>
          {detail.observacao ? <p className="break-words text-sm text-on-surface">{detail.observacao}</p> : null}
          <p className="text-sm text-on-surface">
            Total {money(detail.total)} · Pago {money(salePaidAmount(detail))} · Saldo {money(saleBalance(detail))}
          </p>
          {(detail.itens || []).length === 0 ? (
            <p className="rounded-2xl border border-outline bg-surface p-4 text-on-surface-variant">
              {(detail.historico || []).length ? 'Nenhum consumo neste período.' : 'Nenhum item nesta comanda.'}
            </p>
          ) : (
            <ul className="space-y-3">
              {detail.itens.map((item, index) => (
                <li
                  key={`${item.produto_id}-${index}`}
                  className="rounded-2xl border border-outline bg-surface p-3"
                >
                  <p className="break-words font-semibold text-on-surface">{item.nome}</p>
                  <p className="text-sm text-on-surface-variant">
                    {item.quantidade} × {money(item.valor_unitario)}
                  </p>
                  <p className="font-headline font-extrabold text-on-surface">{money(item.valor_total)}</p>
                </li>
              ))}
            </ul>
          )}
          {(detail.historico || []).length ? (
            <section className="space-y-3">
              <p className="pl-1 text-xs font-label font-bold uppercase text-on-surface-variant">Histórico</p>
              {detail.historico.map((cycle) => {
                const stamp = formatSaleStamp(cycle.quitado_em);
                return (
                  <div key={cycle.id} className="space-y-3 rounded-2xl border border-outline bg-surface p-3">
                    <p className="text-sm font-semibold text-on-surface">
                      {stamp.data} {stamp.hora} · {money(cycle.total)}
                    </p>
                    {(cycle.itens || []).map((item, index) => (
                      <p key={`${cycle.id}-${item.produto_id}-${index}`} className="text-sm text-on-surface-variant">
                        {item.nome} · {item.quantidade} × {money(item.valor_unitario)}
                      </p>
                    ))}
                    {(cycle.pagamentos || []).map((payment) => {
                      const paidAt = formatSaleStamp(payment.created_at);
                      const method = PAYMENT_OPTIONS.find((option) => option.value === payment.forma_pagamento);
                      return (
                        <p key={payment.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="min-w-0 text-on-surface-variant">
                            {paidAt.data} {paidAt.hora} · {method?.label || 'Pagamento'}
                          </span>
                          <span className="shrink-0 font-semibold text-on-surface">{money(payment.valor)}</span>
                        </p>
                      );
                    })}
                  </div>
                );
              })}
            </section>
          ) : null}
          {(detail.pagamentos || []).length ? (
            <ul className="space-y-2">
              {detail.pagamentos.map((payment) => {
                const stamp = formatSaleStamp(payment.created_at);
                const method = PAYMENT_OPTIONS.find((option) => option.value === payment.forma_pagamento);
                return (
                  <li key={payment.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 text-on-surface-variant">
                      {stamp.data} {stamp.hora} · {method?.label || 'Pagamento'}
                    </span>
                    <span className="shrink-0 font-semibold text-on-surface">{money(payment.valor)}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {paying ? (
            <PartialCloseForm
              sale={detail}
              onCancel={() => setPaying(false)}
              onSuccess={(next) => {
                setPaying(false);
                if (next?.status === 'aberta') setDetail(next);
                else setDetail(null);
              }}
            />
          ) : (
            <div className="flex flex-wrap justify-end gap-3">
              {detail.status === 'aberta' && saleBalance(detail) > 0 ? (
                <Button type="button" onClick={() => setPaying(true)}>
                  <Icon name="payments" />
                  Fechamento parcial
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setPaying(false);
                  setDetail(null);
                }}
              >
                <Icon name="close" />
                Fechar
              </Button>
            </div>
          )}
        </PdvModal>
      ) : null}
    </section>
  );
}
