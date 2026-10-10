import { useState } from 'react';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import { useToast } from '../../contexts/ToastContext';
import { addProduction, editProduction } from '../../services/dashboardService';
import { Dropdown } from '../ui/Dropdown';
import { FieldLabel } from '../ui/FieldLabel';

export function ProductionForm({ items = [], production = null, onSuccess, onCancel }) {
  const toast = useToast();
  const editing = Boolean(production?.id);
  const made = items.filter((item) => item.produzido && item.tipo !== 'combo');
  const current = items.find((item) => String(item.id) === String(production?.produto_id));
  const choices =
    current && !made.some((item) => String(item.id) === String(current.id)) ? [current, ...made] : made;
  const [produtoId, setProdutoId] = useState(
    production?.produto_id ? String(production.produto_id) : choices[0] ? String(choices[0].id) : ''
  );
  const [quantidade, setQuantidade] = useState(production?.quantidade != null ? String(production.quantidade) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        produto_id: produtoId,
        quantidade: Number(quantidade),
      };
      if (editing) await editProduction(production.id, payload);
      else await addProduction(payload);
      toast.success(editing ? 'Produção atualizada.' : 'Produção registrada.');
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
      <div className="space-y-2">
        <FieldLabel required>Produto</FieldLabel>
        <Dropdown
          id="producao-produto"
          label="Produto"
          muted
          search
          placeholder="Selecione o produto"
          value={produtoId}
          onChange={setProdutoId}
          options={choices.map((item) => ({
            value: String(item.id),
            label: item.nome || item.name,
          }))}
        />
        {!choices.length ? (
          <p className="pl-1 text-[11px] text-on-surface-variant">
            Nenhum produto marcado como produzido no bar.
          </p>
        ) : null}
      </div>
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
          <Icon name="cancel" />
          Cancelar
        </Button>
        <Button type="submit" disabled={saving || !choices.length}>
          <Icon name={editing ? 'save' : 'add'} />
          {saving ? 'Salvando...' : editing ? 'Salvar produção' : 'Registrar produção'}
        </Button>
      </div>
    </form>
  );
}
