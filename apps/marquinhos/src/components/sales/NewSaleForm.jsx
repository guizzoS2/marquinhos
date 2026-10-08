import { useMemo, useState } from 'react';
import { isValid, parseISO } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import { RoleSelect } from '../freelancers/RoleSelect';
import { useToast } from '../../contexts/ToastContext';
import { checkoutSale, saveOpenTab } from '../../services/dashboardService';
import { saleUnitPrice } from '../../services/catalogRules';
import { CARD_INSTALLMENTS, PAYMENT_OPTIONS, parseReaisInput } from '../../services/inventoryProduct';
import { saleBalance, salePaidAmount } from '../../services/saleRules';

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function FieldLabel({ children }) {
  return <p className="pl-1 text-xs font-label font-bold uppercase text-on-surface-variant">{children}</p>;
}

const PAYMENT_ICONS = {
  dinheiro: 'payments',
  cartao_credito: 'credit_card',
  cartao_debito: 'contactless',
  pix: 'qr_code_2',
};

export function NewSaleForm({ items = [], promotions = [], sales = [], serverNow, onSuccess, onCancel }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [saleId, setSaleId] = useState('');
  const [lines, setLines] = useState([{ produto_id: '', quantidade: '1' }]);
  const [forma, setForma] = useState('dinheiro');
  const [recebido, setRecebido] = useState('');
  const [parcelas, setParcelas] = useState('1');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const catalog = useMemo(() => {
    const pricedAt = parseISO(String(serverNow || ''));
    const now = isValid(pricedAt) ? pricedAt : new Date();
    return items
      .filter((item) => item?.id != null)
      .map((item) => ({
        id: String(item.id),
        nome: item.nome || item.name || 'Produto',
        codigo: item.codigo || '',
        preco: saleUnitPrice(item, promotions, now),
      }));
  }, [items, promotions, serverNow]);

  const open = useMemo(() => (sales || []).filter((sale) => sale.status === 'aberta'), [sales]);
  const selected = open.find((sale) => String(sale.id) === String(saleId)) || null;

  const options = catalog.map((item) => ({
    value: item.id,
    label: item.codigo ? `${item.nome} · ${item.codigo}` : item.nome,
  }));

  const comandaOptions = [
    { value: '', label: 'Sem comanda' },
    ...open.map((sale) => ({
      value: sale.id,
      label:
        sale.cliente_nome && sale.cliente_nome !== 'Consumidor'
          ? `Comanda ${sale.numero_comanda} · ${sale.cliente_nome}`
          : `Comanda ${sale.numero_comanda}`,
    })),
  ];

  const itens = useMemo(() => {
    const map = new Map();
    (selected?.itens || []).forEach((item) => {
      const id = String(item.produto_id || '');
      const quantidade = Number(item.quantidade);
      if (!id || !Number.isInteger(quantidade) || quantidade <= 0) return;
      const prev = map.get(id);
      map.set(id, {
        quantidade: (prev?.quantidade || 0) + quantidade,
        nome: item.nome || prev?.nome || 'Produto',
      });
    });
    lines.forEach((line) => {
      if (!line.produto_id) return;
      const quantidade = Number(line.quantidade);
      if (!Number.isInteger(quantidade) || quantidade <= 0) return;
      const product = catalog.find((item) => item.id === String(line.produto_id));
      if (!product) return;
      const prev = map.get(product.id);
      map.set(product.id, {
        quantidade: (prev?.quantidade || 0) + quantidade,
        nome: product.nome,
      });
    });
    return [...map.entries()].map(([id, row]) => {
      const product = catalog.find((item) => item.id === id);
      const preco = product?.preco || 0;
      return {
        produto_id: id,
        nome: row.nome,
        quantidade: row.quantidade,
        valor_unitario: preco,
        valor_total: Math.round(preco * row.quantidade * 100) / 100,
      };
    });
  }, [catalog, lines, selected]);

  const total = Math.round(itens.reduce((sum, line) => sum + line.valor_total, 0) * 100) / 100;
  const alreadyPaid = selected ? salePaidAmount(selected) : 0;
  const due = Math.round((total - alreadyPaid) * 100) / 100;
  const received = parseReaisInput(recebido);
  const troco =
    forma === 'dinheiro' && due > 0 && recebido !== '' && Number.isFinite(received)
      ? Math.round((received - due) * 100) / 100
      : null;

  function updateLine(index, patch) {
    setLines((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function lineTotal(line) {
    const product = catalog.find((item) => item.id === String(line.produto_id));
    const quantidade = Number(line.quantidade);
    if (!product || !Number.isInteger(quantidade) || quantidade <= 0) return 0;
    return Math.round(product.preco * quantidade * 100) / 100;
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
    queryClient.invalidateQueries({ queryKey: ['caixa-shift'] });
  }

  function guard() {
    if (saleId && !selected) {
      setError('Comanda não encontrada.');
      return null;
    }
    if (!itens.length) {
      setError('Adicione ao menos um produto.');
      return null;
    }
    if (due < -0.001) {
      setError('O total não pode ficar menor que o já pago.');
      return null;
    }
    return itens;
  }

  async function saveComanda() {
    const payload = guard();
    if (!payload || !selected) return;
    setSaving(true);
    setError('');
    try {
      await saveOpenTab({
        sale_id: selected.id,
        numero_comanda: Number(selected.numero_comanda),
        cliente_id: selected.cliente_id || null,
        itens: payload,
      });
      invalidate();
      toast.success('Comanda salva.');
      onSuccess?.();
      onCancel();
    } catch (err) {
      const message = err?.message || 'Não foi possível salvar a comanda.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    const payload = guard();
    if (!payload) return;
    if (forma === 'dinheiro' && due > 0 && (troco == null || troco < 0)) {
      setError('Informe um valor recebido que cubra o saldo.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await checkoutSale({
        sale_id: selected?.id || null,
        numero_comanda: selected ? Number(selected.numero_comanda) : null,
        cliente_id: selected?.cliente_id || null,
        itens: payload,
        forma_pagamento: forma,
        valor_recebido: forma === 'dinheiro' && due > 0 ? received : null,
        parcelas: forma === 'cartao_credito' && due > 0 ? Number(parcelas) : null,
      });
      invalidate();
      toast.success('Venda registrada.');
      onSuccess?.();
      onCancel();
    } catch (err) {
      const message = err?.message || 'Não foi possível registrar a venda.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const cliente =
    selected?.cliente_nome && selected.cliente_nome !== 'Consumidor' ? selected.cliente_nome : 'Consumidor';

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="space-y-3">
        <div className="space-y-2">
          <FieldLabel>Comanda</FieldLabel>
          <Dropdown
            label="Comanda"
            muted
            value={selected ? selected.id : ''}
            onChange={setSaleId}
            placeholder="Sem comanda"
            options={comandaOptions}
          />
        </div>
        <p className="text-sm text-on-surface-variant">{selected ? cliente : 'Venda sem comanda'}</p>
        {selected ? (
          <div className="space-y-3 rounded-2xl border border-outline p-4">
            {(selected.itens || []).length ? (
              <ul className="space-y-2">
                {selected.itens.map((item, index) => (
                  <li key={`${item.produto_id}-${index}`} className="flex items-start justify-between gap-3 text-sm">
                    <span className="min-w-0 break-words text-on-surface">
                      {item.nome || 'Produto'} × {item.quantidade}
                    </span>
                    <span className="shrink-0 font-semibold text-on-surface">{money(item.valor_total)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-on-surface-variant">Nenhum item nesta comanda.</p>
            )}
            <p className="border-t border-outline pt-3 text-sm text-on-surface">
              Total {money(selected.total)} · Pago {money(alreadyPaid)} · Saldo {money(Math.max(saleBalance(selected), 0))}
            </p>
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <FieldLabel>Produtos</FieldLabel>
        {lines.map((line, index) => {
          const product = catalog.find((item) => item.id === String(line.produto_id));
          return (
            <div key={`${index}-${line.produto_id}`} className="space-y-3 rounded-2xl border border-outline p-4">
              <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[minmax(0,1fr)_8rem]">
                <div className="min-w-0 space-y-2">
                  <FieldLabel>Produto</FieldLabel>
                  <Dropdown
                    label="Produto"
                    muted
                    search
                    placeholder="Selecione o produto"
                    value={line.produto_id}
                    onChange={(produtoId) => updateLine(index, { produto_id: produtoId })}
                    options={options}
                  />
                </div>
                <Input
                  label="Quantidade"
                  type="number"
                  min="1"
                  step="1"
                  value={line.quantidade}
                  onChange={(event) => updateLine(index, { quantidade: event.target.value })}
                  required={Boolean(line.produto_id)}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 text-sm text-on-surface-variant">
                  {product ? `${money(product.preco)} · ${money(lineTotal(line))}` : 'Selecione um produto'}
                </p>
                {lines.length > 1 ? (
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="shrink-0"
                    aria-label="Remover produto"
                    onClick={() => setLines((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}
                  >
                    <Icon name="delete" />
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
        <Button
          type="button"
          variant="secondary"
          onClick={() => setLines((prev) => [...prev, { produto_id: '', quantidade: '1' }])}
        >
          <Icon name="add" />
          Adicionar produto
        </Button>
      </div>

      <div className="flex items-baseline justify-between gap-3 border-t border-outline pt-4">
        <p className="text-xs font-label font-bold uppercase text-on-surface-variant">
          {alreadyPaid > 0 ? 'A receber' : 'Total'}
        </p>
        <p className="font-headline text-2xl font-extrabold text-on-surface">{money(Math.max(due, 0))}</p>
      </div>

      <div className="space-y-3">
        <p id="venda-pagamento" className="pl-1 text-xs font-label font-bold uppercase text-on-surface-variant">
          Forma de pagamento
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-labelledby="venda-pagamento">
          {PAYMENT_OPTIONS.map((option) => {
            const active = forma === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={active}
                onClick={() => setForma(option.value)}
                className={`inline-flex min-h-11 w-full min-w-0 items-center gap-2 rounded-full px-4 text-left text-sm font-semibold leading-5 [&_.material-symbols-outlined]:text-xl ${
                  active
                    ? 'bg-primary text-on-primary'
                    : 'border border-outline bg-surface text-on-surface hover:bg-surface-container-low'
                }`}
              >
                <Icon name={PAYMENT_ICONS[option.value] || 'payments'} className="shrink-0" />
                <span className="min-w-0">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {forma === 'dinheiro' && due > 0 ? (
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
          <Input
            label="Valor recebido (R$)"
            inputMode="decimal"
            value={recebido}
            onChange={(event) => setRecebido(event.target.value)}
          />
          <div className="space-y-2">
            <FieldLabel>Troco</FieldLabel>
            <p
              className={`flex h-11 items-center rounded-2xl border border-outline bg-surface-container-low px-4 font-headline text-base font-extrabold ${
                troco != null && troco < 0 ? 'text-error' : 'text-on-surface'
              }`}
            >
              {troco == null ? '—' : money(troco)}
            </p>
          </div>
        </div>
      ) : null}

      {forma === 'cartao_credito' && due > 0 ? (
        <RoleSelect
          id="venda-parcelas"
          label="Parcelas"
          options={CARD_INSTALLMENTS.map((item) => ({ value: String(item), label: `${item}x` }))}
          value={parcelas}
          onChange={setParcelas}
        />
      ) : null}

      {error ? <p className="text-sm font-medium text-error">{error}</p> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          <Icon name="cancel" />
          Cancelar
        </Button>
        {selected ? (
          <Button type="button" variant="secondary" onClick={saveComanda} disabled={saving || !catalog.length}>
            <Icon name="save" />
            {saving ? 'Salvando...' : 'Salvar na comanda'}
          </Button>
        ) : null}
        <Button type="submit" disabled={saving || !catalog.length}>
          <Icon name="check" />
          {saving ? 'Salvando...' : 'Registrar venda'}
        </Button>
      </div>
    </form>
  );
}
