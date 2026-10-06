import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../../contexts/ToastContext';
import { addPurchase, fetchCashFlow } from '../../services/dashboardService';
import { expenseCategories } from '../../services/fallbacks';
import { parseReaisInput } from '../../services/inventoryProduct';
import { parseMoneyToCents } from '../../services/cashFlowUtils';

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function unitPrice(item) {
  return parseMoneyToCents(item?.valor_unitario || item?.cost || 0) / 100;
}

export function PurchaseForm({ items = [], suppliers = [], onSuccess, onCancel }) {
  const toast = useToast();
  const cash = useQuery({ queryKey: ['cash-flow'], queryFn: fetchCashFlow });
  const categories = cash.data?.categories?.length ? cash.data.categories : expenseCategories;
  const products = useMemo(() => items.filter((item) => item.tipo !== 'combo'), [items]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplierId, setSupplierId] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'bebidas');
  const [lines, setLines] = useState([{ produto_id: '', quantidade: '1' }]);
  const [total, setTotal] = useState('');
  const [totalTouched, setTotalTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const calculated = useMemo(() => {
    const sum = lines.reduce((acc, line) => {
      const product = products.find((item) => String(item.id) === String(line.produto_id));
      const quantidade = Number(line.quantidade);
      if (!product || !Number.isInteger(quantidade) || quantidade <= 0) return acc;
      return acc + unitPrice(product) * quantidade;
    }, 0);
    return Math.round(sum * 100) / 100;
  }, [lines, products]);

  useEffect(() => {
    if (!totalTouched) setTotal(calculated > 0 ? calculated.toFixed(2) : '');
  }, [calculated, totalTouched]);

  function addLine() {
    setLines((prev) => [...prev, { produto_id: '', quantidade: '1' }]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const itens = lines
      .filter((line) => line.produto_id)
      .map((line) => ({
        produto_id: line.produto_id,
        quantidade: Number(line.quantidade),
      }));
    if (!itens.length) {
      setSaving(false);
      setError('Adicione ao menos um produto.');
      return;
    }
    const manual = totalTouched ? parseReaisInput(total) : null;
    if (totalTouched && (!Number.isFinite(manual) || manual <= 0)) {
      setSaving(false);
      setError('Valor total inválido.');
      return;
    }
    try {
      await addPurchase({
        date,
        supplierId,
        categoryId,
        itens,
        valor_total: manual,
      });
      toast.success('Compra registrada.');
      onSuccess?.();
      onCancel();
    } catch (err) {
      const message = err?.message || 'Não foi possível registrar a compra.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <Input label="Data" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
      <div className="space-y-2">
        <label className="text-xs font-label font-bold text-on-surface-variant uppercase pl-1">
          Fornecedor
        </label>
        <select
          className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11 text-on-surface focus:ring-2 focus:ring-primary-container transition-all appearance-none"
          value={supplierId}
          onChange={(event) => setSupplierId(event.target.value)}
          required
        >
          <option value="">Selecione</option>
          {suppliers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-3">
        <p className="text-xs font-label font-bold text-on-surface-variant uppercase pl-1">
          Produtos
        </p>
        {lines.map((line, index) => (
          <div key={`${index}-${line.produto_id}`} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select
              className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11 text-on-surface focus:ring-2 focus:ring-primary-container transition-all appearance-none"
              value={line.produto_id}
              onChange={(event) =>
                setLines((prev) =>
                  prev.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, produto_id: event.target.value } : row
                  )
                )
              }
              required
            >
              <option value="">Selecione</option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nome || item.name}
                </option>
              ))}
            </select>
            <Input
              label="Quantidade"
              type="number"
              min="1"
              step="1"
              value={line.quantidade}
              onChange={(event) =>
                setLines((prev) =>
                  prev.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, quantidade: event.target.value } : row
                  )
                )
              }
              required
            />
            {lines.length > 1 ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setLines((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}
              >
                Remover
              </Button>
            ) : null}
          </div>
        ))}
        <Button type="button" variant="secondary" onClick={addLine}>
          Adicionar produto
        </Button>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-label font-bold text-on-surface-variant uppercase pl-1">
          Categoria financeira
        </label>
        <select
          className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11 text-on-surface focus:ring-2 focus:ring-primary-container transition-all appearance-none"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          required
        >
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <p className="text-sm text-on-surface-variant">Total dos itens {money(calculated)}</p>
      <Input
        label="Valor total (R$)"
        inputMode="decimal"
        value={total}
        onChange={(event) => {
          setTotalTouched(true);
          setTotal(event.target.value);
        }}
        required
      />
      {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving || !products.length || !suppliers.length}>
          {saving ? 'Salvando...' : 'Registrar compra'}
        </Button>
      </div>
    </form>
  );
}
