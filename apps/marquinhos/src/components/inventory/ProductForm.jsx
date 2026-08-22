import { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../../contexts/ToastContext';
import { addInventoryProduct, editInventoryProduct } from '../../services/dashboardService';
import { inventoryFallback } from '../../services/fallbacks';

const categories = inventoryFallback.filters.filter((item) => item !== 'Todos');

export function ProductForm({ item, onSuccess, onCancel }) {
  const toast = useToast();
  const isEdit = Boolean(item);
  const [form, setForm] = useState({
    name: item?.name || '',
    subtitle: item?.subtitle || '',
    category: item?.category || categories[0],
    qty: item ? String(item.stock).replace(/[^\d.,]/g, '') : '0',
    minQty: item ? String(item.minStock).replace(/[^\d.,]/g, '') : '0',
    unit: (item?.stock || 'un').replace(/^[\d.,\s]+/, '').trim() || 'un',
    cost: item?.cost || '',
    image: item?.image || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function handlePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, image: String(reader.result || '') }));
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await editInventoryProduct(item.id, {
          name: form.name,
          subtitle: form.subtitle,
          category: form.category,
          stock: `${form.qty} ${form.unit}`,
          minStock: `${form.minQty} ${form.unit}`,
          cost: form.cost,
          image: form.image,
        });
        toast.success('Produto atualizado.');
      } else {
        await addInventoryProduct({
          name: form.name,
          subtitle: form.subtitle,
          category: form.category,
          qty: form.qty,
          minQty: form.minQty,
          unit: form.unit,
          cost: form.cost,
          image: form.image,
        });
        toast.success('Produto cadastrado.');
      }
      onSuccess?.();
      onCancel();
    } catch (err) {
      const message = err?.message || 'Não foi possível salvar o produto.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Input
        label="Nome"
        value={form.name}
        onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
        required
      />
      <Input
        label="Detalhe"
        value={form.subtitle}
        onChange={(event) => setForm((prev) => ({ ...prev, subtitle: event.target.value }))}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1">
            Categoria
          </label>
          <select
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Unidade"
          value={form.unit}
          onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))}
          required
        />
        <Input
          label="Estoque inicial"
          type="number"
          min="0"
          step="1"
          value={form.qty}
          onChange={(event) => setForm((prev) => ({ ...prev, qty: event.target.value }))}
          required
        />
        <Input
          label="Estoque mínimo"
          type="number"
          min="0"
          step="1"
          value={form.minQty}
          onChange={(event) => setForm((prev) => ({ ...prev, minQty: event.target.value }))}
          required
        />
      </div>
      <Input
        label="Custo (R$)"
        value={form.cost}
        onChange={(event) => setForm((prev) => ({ ...prev, cost: event.target.value }))}
      />
      <label className="block space-y-2">
        <span className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1">
          Foto
        </span>
        <input
          type="file"
          accept="image/*"
          onChange={handlePhoto}
          className="block w-full text-sm min-h-11"
        />
      </label>
      {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando...' : isEdit ? 'Salvar produto' : 'Cadastrar produto'}
        </Button>
      </div>
    </form>
  );
}
