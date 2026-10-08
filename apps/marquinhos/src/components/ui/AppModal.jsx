import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Icon } from './Icon';
import { Button } from './Button';
import { DataTable, EmptyRow, TBody, Td, Th, THead, Tr } from './DataTable';
import { Dropdown } from './Dropdown';
import { Input } from './Input';
import { useModal } from '../../contexts/ModalContext';
import { useToast } from '../../contexts/ToastContext';
import {
  createCashIncome,
  editCashIncome,
  fetchSuppliers,
} from '../../services/dashboardService';
import { ExpenseForm } from '../cashflow/ExpenseForm';
import { MovementDetail } from '../cashflow/MovementDetail';
import { CloseDayForm } from '../sales/CloseDayForm';
import { NewSaleForm } from '../sales/NewSaleForm';
import { NewFreelancerForm } from '../freelancers/NewFreelancerForm';
import { DailyForm } from '../freelancers/DailyForm';
import { ShiftDetailForm } from '../freelancers/ShiftDetailForm';
import { parseCashFlowDate, toIsoDate } from '../../services/cashFlowUtils';
import { ProductForm } from '../inventory/ProductForm';
import { ProductDetail } from '../inventory/ProductDetail';
import { CategoryForm } from '../inventory/CategoryForm';
import { ProductionForm } from '../inventory/ProductionForm';
import { ComboForm } from '../catalog/ComboForm';
import { ComboDetail } from '../catalog/ComboDetail';
import { PromotionForm } from '../catalog/PromotionForm';
import { CustomerForm } from '../pdv/CustomerForm';
import { PurchaseForm } from '../suppliers/PurchaseForm';
import { NewSupplierForm } from '../suppliers/NewSupplierForm';
import { SuppliersList } from '../suppliers/SuppliersList';

const titles = {
  'new-order': 'Nova Venda',
  'new-sale': 'Nova venda',
  'new-product': 'Novo produto',
  'edit-product': 'Editar produto',
  'product-detail': 'Detalhes do Produto',
  'new-category': 'Nova categoria',
  'new-production': 'Registrar Produção',
  'edit-production': 'Editar produção',
  'new-promotion': 'Nova promoção',
  'edit-promotion': 'Editar promoção',
  'new-combo': 'Novo combo',
  'edit-combo': 'Editar combo',
  'combo-detail': 'Detalhes do combo',
  'new-customer': 'Novo Cliente',
  'new-daily': 'Registrar Diária',
  'shift-detail': 'Agendamento',
  'new-freelancer': 'Novo Freelancer',
  'new-supplier': 'Novo Fornecedor',
  'edit-supplier': 'Editar fornecedor',
  'new-purchase': 'Nova compra',
  'suppliers-list': 'Fornecedores',
  'supplier-detail': 'Histórico do fornecedor',
  'new-expense': 'Nova compra',
  'close-day': 'Fechar caixa',
  'import-statement': 'Importar Extrato',
  confirm: 'Confirmar ação',
};

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
          <dt className="text-xs font-label font-bold text-on-surface-variant uppercase">
            Nome
          </dt>
          <dd className="font-headline font-bold text-on-surface">{supplier.name}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs font-label font-bold text-on-surface-variant uppercase">
            Contato
          </dt>
          <dd className="text-on-surface">{supplier.contact || '—'}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs font-label font-bold text-on-surface-variant uppercase">
            CNPJ
          </dt>
          <dd className="text-on-surface">{supplier.cnpj || '—'}</dd>
        </div>
      </dl>

      <div className="space-y-3">
        <h4 className="font-headline font-bold text-on-surface">Histórico de compras</h4>
        <DataTable>
          <THead>
            <Th>Data</Th>
            <Th>Categoria</Th>
            <Th align="right">Valor</Th>
          </THead>
          <TBody>
            {history.map((row) => (
              <Tr key={row.id || `${row.date}-${row.value}`}>
                <Td tone="muted">{row.date}</Td>
                <Td>{row.category}</Td>
                <Td align="right" tone="danger">
                  {row.value}
                </Td>
              </Tr>
            ))}
            {!history.length ? <EmptyRow colSpan={3}>Nenhuma compra vinculada.</EmptyRow> : null}
          </TBody>
        </DataTable>
      </div>

      <div className="flex justify-end">
        <Button onClick={onCancel}>
          <Icon name="close" />
          Fechar
        </Button>
      </div>
    </div>
  );
}

function cashFormDate(row) {
  return parseCashFlowDate(row?.date) || toIsoDate(row?.createdAt) || new Date().toISOString().slice(0, 10);
}

