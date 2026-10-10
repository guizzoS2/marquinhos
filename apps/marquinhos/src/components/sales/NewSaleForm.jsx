import { useMemo, useState } from 'react';
import { isValid, parseISO } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { FieldLabel } from '../ui/FieldLabel';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import { LineFields } from '../ui/LineFields';
import { useToast } from '../../contexts/ToastContext';
import { checkoutSale, saveOpenTab, updateRecordedSale } from '../../services/dashboardService';
import { saleUnitPrice } from '../../services/catalogRules';
import { saleBalance, salePaidAmount } from '../../services/saleRules';
import { blankPayment, PaymentSplits, paymentsError, paymentsFromForm } from './PaymentSplits';

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function saleLines(sale) {
  const rows = (sale?.itens || [])
    .filter((item) => item?.produto_id)
    .map((item) => ({
      produto_id: String(item.produto_id),
      quantidade: String(item.quantidade || 1),
      valor_unitario: item.valor_unitario,
    }));
  return rows.length ? rows : [{ produto_id: '', quantidade: '1' }];
}

function salePayments(sale) {
  const rows = (sale?.pagamentos || []).filter((pay) => Number(pay?.valor) > 0);
  if (!rows.length) return [blankPayment()];
  return rows.map((pay) => ({
    key: String(pay.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    forma: pay.forma_pagamento || 'dinheiro',
    valor: pay.valor != null ? String(pay.valor) : '',
    recebido: pay.valor_recebido != null ? String(pay.valor_recebido) : '',
    parcelas: pay.parcelas != null ? String(pay.parcelas) : '1',
  }));
}

export function NewSaleForm({ sale = null, items = [], promotions = [], sales = [], serverNow, onSuccess, onCancel }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const editing = Boolean(sale?.id);
  const [saleId, setSaleId] = useState('');
  const [lines, setLines] = useState(() => (editing ? saleLines(sale) : [{ produto_id: '', quantidade: '1' }]));
  const [payments, setPayments] = useState(() => (editing ? salePayments(sale) : [blankPayment()]));
  const [observacao, setObservacao] = useState(sale?.observacao || '');
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
        estoque: Number(item.estoque_atual ?? 0),
      }));
  }, [items, promotions, serverNow]);

  const open = useMemo(() => (sales || []).filter((item) => item.status === 'aberta'), [sales]);
  const selected = editing ? null : open.find((item) => String(item.id) === String(saleId)) || null;
  const allowPartial = editing && sale?.status === 'aberta';

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
      const product = catalog.find((row) => row.id === id);
      const prev = map.get(id);
      map.set(id, {
        quantidade: (prev?.quantidade || 0) + quantidade,
        nome: item.nome || prev?.nome || 'Produto',
        preco: product?.preco || item.valor_unitario || 0,
      });
    });
    if (!editing) {
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
          preco: product.preco,
        });
      });
    } else {
      map.clear();
      lines.forEach((line) => {
        if (!line.produto_id) return;
        const quantidade = Number(line.quantidade);
        if (!Number.isInteger(quantidade) || quantidade <= 0) return;
        const product = catalog.find((item) => item.id === String(line.produto_id));
        if (!product) return;
        const stored = line.valor_unitario;
        const preco = stored != null && stored !== '' ? Number(stored) : product.preco;
        const prev = map.get(product.id);
        map.set(product.id, {
          quantidade: (prev?.quantidade || 0) + quantidade,
          nome: product.nome,
          preco: prev ? prev.preco : preco,
        });
      });
    }
    return [...map.entries()].map(([id, row]) => {
      const preco = Number(row.preco) || 0;
      return {
        produto_id: id,
        nome: row.nome,
        quantidade: row.quantidade,
        valor_unitario: preco,
        valor_total: Math.round(preco * row.quantidade * 100) / 100,
      };
    });
  }, [catalog, editing, lines, selected]);

  const total = Math.round(itens.reduce((sum, line) => sum + line.valor_total, 0) * 100) / 100;
  const alreadyPaid = selected ? salePaidAmount(selected) : 0;
  const due = Math.round((total - alreadyPaid) * 100) / 100;
  const payError = paymentsError(payments, Math.max(due, 0), { partial: allowPartial });

  function pickSale(id) {
    setSaleId(id);
    const sale = open.find((item) => String(item.id) === String(id));
    setObservacao(sale?.observacao || '');
  }

  function updateLine(index, patch) {
    setLines((prev) =>
      prev.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        const next = { ...row, ...patch };
        if (patch.produto_id && patch.produto_id !== row.produto_id) delete next.valor_unitario;
        return next;
      })
    );
  }

  function lineTotal(line) {
    const product = catalog.find((item) => item.id === String(line.produto_id));
    const quantidade = Number(line.quantidade);
    if (!product || !Number.isInteger(quantidade) || quantidade <= 0) return 0;
    const stored = line.valor_unitario;
    const preco = stored != null && stored !== '' ? Number(stored) : product.preco;
    return Math.round(preco * quantidade * 100) / 100;
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
        observacao,
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
    if (payError) {
      setError(payError);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const pagamentos = paymentsFromForm(payments, Math.max(due, 0), { fillSingle: !allowPartial }).filter(
        (row) => Number(row.valor) > 0
      );
      if (editing) {
        await updateRecordedSale(sale.id, { observacao, itens: payload, pagamentos });
      } else {
        await checkoutSale({
          sale_id: selected?.id || null,
          numero_comanda: selected ? Number(selected.numero_comanda) : null,
          cliente_id: selected?.cliente_id || null,
          observacao,
          itens: payload,
          pagamentos,
        });
      }
      invalidate();
      toast.success(editing ? 'Venda atualizada.' : 'Venda registrada.');
      onSuccess?.();
      onCancel();
    } catch (err) {
      const message = err?.message || (editing ? 'Não foi possível atualizar a venda.' : 'Não foi possível registrar a venda.');
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  const cliente =
    selected?.cliente_nome && selected.cliente_nome !== 'Consumidor' ? selected.cliente_nome : 'Consumidor';
  const editCliente =
    sale?.cliente_nome && sale.cliente_nome !== 'Consumidor' ? sale.cliente_nome : 'Consumidor';

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="space-y-3">
        {editing ? (
          <p className="text-sm text-on-surface">
            {sale.numero_comanda ? `Comanda ${sale.numero_comanda}` : 'Venda sem comanda'}
            {sale.numero_comanda ? ` · ${editCliente}` : ''}
          </p>
        ) : (
          <div className="space-y-2">
            <FieldLabel>Comanda</FieldLabel>
            <Dropdown
              label="Comanda"
              muted
              value={selected ? selected.id : ''}
              onChange={pickSale}
              placeholder="Sem comanda"
              options={comandaOptions}
            />
          </div>
        )}
        {editing ? null : <p className="text-sm text-on-surface-variant">{selected ? cliente : 'Venda sem comanda'}</p>}
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

      <div className="space-y-2">
        <label htmlFor="venda-observacao" className="pl-1 text-xs font-label font-bold uppercase text-on-surface-variant">
          Observação
        </label>
        <textarea
          id="venda-observacao"
          value={observacao}
          onChange={(event) => setObservacao(event.target.value)}
          placeholder="Ex.: sem gelo"
          rows={3}
          className="min-h-11 w-full rounded-2xl border border-outline bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface outline-none placeholder:font-normal placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-0"
        />
      </div>

      <div className="space-y-3">
        <FieldLabel>Produtos</FieldLabel>
        {lines.map((line, index) => {
          const product = catalog.find((item) => item.id === String(line.produto_id));
          return (
            <div key={`${index}-${line.produto_id}`} className="space-y-3 rounded-2xl border border-outline p-4">
              <LineFields>
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
              </LineFields>
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 text-sm text-on-surface-variant">
                  {product
                    ? `${money(line.valor_unitario != null && line.valor_unitario !== '' ? Number(line.valor_unitario) : product.preco)} · ${money(lineTotal(line))} · Disponível ${product.estoque}`
                    : 'Selecione um produto'}
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

      {due > 0 ? (
        <PaymentSplits due={due} payments={payments} onChange={setPayments} fillSingle={!allowPartial} />
      ) : null}

      {error ? <p className="text-sm font-medium text-error">{error}</p> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          <Icon name="cancel" />
          Cancelar
        </Button>
        {!editing && selected ? (
          <Button type="button" variant="secondary" onClick={saveComanda} disabled={saving || !catalog.length}>
            <Icon name="save" />
            {saving ? 'Salvando...' : 'Salvar na comanda'}
          </Button>
        ) : null}
        <Button type="submit" disabled={saving || !catalog.length}>
          <Icon name="check" />
          {saving ? 'Salvando...' : editing ? 'Salvar' : 'Registrar venda'}
        </Button>
      </div>
    </form>
  );
}
