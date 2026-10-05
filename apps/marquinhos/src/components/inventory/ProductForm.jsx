import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../../contexts/ToastContext';
import {
  addInventoryProduct,
  editInventoryProduct,
  peekInventoryCode,
} from '../../services/dashboardService';
import { inventoryFallback } from '../../services/fallbacks';
import { moneyInputValue, parseReaisInput } from '../../services/inventoryProduct';
import { readLocalImage } from '../../services/readLocalImage';

const categories = inventoryFallback.filters.filter((item) => item !== 'Todos');

export function ProductForm({ item, onSuccess, onCancel }) {
  const toast = useToast();
  const isEdit = Boolean(item);
  const { data: nextCode } = useQuery({
    queryKey: ['inventory', 'next-code'],
    queryFn: peekInventoryCode,
    enabled: !isEdit,
  });
  const categoryOptions = categories.includes(item?.categoria || item?.category)
    ? categories
    : [...categories, item?.categoria || item?.category].filter(Boolean);

  const [form, setForm] = useState({
    nome: item?.nome || item?.name || '',
    marca: item?.marca || '',
    descricao: item?.descricao || item?.subtitle || '',
    categoria: item?.categoria || item?.category || categoryOptions[0],
    unidade: item?.unidade || 'un',
    estoque_atual: item ? String(item.estoque_atual ?? 0) : '0',
    estoque_sugerido: item ? String(item.estoque_sugerido ?? 0) : '0',
    valor_unitario: item ? moneyInputValue(item.valor_unitario || item.cost) : '',
    foto: item?.foto || item?.image || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handlePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const foto = await readLocalImage(file);
      setForm((prev) => ({ ...prev, foto }));
    } catch (err) {
      toast.error(err?.message || 'Não foi possível ler a foto.');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const valor = parseReaisInput(form.valor_unitario);
    if (!Number.isFinite(valor) || valor < 0) {
      setSaving(false);
      setError('Valor unitário inválido.');
      return;
    }
    const payload = {
      nome: form.nome,
      marca: form.marca,
      descricao: form.descricao,
      categoria: form.categoria,
      unidade: form.unidade,
      estoque_atual: form.estoque_atual,
      estoque_sugerido: form.estoque_sugerido,
      valor_unitario: valor,
      foto: form.foto,
    };
    try {
      if (isEdit) {
        await editInventoryProduct(item.id, payload);
        toast.success('Produto atualizado.');
      } else {
        await addInventoryProduct(payload);
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

  const codigo = isEdit ? item?.codigo || '' : nextCode || '';

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Input label="Código" value={codigo} readOnly disabled />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          label="Nome"
          value={form.nome}
          onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
          required
        />
        <Input
          label="Marca"
          value={form.marca}
          onChange={(event) => setForm((prev) => ({ ...prev, marca: event.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <label
          htmlFor="produto-descricao"
          className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1"
        >
          Descrição
        </label>
        <textarea
          id="produto-descricao"
          value={form.descricao}
          onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))}
          className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11 text-on-surface focus:ring-2 focus:ring-primary-container transition-all"
          rows={3}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label
            htmlFor="produto-categoria"
            className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1"
          >
            Categoria
          </label>
          <select
            id="produto-categoria"
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
            value={form.categoria}
            onChange={(event) => setForm((prev) => ({ ...prev, categoria: event.target.value }))}
          >
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Unidade"
          value={form.unidade}
          onChange={(event) => setForm((prev) => ({ ...prev, unidade: event.target.value }))}
          required
        />
        <Input
          label="Estoque atual"
          type="number"
          min="0"
          step="1"
          value={form.estoque_atual}
          onChange={(event) => setForm((prev) => ({ ...prev, estoque_atual: event.target.value }))}
          required
        />
        <Input
          label="Estoque sugerido"
          type="number"
          min="0"
          step="1"
          value={form.estoque_sugerido}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, estoque_sugerido: event.target.value }))
          }
          required
        />
      </div>
      <Input
        label="Valor unitário (R$)"
        inputMode="decimal"
        value={form.valor_unitario}
        onChange={(event) => setForm((prev) => ({ ...prev, valor_unitario: event.target.value }))}
        required
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
        {form.foto ? (
          <img alt="" src={form.foto} className="w-16 h-16 rounded-xl object-cover" />
        ) : null}
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
