import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { FileField } from '../ui/FileField';
import { FieldModal } from '../ui/FieldModal';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import { useToast } from '../../contexts/ToastContext';
import {
  addFormat,
  addInventoryProduct,
  addMenuGroup,
  addMenuSubgroup,
  editInventoryProduct,
  fetchInventory,
  peekInventoryCode,
} from '../../services/dashboardService';
import { PRODUCT_FORMATS, resolveProductTaxonomy } from '../../services/catalogTaxonomy';
import { moneyInputValue, parseReaisInput, PRODUCT_MEASURES } from '../../services/inventoryProduct';
import { RoleSelect } from '../freelancers/RoleSelect';
import { readLocalImage } from '../../services/readLocalImage';
import { Dropdown } from '../ui/Dropdown';
import { FieldLabel } from '../ui/FieldLabel';
import { SegmentedControl } from '../ui/SegmentedControl';

function QuickName({ label, withDescription = false, onSubmit, onCancel }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit(name, description);
      onCancel();
    } catch (err) {
      toast.error(err?.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Input label={label} value={name} onChange={(event) => setName(event.target.value)} required />
      {withDescription ? (
        <div className="space-y-2">
          <label htmlFor="novo-grupo-descricao" className="pl-1 text-xs font-label font-bold uppercase text-on-surface-variant">
            Descrição
          </label>
          <textarea
            id="novo-grupo-descricao"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Opcional"
            rows={3}
            className="min-h-11 w-full rounded-2xl border border-outline bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface outline-none placeholder:font-normal placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-0"
          />
        </div>
      ) : null}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="secondary" type="button" onClick={onCancel}>
          <Icon name="cancel" />
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          <Icon name="add" />
          {saving ? 'Salvando...' : 'Criar'}
        </Button>
      </div>
    </form>
  );
}

