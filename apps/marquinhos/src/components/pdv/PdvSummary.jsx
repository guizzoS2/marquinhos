import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { RoleSelect } from '../freelancers/RoleSelect';
import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { useCartDispatch, useCartState } from '../../contexts/CartContext';
import { checkoutSale, saveOpenTab } from '../../services/dashboardService';
import { CARD_INSTALLMENTS, PAYMENT_OPTIONS, parseReaisInput } from '../../services/inventoryProduct';

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function PdvSummary({ customers = [] }) {
  const state = useCartState();
  const dispatch = useCartDispatch();
  const { openModal } = useModal();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [created, setCreated] = useState(null);
  const [savingTab, setSavingTab] = useState(false);

  const total = useMemo(
    () => Math.round(state.lines.reduce((sum, line) => sum + line.valor_total, 0) * 100) / 100,
    [state.lines]
  );
  const recebido = parseReaisInput(state.valorRecebido);
  const troco =
    state.formaPagamento === 'dinheiro' && state.valorRecebido !== '' && Number.isFinite(recebido)
      ? Math.round((recebido - total) * 100) / 100
      : null;

  const options = useMemo(() => {
    const list = customers.map((item) => ({ value: String(item.id), label: item.nome }));
    if (created && !list.some((item) => item.value === String(created.id))) {
      list.unshift({ value: String(created.id), label: created.nome });
    }
    return [{ value: '', label: 'Consumidor' }, ...list];
  }, [customers, created]);

  const numero = Number(state.numeroComanda);

  function salePayload() {
    return {
      sale_id: state.saleId || null,
      numero_comanda: numero,
      cliente_id: state.clienteId || null,
      itens: state.lines.map((line) => ({
        produto_id: line.produto_id,
        quantidade: line.quantidade,
        valor_unitario: line.valor_unitario,
        valor_total: line.valor_total,
      })),
    };
  }

  function guardCart() {
    if (!state.lines.length) {
      toast.error('O carrinho está vazio.');
      return false;
    }
    if (!Number.isInteger(numero) || numero <= 0) {
      toast.error('Informe o número da comanda.');
      return false;
    }
    return true;
  }

  async function saveOpen() {
    if (!guardCart()) return;
    setSavingTab(true);
    try {
      await saveOpenTab(salePayload());
      dispatch({ type: 'clear' });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Comanda salva.');
    } catch (err) {
      toast.error(err?.message || 'Não foi possível salvar a comanda.');
    } finally {
      setSavingTab(false);
    }
  }

  function finish() {
    if (!guardCart()) return;
    if (state.formaPagamento === 'dinheiro' && (troco == null || troco < 0)) {
      toast.error('Informe um valor recebido que cubra o total.');
      return;
    }
    openModal('confirm', {
      message: 'Deseja confirmar a compra?',
      confirmLabel: 'Confirmar',
      successMessage: 'Venda registrada.',
      errorMessage: 'Não foi possível finalizar a venda.',
      onConfirm: async () => {
        await checkoutSale({
          ...salePayload(),
          forma_pagamento: state.formaPagamento,
          valor_recebido: state.formaPagamento === 'dinheiro' ? recebido : null,
          parcelas: state.formaPagamento === 'cartao_credito' ? Number(state.parcelas) : null,
        });
        dispatch({ type: 'clear' });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      },
    });
  }

  return (
    <section className="bg-surface-container-lowest rounded-2xl p-4 md:p-6 space-y-4">
      <h3 className="font-headline text-xl font-bold text-on-surface">Carrinho</h3>
      <div className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="flex-1">
          <RoleSelect
            id="pdv-cliente"
            label="Cliente"
            options={options}
            value={state.clienteId}
            onChange={(clienteId) => dispatch({ type: 'set-customer', clienteId })}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            openModal('new-customer', {
              onSuccess: (customer) => {
                setCreated(customer);
                dispatch({ type: 'set-customer', clienteId: String(customer.id) });
                queryClient.invalidateQueries({ queryKey: ['customers'] });
              },
            })
          }
        >
          Novo Cliente
        </Button>
      </div>

      {state.lines.length === 0 ? (
        <p className="text-on-surface-variant">Nenhum item no carrinho.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">
                <th className="px-2 py-3">Produto</th>
                <th className="px-2 py-3">Qtd</th>
                <th className="px-2 py-3">Unitário</th>
                <th className="px-2 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant/30">
              {state.lines.map((line) => (
                <tr key={line.produto_id}>
                  <td className="px-2 py-3 font-medium text-on-surface">
                    {line.codigo ? `${line.codigo} · ` : ''}
                    {line.nome}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="min-h-11 min-w-11 rounded-xl bg-surface-container-low text-on-surface font-bold"
                        onClick={() =>
                          dispatch({
                            type: 'set-qty',
                            produto_id: line.produto_id,
                            quantidade: line.quantidade - 1,
                          })
                        }
                        aria-label={`Diminuir ${line.nome}`}
                      >
                        −
                      </button>
                      <span className="min-w-6 text-center font-semibold">{line.quantidade}</span>
                      <button
                        type="button"
                        className="min-h-11 min-w-11 rounded-xl bg-surface-container-low text-on-surface font-bold"
                        onClick={() =>
                          dispatch({
                            type: 'set-qty',
                            produto_id: line.produto_id,
                            quantidade: line.quantidade + 1,
                          })
                        }
                        aria-label={`Aumentar ${line.nome}`}
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="px-2 py-3 text-on-surface">{money(line.valor_unitario)}</td>
                  <td className="px-2 py-3 text-right font-semibold text-on-surface">
                    {money(line.valor_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-2xl font-headline font-extrabold text-on-surface">Total {money(total)}</p>

      <Input
        id="pdv-comanda"
        label="Número da comanda"
        inputMode="numeric"
        value={state.numeroComanda}
        onChange={(event) =>
          dispatch({ type: 'set-comanda', numeroComanda: event.target.value.replace(/\D/g, '') })
        }
      />

      <RoleSelect
        id="pdv-pagamento"
        label="Forma de pagamento"
        options={PAYMENT_OPTIONS}
        value={state.formaPagamento}
        onChange={(formaPagamento) => dispatch({ type: 'set-payment', formaPagamento })}
      />

      {state.formaPagamento === 'dinheiro' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Valor recebido (R$)"
            inputMode="decimal"
            value={state.valorRecebido}
            onChange={(event) => dispatch({ type: 'set-received', valorRecebido: event.target.value })}
          />
          <div className="space-y-2">
            <p className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1">
              Troco
            </p>
            <p className={`min-h-11 flex items-center font-headline text-xl font-extrabold ${troco != null && troco < 0 ? 'text-error' : 'text-on-surface'}`}>
              {troco == null ? '—' : money(troco)}
            </p>
          </div>
        </div>
      ) : null}

      {state.formaPagamento === 'cartao_credito' ? (
        <RoleSelect
          id="pdv-parcelas"
          label="Parcelas"
          options={CARD_INSTALLMENTS.map((item) => ({ value: String(item), label: `${item}x` }))}
          value={state.parcelas}
          onChange={(parcelas) => dispatch({ type: 'set-installments', parcelas })}
        />
      ) : null}

      <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
        <Button type="button" variant="secondary" onClick={saveOpen} disabled={savingTab || !state.lines.length}>
          {savingTab ? 'Salvando...' : 'Salvar comanda'}
        </Button>
        <Button type="button" onClick={finish} disabled={!state.lines.length}>
          Finalizar Venda
        </Button>
      </div>
    </section>
  );
}
