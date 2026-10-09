import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { FieldLabel } from '../ui/FieldLabel';
import { FieldModal } from '../ui/FieldModal';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import { LineFields } from '../ui/LineFields';
import { SegmentedControl } from '../ui/SegmentedControl';
import { ProductForm } from '../inventory/ProductForm';
import { NewSupplierForm } from '../suppliers/NewSupplierForm';
import { useToast } from '../../contexts/ToastContext';
import {
  addPurchase,
  createCashExpense,
  createExpenseCategory,
  editCashExpense,
  fetchCashFlow,
  fetchFreelancers,
  fetchInventory,
  fetchSuppliers,
} from '../../services/dashboardService';
import { parseReaisInput } from '../../services/inventoryProduct';
import { expensePartyKind, parseCashFlowDate, parseMoneyToCents, toIsoDate } from '../../services/cashFlowUtils';
import { expenseCategories } from '../../services/fallbacks';

function cashFormDate(row) {
  return parseCashFlowDate(row?.date) || toIsoDate(row?.createdAt) || new Date().toISOString().slice(0, 10);
}

function reaisInput(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

function mergeById(base, extra) {
  const seen = new Set(base.map((item) => String(item.id)));
  return [...base, ...extra.filter((item) => !seen.has(String(item.id)))];
}

function CategoryNameForm({ onSuccess, onCancel }) {
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
      {error ? <p className="text-sm font-medium text-error">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-3">
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

export function ExpenseForm({ onSuccess, onCancel, categories: categoriesProp, expense = null, purchase = null }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const editing = Boolean(expense?.id);
  const cash = useQuery({ queryKey: ['cash-flow'], queryFn: fetchCashFlow });
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: fetchSuppliers });
  const freelancersQuery = useQuery({ queryKey: ['freelancers'], queryFn: fetchFreelancers });
  const inventory = useQuery({ queryKey: ['inventory'], queryFn: fetchInventory });
  const [createdCategories, setCreatedCategories] = useState([]);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [child, setChild] = useState(null);
  const [extraProducts, setExtraProducts] = useState([]);
  const [extraSuppliers, setExtraSuppliers] = useState([]);
  const [lines, setLines] = useState([{ produto_id: '', quantidade: '1' }]);
  const [total, setTotal] = useState('');
  const [totalTouched, setTotalTouched] = useState(false);
  const baseCategories = cash.data?.categories?.length
    ? cash.data.categories
    : categoriesProp?.length
      ? categoriesProp
      : expenseCategories;
  const categories = useMemo(
    () => mergeById(baseCategories, createdCategories),
    [baseCategories, createdCategories]
  );
  const suppliers = useMemo(
    () => mergeById(suppliersQuery.data?.suppliers || [], extraSuppliers),
    [suppliersQuery.data, extraSuppliers]
  );
  const people = freelancersQuery.data?.people || [];
  const products = useMemo(
    () =>
      mergeById(inventory.data?.items || [], extraProducts).filter((item) => item.tipo !== 'combo'),
    [inventory.data, extraProducts]
  );
  const initialCategory = categories.find((item) => item.id === expense?.categoryId) || categories[0];
  const [form, setForm] = useState({
    date: editing ? cashFormDate(expense) : new Date().toISOString().slice(0, 10),
    supplier: expense?.supplier || '',
    supplierId: expense?.supplierId || '',
    freelancerId: expense?.freelancerId || '',
    categoryId: initialCategory?.id || 'bebidas',
    nature: expense?.nature || initialCategory?.defaultNature || 'variable',
    value: editing ? reaisInput(expense.amount) : '',
  });
  const [natureTouched, setNatureTouched] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const linkedPurchase =
    purchase ||
    (editing
      ? (inventory.data?.purchases || []).find((row) => String(row.expenseId) === String(expense?.id)) || null
      : null);
  const selectedCategory = categories.find((item) => item.id === form.categoryId) || categories[0];
  const party = expensePartyKind(form.categoryId);
  const buying = !editing && party !== 'freelancer' && lines.some((line) => line.produto_id);
  const calculated = useMemo(() => {
    const sum = lines.reduce((acc, line) => {
      const product = products.find((item) => String(item.id) === String(line.produto_id));
      const quantidade = Number(line.quantidade);
      if (!product || !Number.isInteger(quantidade) || quantidade <= 0) return acc;
      return acc + (parseMoneyToCents(product.valor_unitario || product.cost || 0) / 100) * quantidade;
    }, 0);
    return Math.round(sum * 100) / 100;
  }, [lines, products]);

  useEffect(() => {
    if (!buying || totalTouched) return;
    setTotal(calculated > 0 ? calculated.toFixed(2) : '');
  }, [calculated, buying, totalTouched]);

  function handleCategoryChange(categoryId) {
    const nextCategory = categories.find((item) => item.id === categoryId);
    const nextParty = expensePartyKind(categoryId);
    setForm((prev) => ({
      ...prev,
      categoryId,
      supplierId: nextParty === 'freelancer' ? '' : prev.supplierId,
      freelancerId: nextParty === 'freelancer' ? prev.freelancerId : '',
      nature: natureTouched ? prev.nature : nextCategory?.defaultNature || 'variable',
    }));
  }

  function handleCreatedCategory(created) {
    setCreatedCategories((prev) => mergeById(prev, [created]));
    setNatureTouched(false);
    setForm((prev) => ({
      ...prev,
      categoryId: created.id,
      freelancerId: '',
      nature: created.defaultNature || 'variable',
    }));
    queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (buying && !form.supplierId) {
      setError('Selecione o fornecedor.');
      return;
    }
    if (buying) {
      const itens = lines
        .filter((line) => line.produto_id)
        .map((line) => ({ produto_id: line.produto_id, quantidade: Number(line.quantidade) }));
      const manual = totalTouched ? parseReaisInput(total) : null;
      if (totalTouched && (!Number.isFinite(manual) || manual <= 0)) {
        setError('Valor total inválido.');
        return;
      }
      setSaving(true);
      setError('');
      try {
        await addPurchase({
          date: form.date,
          supplierId: form.supplierId,
          categoryId: form.categoryId,
          itens,
          valor_total: manual,
          nature: form.nature,
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
      return;
    }
    if (party === 'freelancer' && !form.freelancerId) {
      setError('Selecione o freelancer.');
      return;
    }
    const supplierName =
      party === 'freelancer'
        ? people.find((item) => String(item.id) === String(form.freelancerId))?.name || form.supplier
        : form.supplierId
          ? suppliers.find((item) => String(item.id) === String(form.supplierId))?.name || form.supplier
          : form.supplier;
    const supplierId = party === 'freelancer' ? null : form.supplierId || null;
    const freelancerId = party === 'freelancer' ? form.freelancerId : null;
    setSaving(true);
    setError('');
    try {
      const payload = {
        date: form.date,
        supplier: supplierName,
        supplierId,
        freelancerId,
        categoryId: form.categoryId,
        nature: form.nature,
        amount: Math.round(Number(form.value) * 100),
        recurrence: editing ? expense?.recurrence || null : null,
        source: expense?.source || 'manual',
      };
      if (editing) await editCashExpense(expense.id, payload);
      else await createCashExpense(payload);
      toast.success(editing ? 'Compra atualizada.' : 'Compra registrada.');
      onSuccess?.();
      onCancel();
    } catch (err) {
      const message = err?.message || (editing ? 'Não foi possível atualizar a compra.' : 'Não foi possível registrar a compra.');
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <Input
          label="Data"
          name="date"
          type="date"
          value={form.date}
          onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
          required
        />
        <div className="space-y-2">
          <FieldLabel required>Categoria</FieldLabel>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Dropdown
              className="min-w-0 flex-1"
              label="Categoria"
              muted
              value={form.categoryId}
              onChange={handleCategoryChange}
              options={categories.map((item) => ({ value: item.id, label: item.name }))}
            />
            <Button type="button" variant="secondary" onClick={() => setCreatingCategory(true)}>
              <Icon name="add" />
              Nova categoria
            </Button>
          </div>
        </div>
        {party !== 'freelancer' ? (
          <div className="space-y-2">
            <FieldLabel required={buying}>Fornecedor</FieldLabel>
            <div className="flex items-center gap-2">
              <Dropdown
                className="min-w-0 flex-1"
                label="Fornecedor"
                muted
                search
                placeholder="Nenhum"
                value={form.supplierId}
                onChange={(supplierId) => setForm((prev) => ({ ...prev, supplierId }))}
                options={[
                  { value: '', label: 'Nenhum' },
                  ...suppliers.map((item) => ({ value: item.id, label: item.name })),
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
            {suppliers.length ? null : (
              <p className="pl-1 text-[11px] text-on-surface-variant">Nenhum fornecedor cadastrado.</p>
            )}
          </div>
        ) : null}
        {editing && linkedPurchase?.itens?.length ? (
          <div className="space-y-2">
            <p className="pl-1 text-xs font-bold uppercase text-on-surface-variant font-label">Produtos</p>
            <p className="text-sm text-on-surface">
              {linkedPurchase.itens.map((item) => `${item.nome} × ${item.quantidade}`).join(', ')}
            </p>
          </div>
        ) : null}
        {!editing && party !== 'freelancer' ? (
          <div className="space-y-3">
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
                        search
                        placeholder="Selecione o produto"
                        value={line.produto_id}
                        onChange={(produtoId) =>
                          setLines((prev) =>
                            prev.map((row, rowIndex) => (rowIndex === index ? { ...row, produto_id: produtoId } : row))
                          )
                        }
                        options={products.map((item) => ({ value: item.id, label: item.nome || item.name }))}
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
                    required={Boolean(line.produto_id)}
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
            <Button type="button" variant="secondary" onClick={() => setLines((prev) => [...prev, { produto_id: '', quantidade: '1' }])}>
              <Icon name="add" />
              Adicionar produto
            </Button>
            <p className="text-sm text-on-surface-variant">Total dos itens {calculated.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>
        ) : null}
        {party === 'freelancer' ? (
          <div className="space-y-2">
            <FieldLabel required>Freelancer</FieldLabel>
            <Dropdown
              label="Freelancer"
              muted
              search
              placeholder="Selecione o freelancer"
              value={form.freelancerId}
              onChange={(freelancerId) => setForm((prev) => ({ ...prev, freelancerId }))}
              options={people.map((item) => ({ value: item.id, label: item.name }))}
            />
            {!people.length ? (
              <p className="pl-1 text-[11px] text-on-surface-variant">Nenhum freelancer cadastrado.</p>
            ) : (
              <p className="pl-1 text-[11px] text-on-surface-variant">
                A despesa grava o freelancer selecionado.
              </p>
            )}
          </div>
        ) : null}
        {party !== 'freelancer' && !form.supplierId ? (
          <div className="space-y-2">
            <Input
              label="Descrição"
              name="supplier"
              value={form.supplier}
              onChange={(event) => setForm((prev) => ({ ...prev, supplier: event.target.value }))}
              placeholder="Ex.: Conta de luz"
            />
          </div>
        ) : null}
        <div className="space-y-2">
          <FieldLabel>Natureza</FieldLabel>
          <SegmentedControl
            className="w-full"
            label="Natureza"
            items={[
              { id: 'fixed', label: 'Fixa' },
              { id: 'variable', label: 'Variável' },
            ]}
            value={form.nature}
            onChange={(nature) => {
              setNatureTouched(true);
              setForm((prev) => ({ ...prev, nature }));
            }}
          />
          <p className="pl-1 text-[11px] text-on-surface-variant">
            Default da categoria {selectedCategory?.name}:{' '}
            {selectedCategory?.defaultNature === 'fixed' ? 'Fixa' : 'Variável'}
          </p>
        </div>
        {buying ? (
          <Input
            label="Valor total (R$)"
            name="total"
            inputMode="decimal"
            value={total}
            onChange={(event) => {
              setTotalTouched(true);
              setTotal(event.target.value);
            }}
            required
          />
        ) : (
          <Input
            label="Valor (R$)"
            name="value"
            type="number"
            min="0"
            step="0.01"
            value={form.value}
            onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))}
            required
          />
        )}
        {error ? <p className="text-sm font-medium text-error">{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onCancel}>
            <Icon name="cancel" />
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            <Icon name={editing ? 'save' : 'add'} />
            {saving ? 'Salvando...' : editing ? 'Salvar' : 'Registrar'}
          </Button>
        </div>
      </form>
      {creatingCategory ? (
        <FieldModal title="Nova categoria" icon="category" onClose={() => setCreatingCategory(false)}>
          <CategoryNameForm onCancel={() => setCreatingCategory(false)} onSuccess={handleCreatedCategory} />
        </FieldModal>
      ) : null}
      {child?.kind === 'supplier' ? (
        <FieldModal title="Novo Fornecedor" icon="local_shipping" onClose={() => setChild(null)}>
          <NewSupplierForm
            onCancel={() => setChild(null)}
            onSuccess={(supplier) => {
              if (supplier?.id != null) {
                setExtraSuppliers((prev) => mergeById(prev, [supplier]));
                setForm((prev) => ({ ...prev, supplierId: supplier.id }));
                queryClient.invalidateQueries({ queryKey: ['suppliers'] });
              }
              setChild(null);
            }}
          />
        </FieldModal>
      ) : null}
      {child?.kind === 'product' ? (
        <FieldModal title="Novo produto" icon="inventory_2" wide onClose={() => setChild(null)}>
          <ProductForm
            categories={inventory.data?.filters}
            onCancel={() => setChild(null)}
            onSuccess={(item) => {
              if (item?.id) {
                setExtraProducts((prev) => mergeById(prev, [item]));
                const lineIndex = child.lineIndex;
                setLines((prev) =>
                  prev.map((row, index) => (index === lineIndex ? { ...row, produto_id: item.id } : row))
                );
                queryClient.invalidateQueries({ queryKey: ['inventory'] });
              }
              setChild(null);
            }}
          />
        </FieldModal>
      ) : null}
    </>
  );
}
