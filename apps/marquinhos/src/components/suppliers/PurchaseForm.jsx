import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Dropdown } from '../ui/Dropdown';
import { FieldLabel } from '../ui/FieldLabel';
import { FieldModal } from '../ui/FieldModal';
import { Input } from '../ui/Input';
import { LineFields } from '../ui/LineFields';
import { useToast } from '../../contexts/ToastContext';
import {
  addPurchase,
  createExpenseCategory,
  fetchCashFlow,
  fetchInventory,
} from '../../services/dashboardService';
import { expenseCategories } from '../../services/fallbacks';
import { parseReaisInput } from '../../services/inventoryProduct';
import { parseMoneyToCents } from '../../services/cashFlowUtils';
import { ProductForm } from '../inventory/ProductForm';
import { NewSupplierForm } from './NewSupplierForm';

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function unitPrice(item) {
  return parseMoneyToCents(item?.valor_unitario || item?.cost || 0) / 100;
}

function mergeById(base, extra) {
  const seen = new Set(base.map((item) => String(item.id)));
  return [...base, ...extra.filter((item) => !seen.has(String(item.id)))];
}

function ExpenseCategoryForm({ onSuccess, onCancel }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await createExpenseCategory(name);
      toast.success('Categoria criada.');
      onSuccess?.(created);
      onCancel();
    } catch (err) {
      const message = err?.message || 'Não foi possível criar a categoria.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Input
        label="Nome da categoria"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
      />
      {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="secondary" type="button" onClick={onCancel}>
          <Icon name="cancel" />
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          <Icon name="add" />
          {saving ? 'Salvando...' : 'Criar categoria'}
        </Button>
      </div>
    </form>
  );
}

export function PurchaseForm({ items = [], suppliers = [], onSuccess, onCancel }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const cash = useQuery({ queryKey: ['cash-flow'], queryFn: fetchCashFlow });
  const inventory = useQuery({ queryKey: ['inventory'], queryFn: fetchInventory });
  const [extraProducts, setExtraProducts] = useState([]);
  const [extraSuppliers, setExtraSuppliers] = useState([]);
  const [extraCategories, setExtraCategories] = useState([]);
  const [child, setChild] = useState(null);
  const baseCategories = cash.data?.categories?.length ? cash.data.categories : expenseCategories;
  const categories = useMemo(
    () => mergeById(baseCategories, extraCategories),
    [baseCategories, extraCategories]
  );
  const products = useMemo(
    () => mergeById(items, extraProducts).filter((item) => item.tipo !== 'combo'),
    [items, extraProducts]
  );
  const supplierOptions = useMemo(
    () => mergeById(suppliers, extraSuppliers),
    [suppliers, extraSuppliers]
  );
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

  function closeChild() {
    setChild(null);
  }

  function rememberProduct(item) {
    if (!item?.id) return;
    setExtraProducts((prev) => mergeById(prev, [item]));
    setLines((prev) =>
      prev.map((row, index) =>
        index === child?.lineIndex ? { ...row, produto_id: item.id } : row
      )
    );
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
  }

  function rememberSupplier(supplier) {
    if (supplier?.id == null) return;
    setExtraSuppliers((prev) => mergeById(prev, [supplier]));
    setSupplierId(supplier.id);
    queryClient.invalidateQueries({ queryKey: ['suppliers'] });
  }

  function rememberCategory(category) {
    if (!category?.id) return;
    setExtraCategories((prev) => mergeById(prev, [category]));
    setCategoryId(category.id);
    queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
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
    <>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <Input label="Data" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        <div className="space-y-2">
          <label className="text-xs font-label font-bold text-on-surface-variant uppercase pl-1">
            Fornecedor
          </label>
          <div className="flex items-center gap-2">
            <Dropdown
              className="min-w-0 flex-1"
              label="Fornecedor"
              muted
              value={supplierId}
              placeholder="Selecione"
              search
              onChange={setSupplierId}
              options={[
                { value: '', label: 'Selecione' },
                ...supplierOptions.map((item) => ({ value: item.id, label: item.name })),
              ]}
            />
            <Button
              type="button"
              size="icon"
              className="shrink-0"
              aria-label="Novo fornecedor"
              onClick={() => setChild({ kind: 'supplier' })}
            >
              <Icon name="add" />
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-label font-bold text-on-surface-variant uppercase pl-1">
            Produtos
          </p>
          {lines.map((line, index) => (
            <div key={`${index}-${line.produto_id}`} className="space-y-3">
              <LineFields>
                <div className="flex min-w-0 items-end gap-2">
                  <div className="min-w-0 flex-1 space-y-2">
                    <FieldLabel>Produto</FieldLabel>
                    <Dropdown
                      className="w-full"
                      label="Produto"
                      muted
                      value={line.produto_id}
                      placeholder="Selecione"
                      search
                      onChange={(produtoId) =>
                        setLines((prev) =>
                          prev.map((row, rowIndex) =>
                            rowIndex === index ? { ...row, produto_id: produtoId } : row
                          )
                        )
                      }
                      options={[
                        { value: '', label: 'Selecione' },
                        ...products.map((item) => ({ value: item.id, label: item.nome || item.name })),
                      ]}
                    />
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    className="shrink-0"
                    aria-label="Novo produto"
                    onClick={() => setChild({ kind: 'product', lineIndex: index })}
                  >
                    <Icon name="add" />
                  </Button>
                </div>
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
              </LineFields>
              {lines.length > 1 ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setLines((prev) => prev.filter((_, rowIndex) => rowIndex !== index))}
                >
                  <Icon name="delete" />
                  Remover
                </Button>
              ) : null}
            </div>
          ))}
          <Button type="button" variant="secondary" onClick={addLine}>
            <Icon name="add" />
            Adicionar produto
          </Button>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-label font-bold text-on-surface-variant uppercase pl-1">
            Categoria financeira
          </label>
          <div className="flex items-center gap-2">
            <Dropdown
              className="min-w-0 flex-1"
              label="Categoria financeira"
              muted
              value={categoryId}
              onChange={setCategoryId}
              options={categories
                .filter((item) => item.id !== 'freelancer')
                .map((item) => ({ value: item.id, label: item.name }))}
            />
            <Button
              type="button"
              size="icon"
              className="shrink-0"
              aria-label="Nova categoria"
              onClick={() => setChild({ kind: 'category' })}
            >
              <Icon name="add" />
            </Button>
          </div>
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
            <Icon name="cancel" />
            Cancelar
          </Button>
          <Button type="submit" disabled={saving || !products.length || !supplierOptions.length}>
            <Icon name="add" />
            {saving ? 'Salvando...' : 'Registrar compra'}
          </Button>
        </div>
      </form>
      {child?.kind === 'product' ? (
        <FieldModal title="Novo produto" icon="inventory_2" wide onClose={closeChild}>
          <ProductForm
            categories={inventory.data?.filters}
            onSuccess={rememberProduct}
            onCancel={closeChild}
          />
        </FieldModal>
      ) : null}
      {child?.kind === 'supplier' ? (
        <FieldModal title="Novo Fornecedor" icon="local_shipping" onClose={closeChild}>
          <NewSupplierForm onSuccess={rememberSupplier} onCancel={closeChild} />
        </FieldModal>
      ) : null}
      {child?.kind === 'category' ? (
        <FieldModal title="Nova categoria" icon="category" onClose={closeChild}>
          <ExpenseCategoryForm onSuccess={rememberCategory} onCancel={closeChild} />
        </FieldModal>
      ) : null}
    </>
  );
}
