import { useMemo, useState } from 'react';
import { addInventory, fetchInventory } from '../../services/tenantOpsApi';
import { DataTable } from '../../components/admin/DataTable';
import { Button } from '../../components/Button';
import { SubscriptionBanner, isOpsWritable } from '../../components/bar/SubscriptionBanner';

const categories = ['Geral', 'Cervejas', 'Destilados', 'Insumos', 'Soft Drinks'];

export function InventoryPage() {
  const writable = useMemo(() => isOpsWritable(), []);
  const [rows, setRows] = useState(() => fetchInventory());
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('un');
  const [category, setCategory] = useState('Geral');
  const [minStock, setMinStock] = useState('4');
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      setRows(addInventory({ name, qty, unit, category, minStock }));
      setName('');
      setQty('');
      setUnit('un');
      setCategory('Geral');
      setMinStock('4');
    } catch (err) {
      setError(err.message || 'Não foi possível incluir.');
    }
  }

  return (
    <div className="space-y-6 md:space-y-8 max-w-5xl">
      <section className="space-y-2">
        <h2 className="font-headline text-2xl md:text-3xl font-extrabold tracking-tight">
          Estoque
        </h2>
        <p className="text-on-surface-variant text-sm">
          Cadastro de produto deste tenant. Freela da plataforma não acessa este estoque.
        </p>
      </section>

      <SubscriptionBanner />

      <form className="grid grid-cols-1 md:grid-cols-2 gap-3 items-end" onSubmit={handleSubmit}>
        <label className="block space-y-2 md:col-span-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
            Produto
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={!writable}
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
            required
          />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
            Categoria
          </span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            disabled={!writable}
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
            Unidade
          </span>
          <input
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            disabled={!writable}
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
            Qtd
          </span>
          <input
            type="number"
            min="0"
            step="1"
            value={qty}
            onChange={(event) => setQty(event.target.value)}
            disabled={!writable}
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
            Mínimo
          </span>
          <input
            type="number"
            min="0"
            step="1"
            value={minStock}
            onChange={(event) => setMinStock(event.target.value)}
            disabled={!writable}
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
          />
        </label>
        <Button type="submit" className="w-full md:w-auto md:col-span-2" disabled={!writable}>
          Cadastrar produto
        </Button>
      </form>
      {error ? <p className="text-sm text-error">{error}</p> : null}

      {rows.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Estoque vazio.</p>
      ) : (
        <>
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((row) => (
              <article key={row.id} className="bg-surface-container-lowest rounded-2xl p-4 space-y-1">
                <p className="font-bold">{row.name}</p>
                <p className="text-sm">
                  {row.qty} {row.unit} · mín. {row.minStock ?? 4}
                </p>
                <p className="text-xs text-on-surface-variant">{row.category || 'Geral'}</p>
              </article>
            ))}
          </div>
          <div className="hidden md:block">
            <DataTable columns={['Produto', 'Categoria', 'Qtd', 'Mínimo', 'Unidade']}>
              {rows.map((row) => (
                <tr key={row.id} className="bg-surface-container-lowest">
                  <td className="px-4 md:px-6 py-4 font-bold whitespace-nowrap">{row.name}</td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">{row.category || 'Geral'}</td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">{row.qty}</td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">{row.minStock ?? 4}</td>
                  <td className="px-4 md:px-6 py-4 whitespace-nowrap">{row.unit}</td>
                </tr>
              ))}
            </DataTable>
          </div>
        </>
      )}
    </div>
  );
}
