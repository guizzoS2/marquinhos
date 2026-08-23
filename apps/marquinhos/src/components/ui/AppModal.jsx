import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Icon } from './Icon';
import { Button } from './Button';
import { Input } from './Input';
import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  createCashExpense,
  createCashIncome,
  createFreelancer,
  createSupplier,
  fetchCashFlow,
  fetchInventory,
  fetchSuppliers,
  addStockEntry,
} from '../../services/dashboardService';
import { expenseCategories } from '../../services/fallbacks';
import { isStockRole } from '../../services/roles';
import { ProductForm } from '../inventory/ProductForm';

const titles = {
  'new-order': 'Nova Venda',
  'stock-entry': 'Entrada de Mercadoria',
  'new-product': 'Novo produto',
  'edit-product': 'Editar produto',
  'new-daily': 'Nova Diária',
  'new-freelancer': 'Novo Freelancer',
  'new-supplier': 'Novo Fornecedor',
  'supplier-detail': 'Histórico do fornecedor',
  'new-expense': 'Nova Despesa',
  'import-statement': 'Importar Extrato',
  confirm: 'Confirmar ação',
};

function NewFreelancerForm({ onSuccess, onCancel }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: '',
    role: 'Barman',
    dailyRate: '',
    status: 'available',
    image: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createFreelancer(form);
      toast.success('Freelancer cadastrado com sucesso.');
      onSuccess?.();
      onCancel();
    } catch {
      setError('Não foi possível cadastrar o freelancer.');
      toast.error('Falha ao cadastrar freelancer.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <Input
        label="Nome completo"
        name="name"
        value={form.name}
        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        required
      />
      <Input
        label="Função / especialidade"
        name="role"
        value={form.role}
        onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
        required
      />
      <Input
        label="Valor da diária (R$)"
        name="dailyRate"
        type="number"
        min="0"
        step="0.01"
        value={form.dailyRate}
        onChange={(e) => setForm((prev) => ({ ...prev, dailyRate: e.target.value }))}
        required
      />
      <div className="space-y-2">
        <label className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1">
          Status inicial
        </label>
        <select
          className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11 text-on-surface focus:ring-2 focus:ring-primary-container transition-all appearance-none"
          value={form.status}
          onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
        >
          <option value="available">Disponível</option>
          <option value="on_shift">Em turno</option>
          <option value="pending_payment">Pendente pagamento</option>
        </select>
      </div>
      <Input
        label="URL da foto (opcional)"
        name="image"
        value={form.image}
        onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
      />
      {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Adicionar freelancer'}
        </Button>
      </div>
    </form>
  );
}

function NewSupplierForm({ onSuccess, onCancel }) {
  const toast = useToast();
  const [form, setForm] = useState({
    name: '',
    contact: '',
    cnpj: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createSupplier(form);
      toast.success('Fornecedor cadastrado.');
      onSuccess?.();
      onCancel();
    } catch {
      setError('Não foi possível cadastrar o fornecedor.');
      toast.error('Falha ao cadastrar fornecedor.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <Input
        label="Nome"
        name="name"
        value={form.name}
        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
        required
      />
      <Input
        label="Contato"
        name="contact"
        value={form.contact}
        onChange={(e) => setForm((prev) => ({ ...prev, contact: e.target.value }))}
        required
      />
      <Input
        label="CNPJ"
        name="cnpj"
        value={form.cnpj}
        onChange={(e) => setForm((prev) => ({ ...prev, cnpj: e.target.value }))}
        required
      />
      {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Adicionar fornecedor'}
        </Button>
      </div>
    </form>
  );
}

function SupplierDetailView({ supplierId, fallbackSupplier, onCancel }) {
  const { data } = useQuery({
    queryKey: ['suppliers'],
    queryFn: fetchSuppliers,
  });
  const supplier =
    (data?.suppliers || []).find((item) => String(item.id) === String(supplierId)) ||
    fallbackSupplier;

  if (!supplier) {
    return <p className="text-on-surface-variant">Fornecedor não encontrado.</p>;
  }

  const history = supplier.history || [];

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1 sm:col-span-2">
          <dt className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest">
            Nome
          </dt>
          <dd className="font-headline font-bold text-on-surface">{supplier.name}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest">
            Contato
          </dt>
          <dd className="text-on-surface">{supplier.contact || '—'}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest">
            CNPJ
          </dt>
          <dd className="text-on-surface">{supplier.cnpj || '—'}</dd>
        </div>
      </dl>

      <div className="space-y-3">
        <h4 className="font-headline font-bold text-on-surface">Histórico de compras</h4>
        <div className="overflow-x-auto rounded-xl border border-outline-variant/20">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low text-on-surface-variant font-medium">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {history.map((row) => (
                <tr key={row.id || `${row.date}-${row.value}`}>
                  <td className="px-4 py-3 text-on-surface-variant">{row.date}</td>
                  <td className="px-4 py-3 text-on-surface">{row.category}</td>
                  <td className="px-4 py-3 text-right font-bold text-error">{row.value}</td>
                </tr>
              ))}
              {!history.length ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-on-surface-variant">
                    Nenhuma compra vinculada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onCancel}>Fechar</Button>
      </div>
    </div>
  );
}

