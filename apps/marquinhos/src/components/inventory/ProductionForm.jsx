import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../../contexts/ToastContext';
import { addProduction } from '../../services/dashboardService';
import { RoleSelect } from '../freelancers/RoleSelect';

export function ProductionForm({ items = [], onSuccess, onCancel }) {
  const toast = useToast();
  const [produtoId, setProdutoId] = useState(items[0] ? String(items[0].id) : '');
  const [quantidade, setQuantidade] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await addProduction({
        produto_id: produtoId,
        quantidade: Number(quantidade),
      });
      toast.success('Produção registrada.');
      onSuccess?.();
      onCancel();
    } catch (err) {
      const message = err?.message || 'Não foi possível registrar a produção.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <RoleSelect
        id="producao-produto"
        label="Produto"
        options={items.map((item) => ({
          value: String(item.id),
          label: item.nome || item.name,
        }))}
        value={produtoId}
        onChange={setProdutoId}
        required
      />
      <Input
        label="Quantidade"
        type="number"
        min="1"
        step="1"
        value={quantidade}
        onChange={(event) => setQuantidade(event.target.value)}
        required
      />
      {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving || !items.length}>
          {saving ? 'Salvando...' : 'Registrar produção'}
        </Button>
      </div>
    </form>
  );
}
