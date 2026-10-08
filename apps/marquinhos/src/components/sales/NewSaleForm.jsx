import { useMemo, useState } from 'react';
import { isValid, parseISO } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import { RoleSelect } from '../freelancers/RoleSelect';
import { useToast } from '../../contexts/ToastContext';
import { checkoutSale } from '../../services/dashboardService';
import { saleUnitPrice } from '../../services/catalogRules';
import { CARD_INSTALLMENTS, PAYMENT_OPTIONS, parseReaisInput } from '../../services/inventoryProduct';

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const PAYMENT_ICONS = {
  dinheiro: 'payments',
  cartao_credito: 'credit_card',
  cartao_debito: 'contactless',
  pix: 'qr_code_2',
};

export function NewSaleForm({ items = [], promotions = [], serverNow, onSuccess, onCancel }) {
  const toast = useToast();
  const queryClient = useQueryClient();
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

  const options = catalog.map((item) => ({
    value: item.id,
    label: item.codigo ? `${item.nome} · ${item.codigo}` : item.nome,
  }));

  function lineTotal(line) {
    const product = catalog.find((item) => item.id === String(line.produto_id));
    const quantidade = Number(line.quantidade);
    if (!product || !Number.isInteger(quantidade) || quantidade <= 0) return 0;
    return Math.round(product.preco * quantidade * 100) / 100;
  }

  const total = Math.round(lines.reduce((sum, line) => sum + lineTotal(line), 0) * 100) / 100;
  const received = parseReaisInput(recebido);
  const troco =
    forma === 'dinheiro' && recebido !== '' && Number.isFinite(received)
      ? Math.round((received - total) * 100) / 100
      : null;

  function updateLine(index, patch) {
    setLines((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  async function submit(event) {
    event.preventDefault();
    const grouped = new Map();
    lines.forEach((line) => {
      if (!line.produto_id) return;
      const quantidade = Number(line.quantidade);
      if (!Number.isInteger(quantidade) || quantidade <= 0) return;
      const product = catalog.find((item) => item.id === String(line.produto_id));
      if (!product) return;
      const prev = grouped.get(product.id);
      const nextQty = (prev?.quantidade || 0) + quantidade;
      grouped.set(product.id, {
        produto_id: product.id,
        quantidade: nextQty,
        valor_unitario: product.preco,
        valor_total: Math.round(product.preco * nextQty * 100) / 100,
      });
    });
    const itens = [...grouped.values()];
    if (!itens.length) {
      setError('Adicione ao menos um produto.');
      return;
    }
    if (forma === 'dinheiro' && (troco == null || troco < 0)) {
      setError('Informe um valor recebido que cubra o total.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await checkoutSale({
        sale_id: null,
        numero_comanda: null,
        cliente_id: null,
        itens,
        forma_pagamento: forma,
        valor_recebido: forma === 'dinheiro' ? received : null,
        parcelas: forma === 'cartao_credito' ? Number(parcelas) : null,
      });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
      queryClient.invalidateQueries({ queryKey: ['caixa-shift'] });
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

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="space-y-3">
        <p className="pl-1 text-xs font-label font-bold uppercase text-on-surface-variant">Produtos</p>
        {lines.map((line, index) => {
          const product = catalog.find((item) => item.id === String(line.produto_id));
          return (
            <div key={`${index}-${line.produto_id}`} className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Dropdown
                label="Produto"
                muted
                search
                placeholder="Digite para buscar"
                value={line.produto_id}
                onChange={(produtoId) => updateLine(index, { produto_id: produtoId })}
                options={options}
              />
              <Input
                label="Quantidade"
                type="number"
                min="1"
                step="1"
                value={line.quantidade}
                onChange={(event) => updateLine(index, { quantidade: event.target.value })}
                required={Boolean(line.produto_id)}
              />
              {product ? (
                <p className="text-sm text-on-surface-variant md:col-span-2">
                  {money(product.preco)} · {money(lineTotal(line))}
                </p>
              ) : null}
              {lines.length > 1 ? (
                <Button type="button" variant="secondary" onClick={() => setLines((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}>
                  <Icon name="delete" />
                  Remover
                </Button>
              ) : null}
            </div>
          );
        })}
        <Button type="button" variant="secondary" onClick={() => setLines((prev) => [...prev, { produto_id: '', quantidade: '1' }])}>
          <Icon name="add" />
          Adicionar produto
        </Button>
      </div>

      <p className="font-headline text-2xl font-extrabold text-on-surface">Total {money(total)}</p>

      <div className="space-y-2">
        <p id="venda-pagamento" className="pl-1 text-xs font-label font-bold uppercase text-on-surface-variant">
          Forma de pagamento
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-labelledby="venda-pagamento">
          {PAYMENT_OPTIONS.map((option) => {
            const selected = forma === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setForma(option.value)}
                className={`inline-flex min-h-11 w-full min-w-0 items-center gap-2 rounded-full px-4 text-left text-sm font-semibold leading-5 [&_.material-symbols-outlined]:text-xl ${
                  selected
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

      {forma === 'dinheiro' ? (
        <div className="grid grid-cols-1 gap-3">
          <Input
            label="Valor recebido (R$)"
            inputMode="decimal"
            value={recebido}
            onChange={(event) => setRecebido(event.target.value)}
          />
          <div className="space-y-2">
            <p className="pl-1 text-xs font-label font-bold uppercase text-on-surface-variant">Troco</p>
            <p
              className={`flex min-h-11 items-center font-headline text-xl font-extrabold ${troco != null && troco < 0 ? 'text-error' : 'text-on-surface'}`}
            >
              {troco == null ? '—' : money(troco)}
            </p>
          </div>
        </div>
      ) : null}

      {forma === 'cartao_credito' ? (
        <RoleSelect
          id="venda-parcelas"
          label="Parcelas"
          options={CARD_INSTALLMENTS.map((item) => ({ value: String(item), label: `${item}x` }))}
          value={parcelas}
          onChange={setParcelas}
        />
      ) : null}

      {error ? <p className="text-sm font-medium text-error">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          <Icon name="cancel" />
          Cancelar
        </Button>
        <Button type="submit" disabled={saving || !catalog.length}>
          <Icon name="check" />
          {saving ? 'Salvando...' : 'Registrar venda'}
        </Button>
      </div>
    </form>
  );
}