function NewExpenseForm({ onSuccess, onCancel, categories: categoriesProp }) {
  const toast = useToast();
  const categories = categoriesProp?.length ? categoriesProp : expenseCategories;
  const initialCategory = categories[0];
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: fetchSuppliers,
  });
  const suppliers = suppliersData?.suppliers || [];
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    supplier: '',
    supplierId: '',
    categoryId: initialCategory?.id || 'bebidas',
    nature: initialCategory?.defaultNature || 'variable',
    value: '',
    recurrence: '',
  });
  const [natureTouched, setNatureTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectedCategory =
    categories.find((item) => item.id === form.categoryId) || categories[0];

  function handleCategoryChange(categoryId) {
    const nextCategory = categories.find((item) => item.id === categoryId);
    setForm((prev) => ({
      ...prev,
      categoryId,
      nature: natureTouched ? prev.nature : nextCategory?.defaultNature || 'variable',
    }));
  }

  function handleSupplierSelect(supplierId) {
    const selected = suppliers.find((item) => String(item.id) === String(supplierId));
    setForm((prev) => ({
      ...prev,
      supplierId,
      supplier: selected ? selected.name : prev.supplier,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createCashExpense({
        date: form.date,
        supplier: form.supplier,
        supplierId: form.supplierId || null,
        categoryId: form.categoryId,
        nature: form.nature,
        amount: Math.round(Number(form.value) * 100),
        recurrence: form.recurrence || null,
        source: 'manual',
      });
      toast.success('Despesa registrada.');
      onSuccess?.();
      onCancel();
    } catch {
      setError('Não foi possível registrar a despesa.');
      toast.error('Falha ao registrar despesa.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <Input
        label="Data"
        name="date"
        type="date"
        value={form.date}
        onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
        required
      />
      <div className="space-y-2">
        <label className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1">
          Fornecedor cadastrado
        </label>
        <select
          className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11 text-on-surface focus:ring-2 focus:ring-primary-container transition-all appearance-none"
          value={form.supplierId}
          onChange={(e) => handleSupplierSelect(e.target.value)}
        >
          <option value="">Nenhum / avulso</option>
          {suppliers.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-on-surface-variant pl-1">
          Marcar um fornecedor atualiza a última compra e o valor na lista.
        </p>
      </div>
      <Input
        label="Fornecedor / descrição"
        name="supplier"
        value={form.supplier}
        onChange={(e) =>
          setForm((prev) => ({ ...prev, supplier: e.target.value, supplierId: prev.supplierId }))
        }
        required
      />
      <div className="space-y-2">
        <label className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1">
          Categoria
        </label>
        <select
          className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11 text-on-surface focus:ring-2 focus:ring-primary-container transition-all appearance-none"
          value={form.categoryId}
          onChange={(e) => handleCategoryChange(e.target.value)}
        >
          {categories.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1">
          Natureza
        </label>
        <div className="flex gap-2 p-1 bg-surface-container-low rounded-2xl">
          {[
            { id: 'fixed', label: 'Fixa' },
            { id: 'variable', label: 'Variável' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setNatureTouched(true);
                setForm((prev) => ({ ...prev, nature: item.id }));
              }}
              className={
                form.nature === item.id
                  ? 'flex-1 px-4 py-2 min-h-11 rounded-xl bg-primary text-on-primary font-semibold'
                  : 'flex-1 px-4 py-2 min-h-11 rounded-xl text-on-surface-variant'
              }
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-on-surface-variant pl-1">
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
        onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value }))}
        required
      />
      <div className="space-y-2">
        <label className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1">
          Recorrência
        </label>
        <select
          className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11 text-on-surface focus:ring-2 focus:ring-primary-container transition-all appearance-none"
          value={form.recurrence}
          onChange={(e) => setForm((prev) => ({ ...prev, recurrence: e.target.value }))}
        >
          <option value="">Única</option>
          <option value="monthly">Mensal</option>
        </select>
      </div>
      {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Registrar despesa'}
        </Button>
      </div>
    </form>
  );
}

function NewOrderForm({ onSuccess, onCancel }) {
  const toast = useToast();
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    category: 'Varejo',
    value: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createCashIncome({
        date: form.date,
        description: form.description,
        category: form.category,
        categoryIcon: form.category === 'Eventos' ? 'celebration' : 'payments',
        categoryTone: form.category === 'Eventos' ? 'tertiary' : 'secondary',
        amount: Math.round(Number(form.value) * 100),
      });
      toast.success('Venda registrada no fluxo de caixa.');
      onSuccess?.();
      onCancel();
    } catch {
      setError('Não foi possível registrar a venda.');
      toast.error('Falha ao registrar venda.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <Input
        label="Data"
        type="date"
        value={form.date}
        onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
        required
      />
      <Input
        label="Descrição"
        value={form.description}
        onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
        placeholder="Ex.: Vendas PDV (Cartão)"
        required
      />
      <div className="space-y-2">
        <label className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1">
          Categoria
        </label>
        <select
          className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11 text-on-surface focus:ring-2 focus:ring-primary-container transition-all appearance-none"
          value={form.category}
          onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
        >
          <option>Varejo</option>
          <option>Eventos</option>
          <option>Reservas</option>
        </select>
      </div>
      <Input
        label="Valor (R$)"
        type="number"
        min="0"
        step="0.01"
        value={form.value}
        onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value }))}
        required
      />
      {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Confirmar venda'}
        </Button>
      </div>
    </form>
  );
}

function StockEntryForm({ onSuccess, onCancel, items: itemsProp }) {
  const toast = useToast();
  const { user } = useAuth();
  const stockOnly = isStockRole(user?.role);
  const [items, setItems] = useState(itemsProp || []);
  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: fetchSuppliers,
    enabled: !stockOnly,
  });
  const suppliers = suppliersData?.suppliers || [];
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    itemId: '',
    quantity: '',
    supplierId: '',
    value: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (itemsProp?.length) {
      setItems(itemsProp);
      setForm((prev) => ({ ...prev, itemId: String(itemsProp[0].id) }));
      return;
    }
    let active = true;
    fetchInventory().then((data) => {
      if (!active) return;
      setItems(data.items || []);
      if (data.items?.[0]) {
        setForm((prev) => ({ ...prev, itemId: String(data.items[0].id) }));
      }
    });
    return () => {
      active = false;
    };
  }, [itemsProp]);

  function selectedSupplier() {
    return suppliers.find((item) => String(item.id) === String(form.supplierId));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (stockOnly) {
        await addStockEntry({
          date: form.date,
          itemId: form.itemId,
          quantity: Number(form.quantity),
          linkCash: false,
        });
        toast.success('Entrada lançada no estoque.');
      } else {
        const supplier = selectedSupplier();
        if (!supplier) {
          throw new Error('Selecione um fornecedor.');
        }
        await addStockEntry({
          date: form.date,
          itemId: form.itemId,
          quantity: Number(form.quantity),
          supplierId: form.supplierId,
          supplier: supplier.name,
          amount: Math.round(Number(form.value) * 100),
          linkCash: true,
        });
        toast.success('Entrada lançada no estoque e em Saídas.');
      }
      onSuccess?.();
      onCancel();
    } catch (err) {
      const message = err?.message || 'Não foi possível registrar a entrada.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <Input
        label="Data da compra"
        type="date"
        value={form.date}
        onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
        required
      />
      <div className="space-y-2">
        <label className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1">
          Produto
        </label>
        <select
          className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11 text-on-surface focus:ring-2 focus:ring-primary-container transition-all appearance-none"
          value={form.itemId}
          onChange={(e) => setForm((prev) => ({ ...prev, itemId: e.target.value }))}
          required
        >
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} — atual: {item.stock}
            </option>
          ))}
        </select>
      </div>
      <Input
        label="Quantidade de entrada"
        type="number"
        min="1"
        step="1"
        value={form.quantity}
        onChange={(e) => setForm((prev) => ({ ...prev, quantity: e.target.value }))}
        required
      />
      {stockOnly ? null : (
        <>
          <div className="space-y-2">
            <label className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1">
              Fornecedor
            </label>
            <select
              className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11 text-on-surface focus:ring-2 focus:ring-primary-container transition-all appearance-none"
              value={form.supplierId}
              onChange={(e) => setForm((prev) => ({ ...prev, supplierId: e.target.value }))}
              required
            >
              <option value="">Selecione o fornecedor</option>
              {suppliers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="Valor da compra (R$)"
            type="number"
            min="0"
            step="0.01"
            value={form.value}
            onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value }))}
            required
          />
          <p className="text-[11px] text-on-surface-variant pl-1">
            A compra entra como saída variável no fluxo de caixa e atualiza a última compra do
            fornecedor.
          </p>
        </>
      )}
      {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving || !items.length}>
          {saving ? 'Salvando...' : 'Confirmar entrada'}
        </Button>
      </div>
    </form>
  );
}