function reaisInput(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

function NewOrderForm({ onSuccess, onCancel, income = null }) {
  const toast = useToast();
  const editing = Boolean(income?.id);
  const [form, setForm] = useState({
    date: editing ? cashFormDate(income) : new Date().toISOString().slice(0, 10),
    description: income?.description || '',
    category: income?.categoria || 'Varejo',
    value: editing ? reaisInput(income.amount) : '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        date: form.date,
        description: form.description,
        category: form.category,
        categoryIcon: form.category === 'Eventos' ? 'celebration' : 'payments',
        categoryTone: form.category === 'Eventos' ? 'tertiary' : 'secondary',
        amount: Math.round(Number(form.value) * 100),
      };
      if (editing) await editCashIncome(income.id, payload);
      else await createCashIncome(payload);
      toast.success(editing ? 'Entrada atualizada.' : 'Venda registrada no fluxo de caixa.');
      onSuccess?.();
      onCancel();
    } catch {
      setError(editing ? 'Não foi possível atualizar a entrada.' : 'Não foi possível registrar a venda.');
      toast.error(editing ? 'Falha ao atualizar entrada.' : 'Falha ao registrar venda.');
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
        <label className="text-xs font-label font-bold text-on-surface-variant uppercase pl-1">
          Categoria
        </label>
        <Dropdown
          label="Categoria"
          muted
          value={form.category}
          onChange={(category) => setForm((prev) => ({ ...prev, category }))}
          options={[...new Set([form.category, 'Varejo', 'Eventos', 'Reservas'].filter(Boolean))].map((item) => ({
            value: item,
            label: item,
          }))}
        />
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
          <Icon name="cancel" />
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          <Icon name={editing ? 'save' : 'check'} />
          {saving ? 'Salvando...' : editing ? 'Salvar' : 'Confirmar venda'}
        </Button>
      </div>
    </form>
  );
}

function movementTitle(payload) {
  if (payload?.sale) {
    return payload.sale.numero_comanda ? `Comanda ${payload.sale.numero_comanda}` : 'Venda';
  }
  if (payload?.kind === 'compra' || payload?.purchase) return 'Compra';
  return payload?.movement?.tipo === 'saida' ? 'Saída' : 'Entrada';
}

function confirmActionIcon(label) {
  const text = String(label || 'Confirmar');
  if (text.startsWith('Excluir') || text.startsWith('Remover') || text.startsWith('Apagar')) return 'delete';
  if (text.startsWith('Cancelar')) return 'cancel';
  if (text.startsWith('Reativar')) return 'restart_alt';
  if (text.startsWith('Inativar')) return 'block';
  return 'check';
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
    } catch (err) {
      toast.error(err?.message || payload?.errorMessage || 'Não foi possível concluir a ação.');
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
          <Icon name="cancel" />
          Cancelar
        </Button>
        <Button variant="danger" type="button" onClick={handleConfirm} disabled={saving}>
          <Icon name={confirmActionIcon(payload?.confirmLabel)} />
          {saving ? 'Processando...' : payload?.confirmLabel || 'Confirmar'}
        </Button>
      </div>
    </div>
  );
}

