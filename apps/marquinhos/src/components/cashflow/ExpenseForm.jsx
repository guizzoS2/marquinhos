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
  addExpenseSubtype,
  addPurchase,
  createCashExpense,
  createExpenseCategory,
  deleteExpenseSubtype,
  editCashExpense,
  editExpenseSubtype,
  fetchCashFlow,
  fetchFreelancers,
  fetchInventory,
  fetchStaff,
  fetchSuppliers,
} from '../../services/dashboardService';
import { parseReaisInput } from '../../services/inventoryProduct';
import { expensePartyKind, parseCashFlowDate, parseMoneyToCents, toIsoDate } from '../../services/cashFlowUtils';
import { activeExpenseTypes, categoryAllowsSubtypes, expensePartyOf } from '../../services/catalogTaxonomy';
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
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState('sem');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const created = await createExpenseCategory(name, { allowsSubtypes: mode === 'com', description });
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
      <div className="space-y-2">
        <label htmlFor="nova-categoria-descricao" className="pl-1 text-xs font-label font-bold uppercase text-on-surface-variant">
          Descrição
        </label>
        <textarea
          id="nova-categoria-descricao"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Opcional"
          rows={3}
          className="min-h-11 w-full rounded-2xl border border-outline bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface outline-none placeholder:font-normal placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-0"
        />
      </div>
      <SegmentedControl
        className="w-full"
        label="Subcategoria"
        items={[
          { id: 'sem', label: 'Sem subcategoria' },
          { id: 'com', label: 'Com subcategoria' },
        ]}
        value={mode}
        onChange={setMode}
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

