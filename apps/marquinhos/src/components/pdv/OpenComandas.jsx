import { useMemo, useState } from 'react';
import { Button } from '../ui/Button';
import { FilterBar } from '../ui/FilterBar';
import { Icon } from '../ui/Icon';
import { Pagination } from '../ui/Pagination';
import { SearchField } from '../ui/SearchField';
import { usePagedList } from '../ui/usePagedList';
import { useModal } from '../../contexts/ModalContext';
import { PAYMENT_OPTIONS } from '../../services/inventoryProduct';
import { formatSaleStamp, saleBalance, salePaidAmount } from '../../services/saleRules';
import { PartialCloseForm } from './PartialCloseForm';
import { PdvModal } from './PdvModal';

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function OpenComandas({ sales = [] }) {
  const { openModal } = useModal();
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState(null);
  const [paying, setPaying] = useState(false);
  const open = useMemo(() => sales.filter((sale) => sale.status === 'aberta'), [sales]);
  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return open;
    return open.filter((sale) => {
      const quitada = saleBalance(sale) <= 0 && (sale.historico || []).length ? 'quitada' : '';
      const saldo = salePaidAmount(sale) > 0 && saleBalance(sale) > 0 ? 'saldo' : '';
      return [sale.numero_comanda, sale.cliente_nome, sale.observacao, quitada, saldo, 'aberta', 'comanda']
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [open, query]);
  const page = usePagedList(visible, `${query}|${visible.map((sale) => sale.id).join('|')}`);

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
        <SearchField value={query} onChange={setQuery} placeholder="Buscar comanda" label="Buscar comanda" />
      </FilterBar>

      {open.length === 0 ? (
        <p className="rounded-2xl border border-outline bg-surface p-4 text-on-surface-variant">
          Nenhuma comanda aberta.
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-outline bg-surface p-4 text-on-surface-variant">
          Nenhuma comanda encontrada.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {page.rows.map((sale) => (
              <button
                key={sale.id}
                type="button"
                onClick={() => {
                  setPaying(false);
                  setDetail(sale);
                }}
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
                    {money(salePaidAmount(sale) > 0 ? saleBalance(sale) : sale.total)}
                  </span>
                  {saleBalance(sale) <= 0 && (sale.historico || []).length ? (
                    <span className="block text-xs text-on-surface-variant">Quitada</span>
                  ) : salePaidAmount(sale) > 0 ? (
                    <span className="block text-xs text-on-surface-variant">Saldo</span>
                  ) : null}
                </span>
              </button>
            ))}
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
          <p className="text-sm text-on-surface-variant">Cliente {detail.cliente_nome || 'Consumidor'}</p>
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
              {saleBalance(detail) > 0 ? (
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