function ConfirmForm({ payload, onCancel }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  async function handleConfirm() {
    setSaving(true);
    try {
      await payload?.onConfirm?.();
      toast.success(payload?.successMessage || 'Ação concluída.');
      onCancel();
    } catch {
      toast.error(payload?.errorMessage || 'Não foi possível concluir a ação.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-on-surface-variant font-body leading-relaxed">
        {payload?.message || 'Deseja continuar com esta ação?'}
      </p>
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="danger" type="button" onClick={handleConfirm} disabled={saving}>
          {saving ? 'Processando...' : payload?.confirmLabel || 'Confirmar'}
        </Button>
      </div>
    </div>
  );
}

export function AppModal() {
  const { modal, isOpen, closeModal } = useModal();
  const [categories, setCategories] = useState(expenseCategories);

  useEffect(() => {
    if (!isOpen || modal.type !== 'new-expense') return undefined;
    let active = true;
    fetchCashFlow()
      .then((data) => {
        if (active && data?.categories?.length) setCategories(data.categories);
      })
      .catch(() => {
        if (active) setCategories(expenseCategories);
      });
    return () => {
      active = false;
    };
  }, [isOpen, modal.type]);

  if (!isOpen) return null;

  const title = titles[modal.type] || 'Confirmação';
  const iconName =
    modal.type === 'new-freelancer'
      ? 'person_add'
      : modal.type === 'new-supplier'
        ? 'local_shipping'
        : modal.type === 'supplier-detail'
          ? 'receipt_long'
          : modal.type === 'new-expense'
            ? 'payments'
            : modal.type === 'stock-entry'
              ? 'inventory_2'
              : modal.type === 'new-order'
                ? 'point_of_sale'
                : modal.type === 'confirm'
                  ? 'warning'
                  : 'info';

  const wide =
    modal.type === 'import-statement' ||
    modal.type === 'new-product' ||
    modal.type === 'edit-product';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar modal"
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
        onClick={closeModal}
      />
      <div
        className={`relative w-full ${
          wide ? 'max-w-2xl' : 'max-w-lg'
        } max-h-[90vh] overflow-y-auto bg-surface-container-lowest rounded-2xl shadow-2xl shadow-on-surface/10 p-5 md:p-8 space-y-6`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-on-surface">
              <Icon name={iconName} />
            </div>
            <h3 className="font-headline text-xl font-bold text-on-surface">{title}</h3>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="p-2 min-h-11 min-w-11 rounded-full text-on-surface-variant hover:bg-surface-container-low transition-colors"
          >
            <Icon name="close" />
          </button>
        </div>

        {modal.type === 'new-freelancer' ? (
          <NewFreelancerForm onCancel={closeModal} onSuccess={modal.payload?.onSuccess} />
        ) : modal.type === 'new-supplier' ? (
          <NewSupplierForm onCancel={closeModal} onSuccess={modal.payload?.onSuccess} />
        ) : modal.type === 'supplier-detail' ? (
          <SupplierDetailView
            supplierId={modal.payload?.supplierId}
            fallbackSupplier={modal.payload?.supplier}
            onCancel={closeModal}
          />
        ) : modal.type === 'new-expense' ? (
          <NewExpenseForm
            categories={modal.payload?.categories || categories}
            onCancel={closeModal}
            onSuccess={modal.payload?.onSuccess}
          />
        ) : modal.type === 'new-order' ? (
          <NewOrderForm onCancel={closeModal} onSuccess={modal.payload?.onSuccess} />
        ) : modal.type === 'stock-entry' ? (
          <StockEntryForm
            items={modal.payload?.items}
            onCancel={closeModal}
            onSuccess={modal.payload?.onSuccess}
          />
        ) : modal.type === 'new-product' || modal.type === 'edit-product' ? (
          <ProductForm
            item={modal.payload?.item}
            onCancel={closeModal}
            onSuccess={modal.payload?.onSuccess}
          />
        ) : modal.type === 'confirm' ? (
          <ConfirmForm payload={modal.payload} onCancel={closeModal} />
        ) : (
          <div className="space-y-6">
            <p className="text-on-surface-variant font-body leading-relaxed">
              {modal.payload?.message || 'Ação disponível em breve.'}
            </p>
            <div className="flex justify-end">
              <Button onClick={closeModal}>Fechar</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