function QuickName({ label, initial = '', submitLabel, onSubmit, onCancel }) {
  const toast = useToast();
  const [name, setName] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit(name);
      onCancel();
    } catch (err) {
      const message = err?.message || 'Não foi possível salvar.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Input label={label} value={name} onChange={(event) => setName(event.target.value)} required />
      {error ? <p className="text-sm font-medium text-error">{error}</p> : null}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" type="button" onClick={onCancel}>
          <Icon name="cancel" />
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          <Icon name="save" />
          {saving ? 'Salvando...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function ExpenseForm({
  onSuccess,
  onCancel,
  categories: categoriesProp,
  expense = null,
  purchase = null,
  categoryId: categoryIdProp = '',
  staffId: staffIdProp = '',
  staffPayment = false,
}) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const editing = Boolean(expense?.id);
  const cash = useQuery({ queryKey: ['cash-flow'], queryFn: fetchCashFlow });
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: fetchSuppliers });
  const freelancersQuery = useQuery({ queryKey: ['freelancers'], queryFn: fetchFreelancers });
  const inventory = useQuery({ queryKey: ['inventory'], queryFn: fetchInventory });
  const staffQuery = useQuery({ queryKey: ['staff'], queryFn: fetchStaff });
  const [createdCategories, setCreatedCategories] = useState([]);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [child, setChild] = useState(null);
  const [extraProducts, setExtraProducts] = useState([]);
  const [extraSuppliers, setExtraSuppliers] = useState([]);
  const [extraSubtypes, setExtraSubtypes] = useState([]);
  const [hiddenSubtypeIds, setHiddenSubtypeIds] = useState([]);
  const [draft, setDraft] = useState(null);
  const [lines, setLines] = useState([{ produto_id: '', quantidade: '1' }]);
  const [total, setTotal] = useState('');
  const [totalTouched, setTotalTouched] = useState(false);
  const baseCategories = cash.data?.categories?.length
    ? cash.data.categories
    : categoriesProp?.length
      ? categoriesProp
      : expenseCategories;
  const categories = useMemo(() => {
    const merged = mergeById(baseCategories, createdCategories);
    const visible = activeExpenseTypes(merged);
    const current = merged.find((item) => item.id === expense?.categoryId);
    if (current && !visible.some((item) => item.id === current.id)) return [current, ...visible];
    return visible.length ? visible : merged;
  }, [baseCategories, createdCategories, expense?.categoryId]);
  const suppliers = useMemo(
    () => mergeById(suppliersQuery.data?.suppliers || [], extraSuppliers),
    [suppliersQuery.data, extraSuppliers]
  );
  const people = freelancersQuery.data?.people || [];
  const staffMembers = useMemo(
    () => (staffQuery.data || []).filter((item) => item?.id && item?.name),
    [staffQuery.data]
  );
  const products = useMemo(
    () =>
      mergeById(inventory.data?.items || [], extraProducts).filter((item) => item.tipo !== 'combo'),
    [inventory.data, extraProducts]
  );
  const initialCategory =
    categories.find((item) => item.id === (expense?.categoryId || categoryIdProp)) || categories[0];
  const [form, setForm] = useState({
    date: editing ? cashFormDate(expense) : new Date().toISOString().slice(0, 10),
    supplier: expense?.supplier || '',
    supplierId: expense?.supplierId || '',
    freelancerId: expense?.freelancerId || '',
    staffId: expense?.staffId || staffIdProp || '',
    payeeId: expense?.payeeId || '',
    categoryId: initialCategory?.id || 'compra_estoque',
    subtypeId: expense?.subtypeId || '',
    description: expense?.description || '',
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
  const categoryChoices = staffPayment
    ? categories.filter((item) => item.id === 'funcionarios')
    : categories;
  const selectedCategory =
    categoryChoices.find((item) => item.id === form.categoryId) ||
    (staffPayment ? categories.find((item) => item.id === 'funcionarios') : null) ||
    categoryChoices[0] ||
    categories[0];
  const party = expensePartyOf(selectedCategory) || expensePartyKind(form.categoryId);
  const stockParty = party === 'supplier';
  const subtypeBase = selectedCategory?.subtypes || [];
  const subtypeOverlay = extraSubtypes.filter((item) => item.categoryId === form.categoryId);
  const subtypeById = new Map(subtypeOverlay.map((item) => [item.id, item]));
  const subtypes = [
    ...subtypeBase.map((item) => subtypeById.get(item.id) || item),
    ...subtypeOverlay.filter((item) => !subtypeBase.some((row) => row.id === item.id)),
  ].filter((item) => !hiddenSubtypeIds.includes(item.id));
  const buying = !editing && stockParty && lines.some((line) => line.produto_id);
  const calculated = useMemo(() => {
    const sum = lines.reduce((acc, line) => {
      const product = products.find((item) => String(item.id) === String(line.produto_id));
      const quantidade = Number(line.quantidade);
      if (!product || !Number.isInteger(quantidade) || quantidade <= 0) return acc;
      const unit =
        product.custo_compra != null && String(product.custo_compra).trim() !== ''
          ? product.custo_compra
          : product.valor_unitario || product.cost || 0;
      return acc + (parseMoneyToCents(unit) / 100) * quantidade;
    }, 0);
    return Math.round(sum * 100) / 100;
  }, [lines, products]);

  useEffect(() => {
    if (!buying || totalTouched) return;
    setTotal(calculated > 0 ? calculated.toFixed(2) : '');
  }, [calculated, buying, totalTouched]);

  useEffect(() => {
    if (!staffPayment || form.categoryId === 'funcionarios') return;
    setForm((prev) => ({ ...prev, categoryId: 'funcionarios', subtypeId: '' }));
  }, [staffPayment, form.categoryId]);

  useEffect(() => {
    if (party !== 'staff' || !staffMembers.length) return;
    setForm((prev) => {
      if (prev.staffId) {
        const chosen = staffMembers.find((item) => String(item.id) === String(prev.staffId));
        if (!chosen || prev.supplier === chosen.name) return prev;
        return { ...prev, supplier: chosen.name };
      }
      const named = String(prev.supplier || '').trim().toLowerCase();
      if (!named) return prev;
      const match = staffMembers.find((item) => item.name.trim().toLowerCase() === named);
      if (!match) return prev;
      return { ...prev, staffId: match.id, supplier: match.name };
    });
  }, [party, staffMembers]);

  function handleCategoryChange(categoryId) {
    if (staffPayment) return;
    const nextCategory = categories.find((item) => item.id === categoryId);
    const nextParty = expensePartyOf(nextCategory);
    setForm((prev) => {
      const prevParty = expensePartyKind(prev.categoryId);
      const crossedStaff = nextParty === 'staff' || prevParty === 'staff';
      return {
        ...prev,
        categoryId,
        subtypeId: '',
        description: nextParty === 'staff' || nextParty === 'freelancer' ? '' : prev.description,
        supplier: nextParty === 'staff' && prevParty === 'staff' ? prev.supplier : crossedStaff ? '' : prev.supplier,
        staffId: nextParty === 'staff' && prevParty === 'staff' ? prev.staffId : '',
        payeeId: nextParty === 'staff' && prevParty === 'staff' ? prev.payeeId : '',
        supplierId: nextParty === 'freelancer' || nextParty === 'staff' ? '' : prev.supplierId,
        freelancerId: nextParty === 'freelancer' ? prev.freelancerId : '',
        nature: natureTouched ? prev.nature : nextCategory?.defaultNature || 'variable',
      };
    });
    if (nextParty === 'staff') setLines([{ produto_id: '', quantidade: '1' }]);
  }

  async function saveSubtype(name, currentId) {
    const saved = currentId
      ? await editExpenseSubtype(form.categoryId, currentId, name)
      : await addExpenseSubtype(form.categoryId, name);
    setExtraSubtypes((prev) => [
      ...prev.filter((item) => item.id !== saved.id),
      { ...saved, categoryId: form.categoryId },
    ]);
    setForm((prev) => ({
      ...prev,
      subtypeId: saved.id,
      nature: natureTouched || currentId ? prev.nature : saved.defaultNature || prev.nature,
    }));
    queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
    toast.success(currentId ? 'Subcategoria atualizada.' : 'Subcategoria criada.');
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
          description: form.description,
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
    if (party === 'staff' && !form.staffId) {
      setError('Selecione o funcionário da equipe.');
      return;
    }
    const staffPerson = staffMembers.find((item) => String(item.id) === String(form.staffId));
    const supplierName =
      party === 'freelancer'
        ? people.find((item) => String(item.id) === String(form.freelancerId))?.name || form.supplier
        : party === 'staff'
          ? staffPerson?.name || String(form.supplier || '').trim()
          : form.supplierId
            ? suppliers.find((item) => String(item.id) === String(form.supplierId))?.name || form.supplier
            : form.supplier;
    const supplierId = party === 'freelancer' || party === 'staff' ? null : form.supplierId || null;
    const freelancerId = party === 'freelancer' ? form.freelancerId : null;
    setSaving(true);
    setError('');
    try {
      const payload = {
        date: form.date,
        supplier: supplierName,
        supplierId,
        freelancerId,
        staffId: party === 'staff' ? form.staffId || null : null,
        payeeId: party === 'staff' ? null : form.payeeId || null,
        categoryId: form.categoryId,
        subtypeId: form.subtypeId || null,
        description: form.description,
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
              value={staffPayment ? 'funcionarios' : form.categoryId}
              onChange={handleCategoryChange}
              options={(categoryChoices.length ? categoryChoices : [{ id: 'funcionarios', name: 'Funcionários' }]).map(
                (item) => ({ value: item.id, label: item.name })
              )}
            />
            {staffPayment ? null : (
              <Button type="button" variant="secondary" onClick={() => setCreatingCategory(true)}>
                <Icon name="add" />
                Nova categoria
              </Button>
            )}
          </div>
        </div>
        {stockParty ? (
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
        {!editing && stockParty ? (
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
        {categoryAllowsSubtypes(selectedCategory) ? (
        <div className="space-y-2">
          <FieldLabel>Subcategoria</FieldLabel>
          <div className="flex items-center gap-2">
            <Dropdown
              className="min-w-0 flex-1"
              label="Subcategoria"
              muted
              search
              value={form.subtypeId}
              onChange={(subtypeId) => {
                const subtype = subtypes.find((item) => item.id === subtypeId);
                setForm((prev) => ({
                  ...prev,
                  subtypeId,
                  nature: natureTouched ? prev.nature : subtype?.defaultNature || prev.nature,
                }));
              }}
              options={[{ value: '', label: 'Nenhum' }, ...subtypes.map((item) => ({ value: item.id, label: item.name }))]}
            />
            <Button
              type="button"
              size="icon"
              className="shrink-0"
              aria-label="Nova subcategoria"
              onClick={() => setDraft({ kind: 'subtype' })}
            >
              <Icon name="add" />
            </Button>
            {form.subtypeId ? (
              <>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="shrink-0"
                  aria-label="Editar subcategoria"
                  onClick={() => setDraft({ kind: 'subtype', subtype: subtypes.find((item) => item.id === form.subtypeId) })}
                >
                  <Icon name="edit" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="danger"
                  className="shrink-0"
                  aria-label="Excluir subcategoria"
                  onClick={() => {
                    const subtype = subtypes.find((item) => item.id === form.subtypeId);
                    if (!subtype) return;
                    setDraft({
                      kind: 'confirm',
                      message: `Excluir a subcategoria "${subtype.name}"?`,
                      run: async () => {
                        await deleteExpenseSubtype(form.categoryId, subtype.id);
                        setHiddenSubtypeIds((prev) => [...prev, subtype.id]);
                        setForm((prev) => (prev.subtypeId === subtype.id ? { ...prev, subtypeId: '' } : prev));
                        queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
                        toast.success('Subcategoria excluída.');
                      },
                    });
                  }}
                >
                  <Icon name="delete" />
                </Button>
              </>
            ) : null}
          </div>
        </div>
        ) : null}
        {party === 'staff' ? (
          <div className="space-y-2">
            <FieldLabel required>Funcionário</FieldLabel>
            <Dropdown
              label="Funcionário"
              muted
              search
              placeholder="Selecione o funcionário"
              value={form.staffId}
              onChange={(staffId) => {
                const person = staffMembers.find((item) => String(item.id) === String(staffId));
                setForm((prev) => ({ ...prev, staffId, supplier: person?.name || '' }));
              }}
              options={staffMembers
                .filter((item) => !item.disabled || String(item.id) === String(form.staffId))
                .map((item) => ({ value: item.id, label: item.name }))}
            />
          </div>
        ) : null}
        {party === 'none' || stockParty ? (
          <Input
            label="Descrição"
            name="description"
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Ex.: Conta de luz"
          />
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
            Padrão da categoria {selectedCategory?.name}:{' '}
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
        <FieldModal title="Novo fornecedor" icon="local_shipping" onClose={() => setChild(null)}>
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
      {draft?.kind === 'subtype' ? (
        <FieldModal
          title={draft.subtype ? 'Editar subcategoria' : 'Nova subcategoria'}
          icon="category"
          onClose={() => setDraft(null)}
        >
          <QuickName
            label="Nome da subcategoria"
            initial={draft.subtype?.name || ''}
            submitLabel={draft.subtype ? 'Salvar' : 'Criar subcategoria'}
            onCancel={() => setDraft(null)}
            onSubmit={(name) => saveSubtype(name, draft.subtype?.id)}
          />
        </FieldModal>
      ) : null}
      {draft?.kind === 'confirm' ? (
        <FieldModal title="Excluir" icon="delete" onClose={() => setDraft(null)}>
          <ConfirmDraft
            message={draft.message}
            onCancel={() => setDraft(null)}
            onConfirm={draft.run}
          />
        </FieldModal>
      ) : null}
    </>
  );
}

function ConfirmDraft({ message, onCancel, onConfirm }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    setSaving(true);
    try {
      await onConfirm();
      onCancel();
    } catch (err) {
      toast.error(err?.message || 'Não foi possível excluir.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="font-body leading-relaxed text-on-surface-variant">{message}</p>
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" type="button" onClick={onCancel}>
          <Icon name="cancel" />
          Cancelar
        </Button>
        <Button variant="danger" type="button" onClick={handleConfirm} disabled={saving}>
          <Icon name="delete" />
          {saving ? 'Processando...' : 'Excluir'}
        </Button>
      </div>
    </div>
  );
}
