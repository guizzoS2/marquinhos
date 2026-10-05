import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../../contexts/ToastContext';
import { addCustomer } from '../../services/dashboardService';
import { maskPhone } from '../../services/freelancerSchedule';

export function CustomerForm({ onSuccess, onCancel }) {
  const toast = useToast();
  const [nome, setNome] = useState('');
  const [contato, setContato] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const customer = await addCustomer({ nome, contato });
      toast.success('Cliente cadastrado.');
      onSuccess?.(customer);
      onCancel();
    } catch (err) {
      const message = err?.message || 'Não foi possível cadastrar o cliente.';
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
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Cadastrar cliente'}
        </Button>
      </div>
    </form>
  );
}
