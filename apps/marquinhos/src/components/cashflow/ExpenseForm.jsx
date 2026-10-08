import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { FieldModal } from '../ui/FieldModal';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import { SegmentedControl } from '../ui/SegmentedControl';
import { useToast } from '../../contexts/ToastContext';
import {
  createCashExpense,
  createExpenseCategory,
  editCashExpense,
  fetchCashFlow,
  fetchFreelancers,
  fetchSuppliers,
} from '../../services/dashboardService';
import { expensePartyKind, parseCashFlowDate, toIsoDate } from '../../services/cashFlowUtils';
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

export function ExpenseForm({ onSuccess, onCancel, categories: categoriesProp, expense = null }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const editing = Boolean(expense?.id);
  const cash = useQuery({ queryKey: ['cash-flow'], queryFn: fetchCashFlow });
  const suppliersQuery = useQuery({ queryKey: ['suppliers'], queryFn: fetchSuppliers });
  const freelancersQuery = useQuery({ queryKey: ['freelancers'], queryFn: fetchFreelancers });
  const [createdCategories, setCreatedCategories] = useState([]);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const baseCategories = cash.data?.categories?.length
    ? cash.data.categories
    : categoriesProp?.length
      ? categoriesProp
      : expenseCategories;
  const categories = useMemo(
    () => mergeById(baseCategories, createdCategories),
    [baseCategories, createdCategories]
  );
  const suppliers = suppliersQuery.data?.suppliers || [];
  const people = freelancersQuery.data?.people || [];
  const initialCategory = categories.find((item) => item.id === expense?.categoryId) || categories[0];
  const [form, setForm] = useState({
    date: editing ? cashFormDate(expense) : new Date().toISOString().slice(0, 10),
    supplier: expense?.supplier || '',
    supplierId: expense?.supplierId || '',
    freelancerId: expense?.freelancerId || '',
    categoryId: initialCategory?.id || 'bebidas',
    nature: expense?.nature || initialCategory?.defaultNature || 'variable',
    value: editing ? reaisInput(expense.amount) : '',
    recurrence: expense?.recurrence || '',
  });
  const [natureTouched, setNatureTouched] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedCategory = categories.find((item) => item.id === form.categoryId) || categories[0];
  const party = expensePartyKind(form.categoryId);

  function handleCategoryChange(categoryId) {
    const nextCategory = categories.find((item) => item.id === categoryId);
    const nextParty = expensePartyKind(categoryId);
    setForm((prev) => ({
      ...prev,
      categoryId,
      supplierId: nextParty === 'supplier' ? prev.supplierId : '',
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
      supplierId: '',
      freelancerId: '',
      nature: created.defaultNature || 'variable',
    }));
    queryClient.invalidateQueries({ queryKey: ['cash-flow'] });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (party === 'supplier' && !form.supplierId) {
      setError('Selecione o fornecedor.');
      return;
    }
    if (party === 'freelancer' && !form.freelancerId) {
      setError('Selecione o freelancer.');
      return;
    }
    if (party === 'none' && !String(form.supplier || '').trim()) {
      setError('Informe a descrição.');
      return;
    }
    const sameCategory = editing && form.categoryId === expense?.categoryId;
    const sameLabel = String(form.supplier || '').trim() === String(expense?.supplier || '').trim();
    const supplierName =
      party === 'supplier'
        ? suppliers.find((item) => String(item.id) === String(form.supplierId))?.name || form.supplier
        : party === 'freelancer'
          ? people.find((item) => String(item.id) === String(form.freelancerId))?.name || form.supplier
          : form.supplier;
    let supplierId = null;
    let freelancerId = null;
    if (party === 'supplier') supplierId = form.supplierId;
    else if (party === 'freelancer') freelancerId = form.freelancerId;
    else if (sameCategory && sameLabel && expense?.supplierId) supplierId = expense.supplierId;
    else if (sameCategory && sameLabel && expense?.freelancerId) freelancerId = expense.freelancerId;
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
        recurrence: form.recurrence || null,
        source: expense?.source || 'manual',
      };
      if (editing) await editCashExpense(expense.id, payload);
      else await createCashExpense(payload);
      toast.success(editing ? 'Despesa atualizada.' : 'Despesa registrada.');
      onSuccess?.();
      onCancel();
    } catch (err) {
      const message = err?.message || (editing ? 'Não foi possível atualizar a despesa.' : 'Não foi possível registrar a despesa.');
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
          <label className="pl-1 text-xs font-bold uppercase text-on-surface-variant font-label">
            Categoria
          </label>
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
        {party === 'supplier' ? (
          <div className="space-y-2">
            <label className="pl-1 text-xs font-bold uppercase text-on-surface-variant font-label">
              Fornecedor
            </label>
            <Dropdown
              label="Fornecedor"
              muted
              placeholder="Selecione o fornecedor"
              value={form.supplierId}
              onChange={(supplierId) => setForm((prev) => ({ ...prev, supplierId }))}
              options={suppliers.map((item) => ({ value: item.id, label: item.name }))}
            />
            {!suppliers.length ? (
              <p className="pl-1 text-[11px] text-on-surface-variant">Nenhum fornecedor cadastrado.</p>
            ) : (
              <p className="pl-1 text-[11px] text-on-surface-variant">
                A despesa grava o fornecedor selecionado.
              </p>
            )}
          </div>
        ) : null}
        {party === 'freelancer' ? (
          <div className="space-y-2">
            <label className="pl-1 text-xs font-bold uppercase text-on-surface-variant font-label">
              Freelancer
            </label>
            <Dropdown
              label="Freelancer"
              muted
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
        {party === 'none' ? (
          <Input
            label="Descrição"
            name="supplier"
            value={form.supplier}
            onChange={(event) => setForm((prev) => ({ ...prev, supplier: event.target.value }))}
            placeholder="Ex.: Conta de luz"
            required
          />
        ) : null}
        <div className="space-y-2">
          <label className="pl-1 text-xs font-bold uppercase text-on-surface-variant font-label">
            Natureza
          </label>
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
        <div className="space-y-2">
          <label className="pl-1 text-xs font-bold uppercase text-on-surface-variant font-label">
            Recorrência
          </label>
          <Dropdown
            label="Recorrência"
            muted
            value={form.recurrence}
            onChange={(recurrence) => setForm((prev) => ({ ...prev, recurrence }))}
            options={[
              { value: '', label: 'Única' },
              { value: 'monthly', label: 'Mensal' },
            ]}
          />
        </div>
        {error ? <p className="text-sm font-medium text-error">{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" type="button" onClick={onCancel}>
            <Icon name="cancel" />
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            <Icon name={editing ? 'save' : 'add'} />
            {saving ? 'Salvando...' : editing ? 'Salvar' : 'Registrar despesa'}
          </Button>
        </div>
      </form>
      {creatingCategory ? (
        <FieldModal title="Nova categoria" icon="category" onClose={() => setCreatingCategory(false)}>
          <CategoryNameForm onCancel={() => setCreatingCategory(false)} onSuccess={handleCreatedCategory} />
        </FieldModal>
      ) : null}
    </>
  );
}
