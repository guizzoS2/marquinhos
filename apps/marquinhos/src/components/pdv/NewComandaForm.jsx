import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Dropdown } from '../ui/Dropdown';
import { FieldLabel } from '../ui/FieldLabel';
import { FieldModal } from '../ui/FieldModal';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import { useToast } from '../../contexts/ToastContext';
import { fetchCustomers, openComanda } from '../../services/dashboardService';
import { CustomerForm } from './CustomerForm';

export function NewComandaForm({ onCancel, onSuccess }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const customers = useQuery({ queryKey: ['customers'], queryFn: fetchCustomers });
  const [numero, setNumero] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const options = [
    { value: '', label: 'Consumidor' },
    ...(customers.data?.customers || []).map((item) => ({ value: String(item.id), label: item.nome })),
  ];

  async function createComanda(event) {
    event.preventDefault();
    const value = Number(numero);
    if (!Number.isInteger(value) || value <= 0) {
      toast.error('Número da comanda inválido.');
      return;
    }
    setSaving(true);
    try {
      await openComanda({ numero_comanda: value, cliente_id: clienteId || null });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Comanda criada.');
      onSuccess?.();
      onCancel();
    } catch (err) {
      toast.error(err?.message || 'Não foi possível criar a comanda.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form className="space-y-5" onSubmit={createComanda}>
        <Input
          label="Número"
          inputMode="numeric"
          value={numero}
          onChange={(event) => setNumero(event.target.value.replace(/\D/g, ''))}
          required
        />
        <div className="space-y-2">
          <FieldLabel>Cliente</FieldLabel>
          <Dropdown
            label="Cliente"
            muted
            value={clienteId}
            onChange={setClienteId}
            options={options}
            placeholder="Consumidor"
          />
        </div>
        <Button type="button" variant="secondary" onClick={() => setAddingCustomer(true)}>
          <Icon name="add" />
          Novo cliente
        </Button>
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
            <Icon name="cancel" />
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            <Icon name="add" />
            {saving ? 'Salvando...' : 'Criar comanda'}
          </Button>
        </div>
      </form>
      {addingCustomer ? (
        <FieldModal title="Novo Cliente" icon="person_add" onClose={() => setAddingCustomer(false)}>
          <CustomerForm
            onCancel={() => setAddingCustomer(false)}
            onSuccess={(customer) => {
              if (customer?.id != null) setClienteId(String(customer.id));
              queryClient.invalidateQueries({ queryKey: ['customers'] });
              setAddingCustomer(false);
            }}
          />
        </FieldModal>
      ) : null}
    </>
  );
}
