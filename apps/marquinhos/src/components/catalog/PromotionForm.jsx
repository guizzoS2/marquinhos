import { useState } from 'react';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import { FieldLabel } from '../ui/FieldLabel';
import { SegmentedControl } from '../ui/SegmentedControl';
import { RoleSelect } from '../freelancers/RoleSelect';
import { useToast } from '../../contexts/ToastContext';
import { addPromotion, editPromotion } from '../../services/dashboardService';
import { moneyInputValue, parseReaisInput } from '../../services/inventoryProduct';
import { WEEKDAYS, toDateTimeLocal } from '../../services/catalogRules';

export function PromotionForm({ items = [], promotion = null, reactivate = false, onSuccess, onCancel }) {
  const toast = useToast();
  const editing = Boolean(promotion?.id) && !reactivate;
  const [produtoId, setProdutoId] = useState(
    promotion?.produto_id ? String(promotion.produto_id) : items[0] ? String(items[0].id) : ''
  );
  const [preco, setPreco] = useState(
    promotion?.preco_promocional != null ? moneyInputValue(promotion.preco_promocional) : ''
  );
  const [vigencia, setVigencia] = useState(promotion?.vigencia === 'semana' ? 'semana' : 'periodo');
  const [diaSemana, setDiaSemana] = useState(
    promotion?.vigencia === 'semana' && WEEKDAYS.some((day) => day.value === Number(promotion.dia_semana))
      ? Number(promotion.dia_semana)
      : 1
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
        vigencia,
        dia_semana: diaSemana,
        data_inicio: inicio,
        data_termino: termino,
      };
      if (promotion?.id) await editPromotion(promotion.id, payload);
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
      <div className="space-y-2">
        <p className="text-xs font-label font-bold text-on-surface-variant uppercase pl-1">Vigência</p>
        <SegmentedControl
          className="w-full"
          label="Vigência da promoção"
          items={[
            { id: 'periodo', label: 'Período' },
            { id: 'semana', label: 'Dia da semana' },
          ]}
          value={vigencia}
          onChange={setVigencia}
        />
      </div>
      {vigencia === 'semana' ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <FieldLabel required>Dia da semana</FieldLabel>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Dia da semana">
              {WEEKDAYS.map((day) => {
                const selected = diaSemana === day.value;
                return (
                  <button
                    key={day.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setDiaSemana(day.value)}
                    className={`min-h-11 rounded-xl border px-3 text-sm ${
                      selected
                        ? 'border-primary bg-primary font-bold text-on-primary'
                        : 'border-outline bg-surface font-normal text-on-surface'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Input
              label="Fim"
              type="datetime-local"
              value={termino}
              onChange={(event) => setTermino(event.target.value)}
            />
            <p className="text-sm text-on-surface-variant">Sem data, fica para sempre.</p>
          </div>
        </div>
      ) : (
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
      )}
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