export function AppModal() {
  const { modal, isOpen, closeModal, openModal } = useModal();

  if (!isOpen) return null;

  const title =
    modal.type === 'movement-detail'
      ? movementTitle(modal.payload)
      : modal.type === 'new-promotion' && modal.payload?.reactivate
      ? 'Reativar promoção'
      : modal.type === 'new-freelancer' && modal.payload?.person
        ? 'Editar Freelancer'
        : modal.type === 'new-expense' && modal.payload?.expense
          ? 'Editar compra'
          : modal.type === 'close-day' && modal.payload?.readOnly
            ? 'Fechamento'
          : modal.type === 'new-order' && modal.payload?.income
            ? 'Editar entrada'
            : titles[modal.type] || 'Confirmação';
  const iconName =
    modal.type === 'new-freelancer'
      ? 'person_add'
      : modal.type === 'new-daily' || modal.type === 'shift-detail'
        ? 'assignment_add'
      : modal.type === 'new-supplier'
        ? 'local_shipping'
        : modal.type === 'supplier-detail'
          ? 'receipt_long'
          : modal.type === 'new-expense'
            ? 'payments'
            : modal.type === 'close-day'
              ? 'lock'
            : modal.type === 'movement-detail'
              ? modal.payload?.sale || modal.payload?.movement?.tipo === 'entrada'
                ? 'point_of_sale'
                : 'payments'
            : modal.type === 'new-order' || modal.type === 'new-sale'
                ? 'point_of_sale'
                : modal.type === 'confirm'
                  ? 'warning'
                  : 'info';

  const wide =
    modal.type === 'import-statement' ||
    modal.type === 'new-product' ||
    modal.type === 'edit-product' ||
    modal.type === 'product-detail' ||
    modal.type === 'new-combo' ||
    modal.type === 'edit-combo' ||
    modal.type === 'combo-detail' ||
    modal.type === 'new-promotion' ||
    modal.type === 'edit-promotion' ||
    modal.type === 'new-expense' ||
    modal.type === 'new-purchase' ||
    modal.type === 'close-day' ||
    modal.type === 'new-sale' ||
    modal.type === 'movement-detail' ||
    modal.type === 'suppliers-list';

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
          <Button type="button" size="icon" variant="ghost" onClick={closeModal} aria-label="Fechar">
            <Icon name="close" />
          </Button>
        </div>

        {modal.type === 'new-freelancer' ? (
          <NewFreelancerForm
            person={modal.payload?.person}
            roles={modal.payload?.roles || ['Barman', 'Garçom', 'Cozinha']}
            onCancel={closeModal}
            onSuccess={modal.payload?.onSuccess}
          />
        ) : modal.type === 'new-daily' ? (
          <DailyForm
            people={modal.payload?.people || []}
            roles={modal.payload?.roles || ['Barman', 'Garçom', 'Cozinha']}
            onCancel={closeModal}
            onSuccess={modal.payload?.onSuccess}
          />
        ) : modal.type === 'shift-detail' ? (
          <ShiftDetailForm
            shift={modal.payload?.shift}
            people={modal.payload?.people || []}
            roles={modal.payload?.roles || ['Barman', 'Garçom', 'Cozinha']}
            onCancel={closeModal}
            onSuccess={modal.payload?.onSuccess}
          />
        ) : modal.type === 'new-supplier' || modal.type === 'edit-supplier' ? (
          <NewSupplierForm
            supplier={modal.payload?.supplier}
            onCancel={closeModal}
            onSuccess={modal.payload?.onSuccess}
          />
        ) : modal.type === 'new-purchase' ? (
          <PurchaseForm
            items={modal.payload?.items || []}
            suppliers={modal.payload?.suppliers || []}
            onCancel={closeModal}
            onSuccess={modal.payload?.onSuccess}
          />
        ) : modal.type === 'suppliers-list' ? (
          <SuppliersList
            onOpen={(supplier) =>
              openModal('supplier-detail', {
                supplierId: supplier.id,
                supplier,
              })
            }
            onEdit={(supplier) =>
              openModal('edit-supplier', {
                supplier,
                onSuccess: modal.payload?.onChanged,
              })
            }
            onDelete={(supplier) => modal.payload?.onDelete?.(supplier)}
          />
        ) : modal.type === 'supplier-detail' ? (
          <SupplierDetailView
            supplierId={modal.payload?.supplierId}
            fallbackSupplier={modal.payload?.supplier}
            onCancel={closeModal}
          />
        ) : modal.type === 'new-expense' ? (
          <ExpenseForm
            categories={modal.payload?.categories}
            expense={modal.payload?.expense}
            purchase={modal.payload?.purchase}
            onCancel={closeModal}
            onSuccess={modal.payload?.onSuccess}
          />
        ) : modal.type === 'close-day' ? (
          <CloseDayForm payload={modal.payload} onCancel={closeModal} />
        ) : modal.type === 'movement-detail' ? (
          <MovementDetail
            movement={modal.payload?.movement}
            sale={modal.payload?.sale}
            purchase={modal.payload?.purchase}
            onCancel={closeModal}
          />
        ) : modal.type === 'new-sale' ? (
          <NewSaleForm
            items={modal.payload?.items || []}
            promotions={modal.payload?.promotions || []}
            sales={modal.payload?.sales || []}
            serverNow={modal.payload?.serverNow}
            onCancel={closeModal}
            onSuccess={modal.payload?.onSuccess}
          />
        ) : modal.type === 'new-order' ? (
          <NewOrderForm
            income={modal.payload?.income}
            onCancel={closeModal}
            onSuccess={modal.payload?.onSuccess}
          />
        ) : modal.type === 'product-detail' ? (
          <ProductDetail
            item={modal.payload?.item}
            canDelete={Boolean(modal.payload?.canDelete)}
            onEdit={modal.payload?.onEdit}
            onDelete={modal.payload?.onDelete}
            onCancel={closeModal}
          />
        ) : modal.type === 'new-category' ? (
          <CategoryForm onCancel={closeModal} onSuccess={modal.payload?.onSuccess} />
        ) : modal.type === 'new-production' || modal.type === 'edit-production' ? (
          <ProductionForm
            items={modal.payload?.items || []}
            production={modal.payload?.production}
            onCancel={closeModal}
            onSuccess={modal.payload?.onSuccess}
          />
        ) : modal.type === 'new-customer' ? (
          <CustomerForm onCancel={closeModal} onSuccess={modal.payload?.onSuccess} />
        ) : modal.type === 'new-promotion' || modal.type === 'edit-promotion' ? (
          <PromotionForm
            items={modal.payload?.items || []}
            promotion={modal.payload?.promotion}
            reactivate={Boolean(modal.payload?.reactivate)}
            onCancel={closeModal}
            onSuccess={modal.payload?.onSuccess}
          />
        ) : modal.type === 'new-combo' || modal.type === 'edit-combo' ? (
          <ComboForm
            items={modal.payload?.items || []}
            combo={modal.payload?.combo}
            parts={modal.payload?.parts || []}
            onCancel={closeModal}
            onSuccess={modal.payload?.onSuccess}
          />
        ) : modal.type === 'combo-detail' ? (
          <ComboDetail
            combo={modal.payload?.combo}
            parts={modal.payload?.parts || []}
            onCancel={closeModal}
          />
        ) : modal.type === 'new-product' || modal.type === 'edit-product' ? (
          <ProductForm
            item={modal.payload?.item}
            categories={modal.payload?.categories}
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
              <Button onClick={closeModal}>
                <Icon name="close" />
                Fechar
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
