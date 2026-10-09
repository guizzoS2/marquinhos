import { useState } from 'react';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import { useToast } from '../../contexts/ToastContext';
import { addCustomer, editCustomer } from '../../services/dashboardService';
import { maskPhone } from '../../services/freelancerSchedule';

export function CustomerForm({ customer = null, onSuccess, onCancel }) {
  const toast = useToast();
  const editing = Boolean(customer?.id);
  const [nome, setNome] = useState(customer?.nome || '');
  const [contato, setContato] = useState(customer?.contato || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const saved = editing
        ? await editCustomer(customer.id, { nome, contato })
        : await addCustomer({ nome, contato });
      toast.success(editing ? 'Cliente atualizado.' : 'Cliente cadastrado.');
      onSuccess?.(saved);
      onCancel();
    } catch (err) {
      const message = err?.message || 'Não foi possível salvar o cliente.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Input label="Nome" value={nome} onChange={(event) => setNome(event.target.value)} required />
      <Input
        label="Contato"
        value={contato}
        onChange={(event) => setContato(maskPhone(event.target.value))}
        inputMode="tel"
        required
      />
      {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="secondary" type="button" onClick={onCancel}>
          <Icon name="cancel" />
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          <Icon name={editing ? 'save' : 'add'} />
          {saving ? 'Salvando...' : editing ? 'Salvar' : 'Cadastrar cliente'}
        </Button>
      </div>
    </form>
  );
}
