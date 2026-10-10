import { useState } from 'react';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import { useToast } from '../../contexts/ToastContext';
import { createSupplier, editSupplier } from '../../services/dashboardService';

export function NewSupplierForm({ supplier = null, onSuccess, onCancel }) {
  const toast = useToast();
  const editing = Boolean(supplier?.id);
  const [form, setForm] = useState({
    name: supplier?.name || '',
    contact: supplier?.contact || '',
    cnpj: supplier?.cnpj || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const saved = editing ? await editSupplier(supplier.id, form) : await createSupplier(form);
      toast.success(editing ? 'Fornecedor atualizado.' : 'Fornecedor cadastrado.');
      onSuccess?.(saved);
      onCancel();
    } catch (err) {
      const message = err?.message || 'Não foi possível salvar o fornecedor.';
      setError(message);
      toast.error(message);
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
      />
      {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="secondary" type="button" onClick={onCancel}>
          <Icon name="cancel" />
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          <Icon name={editing ? 'save' : 'add'} />
          {saving ? 'Salvando...' : editing ? 'Salvar fornecedor' : 'Adicionar fornecedor'}
        </Button>
      </div>
    </form>
  );
}
