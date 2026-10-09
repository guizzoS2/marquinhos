import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { Icon } from '../ui/Icon';
import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { useCartDispatch, useCartState } from '../../contexts/CartContext';
import { checkoutSale, saveOpenTab } from '../../services/dashboardService';
import { saleBalance, salePaidAmount } from '../../services/saleRules';
import { blankPayment, PaymentSplits, paymentsError, paymentsFromForm } from '../sales/PaymentSplits';
import { PartialCloseForm } from './PartialCloseForm';
import { PdvModal } from './PdvModal';

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function LinePhoto({ src }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface-container-low text-on-surface-variant">
        <Icon name="inventory_2" className="text-xl" />
      </span>
    );
  }
  return (
    <img
      alt=""
      src={src}
      onError={() => setBroken(true)}
      className="h-14 w-14 shrink-0 rounded-xl object-cover"
    />
  );
}

export function PdvSummary({ items = [], sales = [] }) {
  const state = useCartState();
  const dispatch = useCartDispatch();
  const { openModal } = useModal();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [savingTab, setSavingTab] = useState(false);
  const [payments, setPayments] = useState([blankPayment()]);
  const [partialOpen, setPartialOpen] = useState(false);

  const photos = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      map.set(String(item.id), item.foto || item.image || '');
    });
    return map;
  }, [items]);

  const open = useMemo(() => (sales || []).filter((sale) => sale.status === 'aberta'), [sales]);
  const selected = open.find((sale) => String(sale.id) === String(state.saleId || '')) || null;

  useEffect(() => {
    if (!state.saleId || selected) return;
    dispatch({
      type: 'attach',
      saleId: '',
      numeroComanda: '',
      clienteId: '',
      identificacao: '',
    });
  }, [state.saleId, selected, dispatch]);

  function pickComanda(saleId) {
    const sale = open.find((item) => String(item.id) === String(saleId));
    if (!sale) {
      dispatch({ type: 'attach', saleId: '', numeroComanda: '', clienteId: '', identificacao: '' });
      return;
    }
    dispatch({
      type: 'attach',
      saleId: sale.id,
      numeroComanda: String(sale.numero_comanda),
      clienteId: sale.cliente_id ? String(sale.cliente_id) : '',
      identificacao: `Comanda ${sale.numero_comanda}`,
    });
  }

  function mergedItens() {
    const map = new Map();
    (selected?.itens || []).forEach((item) => {
      const id = String(item.produto_id);
      const quantidade = Number(item.quantidade);
      if (!Number.isInteger(quantidade) || quantidade <= 0) return;
      map.set(id, {
        produto_id: id,
        quantidade,
        valor_unitario: item.valor_unitario,
        valor_total: item.valor_total,
      });
    });
    state.lines.forEach((line) => {
      const id = String(line.produto_id);
      const prev = map.get(id);
      const quantidade = (prev?.quantidade || 0) + line.quantidade;
      map.set(id, {
        produto_id: id,
        quantidade,
        valor_unitario: line.valor_unitario,
        valor_total: Math.round(line.valor_unitario * quantidade * 100) / 100,
      });
    });
    return [...map.values()];
  }

  function salePayload() {
    const itens = selected
      ? mergedItens()
      : state.lines.map((line) => ({
          produto_id: line.produto_id,
          quantidade: line.quantidade,
          valor_unitario: line.valor_unitario,
          valor_total: line.valor_total,
        }));
    return {
      sale_id: selected?.id || null,
      numero_comanda: selected ? Number(selected.numero_comanda) : null,
      cliente_id: selected?.cliente_id || null,
      itens,
    };
  }

  const chargeTotal =
    Math.round(salePayload().itens.reduce((sum, line) => sum + Number(line.valor_total || 0), 0) * 100) / 100;
  const alreadyPaid = selected ? salePaidAmount(selected) : 0;
  const due = Math.round((chargeTotal - alreadyPaid) * 100) / 100;

  function guardComanda() {
    if (!state.lines.length) {
      toast.error('O carrinho está vazio.');
      return false;
    }
    if (!selected) {
      toast.error('Selecione uma comanda.');
      return false;
    }
    return true;
  }

  async function saveOpen() {
    if (!guardComanda()) return;
    setSavingTab(true);
    try {
      await saveOpenTab(salePayload());
      dispatch({
        type: 'attach',
        saleId: selected.id,
        numeroComanda: String(selected.numero_comanda),
        clienteId: selected.cliente_id ? String(selected.cliente_id) : '',
        identificacao: `Comanda ${selected.numero_comanda}`,
        lines: [],
      });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Comanda salva.');
    } catch (err) {
      toast.error(err?.message || 'Não foi possível salvar a comanda.');
    } finally {
      setSavingTab(false);
    }
  }

  function finish() {
    if (!salePayload().itens.length) {
      toast.error('O carrinho está vazio.');
      return;
    }
    if (due < -0.001) {
      toast.error('O total não pode ficar menor que o já pago.');
      return;
    }
    const payError = paymentsError(payments, Math.max(due, 0));
    if (payError) {
      toast.error(payError);
      return;
    }
    openModal('confirm', {
      message: alreadyPaid > 0 ? `Receber ${money(due)} e fechar a comanda?` : 'Deseja confirmar a compra?',
      confirmLabel: 'Confirmar',
      successMessage: 'Venda registrada.',
      errorMessage: 'Não foi possível finalizar a venda.',
      onConfirm: async () => {
        await checkoutSale({
          ...salePayload(),
          pagamentos: paymentsFromForm(payments, Math.max(due, 0)),
        });
        dispatch({ type: 'clear' });
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      },
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-outline bg-surface p-4 shadow-sm md:p-5">
      <h3 className="font-headline text-xl font-bold text-on-surface">Carrinho</h3>
      <div className="space-y-2">
        <p id="pdv-comanda" className="pl-1 text-xs font-label font-bold uppercase text-on-surface-variant">
          Comanda
        </p>
        <Dropdown
          id="pdv-comanda-select"
          label="Comanda"
          muted
          value={selected ? selected.id : ''}
          onChange={pickComanda}
          placeholder="Sem comanda"
          options={[
            { value: '', label: 'Sem comanda' },
            ...open.map((sale) => ({
              value: sale.id,
              label:
                sale.cliente_nome && sale.cliente_nome !== 'Consumidor'
                  ? `Comanda ${sale.numero_comanda} · ${sale.cliente_nome}`
                  : `Comanda ${sale.numero_comanda}`,
            })),
          ]}
        />
        <p className="text-sm text-on-surface-variant">
          {selected ? `Cliente ${selected.cliente_nome || 'Consumidor'}` : 'Venda sem comanda'}
        </p>
      </div>

      {state.lines.length === 0 ? (
        <p className="rounded-2xl border border-outline bg-surface-container-low p-4 text-sm text-on-surface-variant">
          Nenhum item no carrinho.
        </p>
      ) : (
        <ul className="space-y-3">
          {state.lines.map((line) => (
            <li key={line.produto_id} className="space-y-3 rounded-2xl border border-outline bg-surface p-3">
              <div className="flex items-start gap-3">
                <LinePhoto src={line.foto || photos.get(String(line.produto_id))} />
                <div className="min-w-0 flex-1">
                  <p className="break-words font-semibold text-on-surface">{line.nome}</p>
                  <p className="font-headline font-extrabold text-on-surface">{money(line.valor_total)}</p>
                  <p className="text-sm text-on-surface-variant">
                    Disponível {Number(items.find((item) => String(item.id) === String(line.produto_id))?.estoque_atual ?? 0)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  onClick={() =>
                    dispatch({
                      type: 'set-qty',
                      produto_id: line.produto_id,
                      quantidade: line.quantidade - 1,
                    })
                  }
                  aria-label={`Diminuir ${line.nome}`}
                >
                  <Icon name="remove" />
                </Button>
                <span className="w-8 text-center text-sm font-semibold text-on-surface">{line.quantidade}</span>
                <Button
                  type="button"
                  size="icon"
                  onClick={() =>
                    dispatch({
                      type: 'set-qty',
                      produto_id: line.produto_id,
                      quantidade: line.quantidade + 1,
                    })
                  }
                  aria-label={`Aumentar ${line.nome}`}
                >
                  <Icon name="add" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-4 border-t border-outline pt-4">
        <div className="space-y-1">
          <p className="font-headline text-2xl font-extrabold text-on-surface">Total {money(chargeTotal)}</p>
          {selected && (selected.itens || []).length ? (
            <p className="text-sm text-on-surface-variant">Inclui os itens que já estão na comanda.</p>
          ) : null}
          {selected && alreadyPaid > 0 ? (
            <p className="text-sm text-on-surface-variant">
              Pago {money(alreadyPaid)} · Saldo {money(due)}
            </p>
          ) : null}
        </div>

        {due > 0 ? <PaymentSplits due={due} payments={payments} onChange={setPayments} /> : null}

        <div className="flex flex-col gap-3">
          <Button type="button" variant="secondary" className="w-full" onClick={saveOpen} disabled={savingTab || !state.lines.length}>
            <Icon name="save" />
            {savingTab ? 'Salvando...' : 'Salvar comanda'}
          </Button>
          {selected && saleBalance(selected) > 0 ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                if (state.lines.length) {
                  toast.error('Salve os itens da comanda antes do fechamento.');
                  return;
                }
                setPartialOpen(true);
              }}
            >
              <Icon name="payments" />
              Fechamento
            </Button>
          ) : null}
          <Button type="button" className="w-full" onClick={finish} disabled={!salePayload().itens.length}>
            <Icon name="check" />
            Finalizar venda
          </Button>
        </div>
      </div>
      {partialOpen && selected ? (
        <PdvModal title={`Comanda ${selected.numero_comanda}`} icon="payments" onClose={() => setPartialOpen(false)}>
          <PartialCloseForm sale={selected} onCancel={() => setPartialOpen(false)} onSuccess={() => setPartialOpen(false)} />
        </PdvModal>
      ) : null}
    </section>
  );
}