export function ProductForm({ item, onSuccess, onCancel }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const isEdit = Boolean(item);
  const inventory = useQuery({ queryKey: ['inventory'], queryFn: fetchInventory });
  const [adding, setAdding] = useState(null);
  const groups = inventory.data?.groups || [];
  const formats = inventory.data?.formats?.length ? inventory.data.formats : PRODUCT_FORMATS;
  const placed = resolveProductTaxonomy(item || {});
  const { data: nextCode } = useQuery({
    queryKey: ['inventory', 'next-code'],
    queryFn: peekInventoryCode,
    enabled: !isEdit,
  });
  const [form, setForm] = useState({
    nome: item?.nome || item?.name || '',
    marca: item?.marca || '',
    descricao: item?.descricao || item?.subtitle || '',
    grupoId: placed.grupoId,
    subgrupoId: placed.subgrupoId,
    formato: placed.formato || 'Unidade',
    familia: placed.familia,
    volume_peso: item && item.volume_peso != null ? String(item.volume_peso) : '',
    medida: PRODUCT_MEASURES.includes(item?.medida) ? item.medida : 'UN',
    estoque_atual: item ? String(item.estoque_atual ?? 0) : '0',
    estoque_sugerido: item ? String(item.estoque_sugerido ?? 0) : '0',
    valor_unitario: item ? moneyInputValue(item.valor_unitario || item.cost) : '',
    custo_compra: item ? moneyInputValue(item.custo_compra) : '',
    foto: item?.foto || item?.image || '',
    produzido: Boolean(item?.produzido),
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
    if (!form.grupoId) {
      setSaving(false);
      setError('Selecione o grupo.');
      return;
    }
    const group = groups.find((item) => item.id === form.grupoId);
    if ((group?.subgroups || []).length && !form.subgrupoId) {
      setSaving(false);
      setError('Selecione o subgrupo.');
      return;
    }
    const valor = parseReaisInput(form.valor_unitario);
    if (!Number.isFinite(valor) || valor < 0) {
      setSaving(false);
      setError('Valor unitário inválido.');
      return;
    }
    const custo =
      String(form.custo_compra || '').trim() === '' ? '' : parseReaisInput(form.custo_compra);
    if (custo !== '' && (!Number.isFinite(custo) || custo < 0)) {
      setSaving(false);
      setError('Custo de compra inválido.');
      return;
    }
    const payload = {
      nome: form.nome,
      marca: form.marca,
      descricao: form.descricao,
      grupoId: form.grupoId,
      subgrupoId: form.subgrupoId,
      formato: form.formato,
      familia: form.familia,
      volume_peso: form.volume_peso,
      medida: form.medida,
      estoque_atual: form.estoque_atual,
      estoque_sugerido: form.estoque_sugerido,
      valor_unitario: valor,
      custo_compra: custo,
      produzido: form.produzido,
      foto: form.foto,
    };
    try {
      if (isEdit) {
        await editInventoryProduct(item.id, payload);
        toast.success('Produto atualizado.');
        onSuccess?.();
      } else {
        const created = await addInventoryProduct(payload);
        toast.success('Produto cadastrado.');
        onSuccess?.(created?.item);
      }
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

  const selectedGroup = groups.find((group) => group.id === form.grupoId) || null;
  const subgroups = selectedGroup?.subgroups || [];

  return (
    <>
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
          className="text-xs font-label font-bold text-on-surface-variant uppercase pl-1"
        >
          Descrição
        </label>
        <textarea
          id="produto-descricao"
          value={form.descricao}
          onChange={(event) => setForm((prev) => ({ ...prev, descricao: event.target.value }))}
          className="w-full bg-surface-container-low border border-outline rounded-2xl py-3 px-4 min-h-11 text-on-surface outline-none focus:border-primary focus:outline-none focus:ring-0 transition-all"
          rows={3}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2 md:col-span-2">
          <FieldLabel required>Grupo</FieldLabel>
          <div className="flex items-center gap-2">
            <Dropdown
              id="produto-grupo"
              className="min-w-0 flex-1"
              label="Grupo"
              muted
              search
              value={form.grupoId}
              onChange={(grupoId) => setForm((prev) => ({ ...prev, grupoId, subgrupoId: '' }))}
              options={groups.map((group) => ({ value: group.id, label: group.name }))}
            />
            <Button type="button" size="icon" className="shrink-0" aria-label="Novo grupo" onClick={() => setAdding('group')}>
              <Icon name="add" />
            </Button>
          </div>
        </div>
        {subgroups.length ? (
          <div className="space-y-2 md:col-span-2">
            <FieldLabel required>Subgrupo</FieldLabel>
            <div className="flex items-center gap-2">
              <Dropdown
                id="produto-subgrupo"
                className="min-w-0 flex-1"
                label="Subgrupo"
                muted
                search
                value={form.subgrupoId}
                onChange={(subgrupoId) => setForm((prev) => ({ ...prev, subgrupoId }))}
                options={subgroups.map((sub) => ({ value: sub.id, label: sub.name }))}
              />
              <Button
                type="button"
                size="icon"
                className="shrink-0"
                aria-label="Novo subgrupo"
                onClick={() => setAdding('subgroup')}
              >
                <Icon name="add" />
              </Button>
            </div>
          </div>
        ) : null}
        <div className="space-y-2">
          <FieldLabel required>Formato</FieldLabel>
          <div className="flex items-center gap-2">
            <Dropdown
              className="min-w-0 flex-1"
              label="Formato"
              muted
              value={form.formato}
              onChange={(formato) => setForm((prev) => ({ ...prev, formato }))}
              options={formats.map((format) => ({ value: format, label: format }))}
            />
            <Button type="button" size="icon" className="shrink-0" aria-label="Novo formato" onClick={() => setAdding('format')}>
              <Icon name="add" />
            </Button>
          </div>
        </div>
        <Input
          label="Família"
          value={form.familia}
          onChange={(event) => setForm((prev) => ({ ...prev, familia: event.target.value }))}
          placeholder="Ex.: Heineken"
        />
        <div className="space-y-2 md:col-span-2">
          <p className="pl-1 text-xs font-bold uppercase text-on-surface-variant font-label">Origem</p>
          <SegmentedControl
            className="w-full"
            label="Origem do produto"
            items={[
              { id: 'comprado', label: 'Comprado' },
              { id: 'produzido', label: 'Produzido no bar' },
            ]}
            value={form.produzido ? 'produzido' : 'comprado'}
            onChange={(origem) => setForm((prev) => ({ ...prev, produzido: origem === 'produzido' }))}
          />
          <p className="pl-1 text-[11px] text-on-surface-variant">
            Produzido no bar entra na produção. Comprado fica só no estoque, como lata e cerveja.
          </p>
        </div>
        <Input
          label="Volume / Peso"
          type="number"
          min="0"
          step="any"
          value={form.volume_peso}
          onChange={(event) => setForm((prev) => ({ ...prev, volume_peso: event.target.value }))}
          required
        />
        <RoleSelect
          id="produto-medida"
          label="Medida"
          roles={PRODUCT_MEASURES}
          value={form.medida}
          onChange={(medida) => setForm((prev) => ({ ...prev, medida }))}
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
      <Input
        label="Custo de compra (R$)"
        inputMode="decimal"
        value={form.custo_compra}
        onChange={(event) => setForm((prev) => ({ ...prev, custo_compra: event.target.value }))}
        placeholder="Ex.: 5,00"
      />
      <div className="space-y-2">
        <FileField label="Foto" accept="image/*" onChange={handlePhoto} />
        {form.foto ? (
          <img alt="" src={form.foto} className="h-16 w-16 rounded-xl object-cover" />
        ) : null}
      </div>
      {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="secondary" type="button" onClick={onCancel}>
          <Icon name="cancel" />
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          <Icon name={isEdit ? 'save' : 'add'} />
          {saving ? 'Salvando...' : isEdit ? 'Salvar produto' : 'Cadastrar produto'}
        </Button>
      </div>
    </form>
    {adding === 'group' ? (
      <FieldModal title="Novo grupo" icon="category" onClose={() => setAdding(null)}>
        <QuickName
          label="Nome do grupo"
          withDescription
          onCancel={() => setAdding(null)}
          onSubmit={async (name, description) => {
            const group = await addMenuGroup(name, description);
            setForm((prev) => ({ ...prev, grupoId: group.id, subgrupoId: '' }));
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
          }}
        />
      </FieldModal>
    ) : null}
    {adding === 'subgroup' && selectedGroup ? (
      <FieldModal title="Novo subgrupo" icon="category" onClose={() => setAdding(null)}>
        <QuickName
          label="Nome do subgrupo"
          onCancel={() => setAdding(null)}
          onSubmit={async (name) => {
            const subgroup = await addMenuSubgroup(selectedGroup.id, name);
            setForm((prev) => ({ ...prev, subgrupoId: subgroup.id }));
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
          }}
        />
      </FieldModal>
    ) : null}
    {adding === 'format' ? (
      <FieldModal title="Novo formato" icon="straighten" onClose={() => setAdding(null)}>
        <QuickName
          label="Formato"
          onCancel={() => setAdding(null)}
          onSubmit={async (name) => {
            const format = await addFormat(name);
            setForm((prev) => ({ ...prev, formato: format }));
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
          }}
        />
      </FieldModal>
    ) : null}
    </>
  );
}
