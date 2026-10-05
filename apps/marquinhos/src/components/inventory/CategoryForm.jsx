import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../../contexts/ToastContext';
import { addInventoryFilter } from '../../services/dashboardService';

export function CategoryForm({ onSuccess, onCancel }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await addInventoryFilter(name);
      toast.success('Categoria criada.');
      onSuccess?.(result.name);
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
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Criar categoria'}
        </Button>
      </div>
    </form>
  );
}
