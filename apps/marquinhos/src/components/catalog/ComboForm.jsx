import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { FileField } from '../ui/FileField';
import { Icon } from '../ui/Icon';
import { Input } from '../ui/Input';
import { LineFields } from '../ui/LineFields';
import { useToast } from '../../contexts/ToastContext';
import { addCombo, editCombo } from '../../services/dashboardService';
import { moneyInputValue, parseReaisInput } from '../../services/inventoryProduct';
import { readLocalImage } from '../../services/readLocalImage';

export function ComboForm({ items = [], combo = null, parts = [], onSuccess, onCancel }) {
  const toast = useToast();
  const editing = Boolean(combo?.id);
  const [nome, setNome] = useState(editing ? combo.nome || combo.name || '' : 'Combo ');
  const [valor, setValor] = useState(editing ? moneyInputValue(combo.valor_unitario ?? combo.cost) : '');
  const [foto, setFoto] = useState(editing ? combo.foto || combo.image || '' : '');
  const [query, setQuery] = useState('');
  const [lines, setLines] = useState(() =>
    parts.map((part) => ({
      produto_associado_id: String(part.produto_associado_id),
      nome: part.nome,
      foto: part.foto,
      quantidade: String(part.quantidade ?? 1),
      deduz_estoque_integral: part.deduz_estoque_integral === true,
    }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const simples = useMemo(
    () => items.filter((item) => item.tipo !== 'combo'),
    [items]
  );
  const term = query.trim().toLowerCase();
  const matches = term
    ? simples.filter((item) => {
        const nomeItem = String(item.nome || item.name || '').toLowerCase();
        const codigo = String(item.codigo || '').toLowerCase();
        return nomeItem.includes(term) || codigo.includes(term);
      })
    : [];

  function addLine(item) {
    setLines((prev) => {
      if (prev.some((line) => line.produto_associado_id === String(item.id))) return prev;
      return [
        ...prev,
        {
          produto_associado_id: String(item.id),
          nome: item.nome || item.name,
          foto: item.foto || item.image,
          quantidade: '1',
          deduz_estoque_integral: true,
        },
      ];
    });
    setQuery('');
  }

  async function handlePhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    try {
      setFoto(await readLocalImage(file));
    } catch (err) {
      const message = err?.message || 'Não foi possível ler a foto.';
      setError(message);
      toast.error(message);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const preco = parseReaisInput(valor);
    if (!Number.isFinite(preco) || preco < 0) {
      setSaving(false);
      setError('Valor inválido.');
      return;
    }
    try {
      const payload = {
        nome,
        valor: preco,
        foto,
        itens: lines.map((line) => ({
          produto_associado_id: line.produto_associado_id,
          quantidade: Number(line.quantidade),
          deduz_estoque_integral: line.deduz_estoque_integral,
        })),
      };
      if (editing) await editCombo(combo.id, payload);
      else await addCombo(payload);
      toast.success(editing ? 'Combo atualizado.' : 'Combo cadastrado.');
      onSuccess?.();
      onCancel();
    } catch (err) {
      const message = err?.message || 'Não foi possível salvar o combo.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input label="Nome do combo" value={nome} onChange={(event) => setNome(event.target.value)} required />
        <Input
          label="Valor (R$)"
          inputMode="decimal"
          value={valor}
          onChange={(event) => setValor(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <FileField
          id="combo-photo"
          label="Foto"
          accept="image/*"
          onChange={handlePhoto}
          cleared={!foto}
        />
        {foto ? (
          <div className="flex items-center gap-3">
            <img src={foto} alt="" className="h-16 w-16 rounded-xl object-cover" />
            <Button type="button" variant="secondary" onClick={() => setFoto('')}>
              <Icon name="delete" />
              Remover foto
            </Button>
          </div>
        ) : (
          <p className="text-xs text-on-surface-variant pl-1">Arquivo local. Sem link.</p>
        )}
      </div>
      <Input
        label="Buscar produto"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Nome ou código"
      />
      {term && matches.length === 0 ? (
        <p className="text-sm text-error font-medium">
          Produto não encontrado. Cadastre em{' '}
          <Link
            to="/estoque"
            onClick={onCancel}
            className="underline font-semibold text-on-surface min-h-11 inline-flex items-center"
          >
            Estoque
          </Link>
          .
        </p>
      ) : null}
      {matches.length > 0 ? (
        <div className="flex flex-col gap-2">
          {matches.slice(0, 6).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => addLine(item)}
              className="w-full text-left flex items-center gap-3 px-4 min-h-11 rounded-2xl bg-surface-container-low text-on-surface"
            >
              <img alt="" src={item.foto || item.image} className="w-8 h-8 rounded-lg object-cover" />
              <span className="font-medium">{item.nome || item.name}</span>
            </button>
          ))}
        </div>
      ) : null}
      {lines.map((line) => (
        <div key={line.produto_associado_id} className="space-y-3">
          <LineFields>
            <div className="flex min-h-11 min-w-0 items-center gap-3">
              <img alt="" src={line.foto} className="h-10 w-10 rounded-lg object-cover" />
              <span className="min-w-0 font-semibold text-on-surface">{line.nome}</span>
            </div>
            <Input
              label="Quantidade"
              type="number"
              min="1"
              step="1"
              value={line.quantidade}
              onChange={(event) =>
                setLines((prev) =>
                  prev.map((row) =>
                    row.produto_associado_id === line.produto_associado_id
                      ? { ...row, quantidade: event.target.value }
                      : row
                  )
                )
              }
              required
            />
          </LineFields>
          <Button
            type="button"
            variant={line.deduz_estoque_integral ? 'primary' : 'secondary'}
            onClick={() =>
              setLines((prev) =>
                prev.map((row) =>
                  row.produto_associado_id === line.produto_associado_id
                    ? { ...row, deduz_estoque_integral: !row.deduz_estoque_integral }
                    : row
                )
              )
            }
          >
            <Icon name="inventory_2" />
            {line.deduz_estoque_integral ? 'Deduz estoque integral' : 'Não deduz estoque integral'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setLines((prev) => prev.filter((row) => row.produto_associado_id !== line.produto_associado_id))
            }
          >
            <Icon name="delete" />
            Remover
          </Button>
        </div>
      ))}
      {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="secondary" type="button" onClick={onCancel}>
          <Icon name="cancel" />
          Cancelar
        </Button>
        <Button type="submit" disabled={saving || !lines.length}>
          <Icon name={editing ? 'save' : 'add'} />
          {saving ? 'Salvando...' : editing ? 'Salvar combo' : 'Cadastrar combo'}
        </Button>
      </div>
    </form>
  );
}
