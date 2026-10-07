import { useState } from 'react';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import { RoleSelect } from '../freelancers/RoleSelect';
import { useToast } from '../../contexts/ToastContext';
import { addPromotion, editPromotion } from '../../services/dashboardService';
import { moneyInputValue, parseReaisInput } from '../../services/inventoryProduct';
import { toDateTimeLocal } from '../../services/catalogRules';

export function PromotionForm({ items = [], promotion = null, reactivate = false, onSuccess, onCancel }) {
  const toast = useToast();
  const editing = Boolean(promotion?.id) && !reactivate;
  const [produtoId, setProdutoId] = useState(
    promotion?.produto_id ? String(promotion.produto_id) : items[0] ? String(items[0].id) : ''
  );
  const [preco, setPreco] = useState(
    promotion?.preco_promocional != null ? moneyInputValue(promotion.preco_promocional) : ''
  );
  const [inicio, setInicio] = useState(promotion ? toDateTimeLocal(promotion.data_inicio) : '');
  const [termino, setTermino] = useState(promotion ? toDateTimeLocal(promotion.data_termino) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const precoPromocional = parseReaisInput(preco);
    if (!Number.isFinite(precoPromocional) || precoPromocional < 0) {
      setSaving(false);
      setError('Preço promocional inválido.');
      return;
    }
    try {
      const payload = {
        produto_id: produtoId,
        preco_promocional: precoPromocional,
        data_inicio: inicio,
        data_termino: termino,
      };
      if (editing) await editPromotion(promotion.id, payload);
      else await addPromotion(payload);
      toast.success(editing ? 'Promoção atualizada.' : reactivate ? 'Promoção reativada.' : 'Promoção cadastrada.');
      onSuccess?.();
      onCancel();
    } catch (err) {
      const message = err?.message || 'Não foi possível salvar a promoção.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <RoleSelect
        id="promocao-produto"
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
        label="Preço promocional (R$)"
        inputMode="decimal"
        value={preco}
        onChange={(event) => setPreco(event.target.value)}
        required
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          label="Início"
          type="datetime-local"
          value={inicio}
          onChange={(event) => setInicio(event.target.value)}
          required
        />
        <Input
          label="Término"
          type="datetime-local"
          value={termino}
          onChange={(event) => setTermino(event.target.value)}
          required
        />
      </div>
      {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="secondary" type="button" onClick={onCancel}>
          <Icon name="cancel" />
          Cancelar
        </Button>
        <Button type="submit" disabled={saving || !items.length}>
          <Icon name={editing ? 'save' : reactivate ? 'restart_alt' : 'add'} />
          {saving ? 'Salvando...' : editing ? 'Salvar promoção' : reactivate ? 'Reativar promoção' : 'Cadastrar promoção'}
        </Button>
      </div>
    </form>
  );
}
