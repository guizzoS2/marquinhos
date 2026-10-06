import { memo, useMemo, useState } from 'react';
import { isValid, parseISO } from 'date-fns';
import { Input } from '../ui/Input';
import { Pagination } from '../ui/Pagination';
import { usePagedList } from '../ui/usePagedList';
import { saleUnitPrice } from '../../services/catalogRules';
import { useCartDispatch } from '../../contexts/CartContext';

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const PdvCatalog = memo(function PdvCatalog({
  items = [],
  promotions = [],
  serverNow,
  filters = [],
}) {
  const dispatch = useCartDispatch();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');

  const catalog = useMemo(() => {
    const pricedAt = parseISO(String(serverNow || ''));
    const valid = isValid(pricedAt);
    return items.map((item) => ({
      id: String(item.id),
      nome: item.nome || item.name || 'Produto',
      codigo: item.codigo || '',
      categoria: item.categoria || item.category || '',
      foto: item.foto || item.image,
      preco: valid ? saleUnitPrice(item, promotions, pricedAt) : saleUnitPrice(item, []),
    }));
  }, [items, promotions, serverNow]);

  const categories = useMemo(() => {
    const names = catalog.map((item) => item.categoria).filter(Boolean);
    const fromFilters = (filters || []).filter((name) => name && name !== 'Todos');
    return ['Todos', ...new Set([...fromFilters, ...names])];
  }, [catalog, filters]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return catalog.filter((item) => {
      if (category !== 'Todos' && item.categoria !== category) return false;
      if (!term) return true;
      const nome = item.nome.toLowerCase();
      const codigo = item.codigo.toLowerCase();
      return nome.includes(term) || codigo.includes(term);
    });
  }, [catalog, category, query]);
  const catalogPage = usePagedList(visible, `${category}|${query}`);

  return (
    <section className="min-w-0 space-y-4">
      <Input
        label="Buscar produto"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Nome ou código"
        autoComplete="off"
      />
      <div className="flex gap-2 overflow-x-auto">
        {categories.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setCategory(name)}
            className={
              category === name
                ? 'shrink-0 px-4 min-h-11 rounded-xl bg-primary text-on-primary font-semibold'
                : 'shrink-0 px-4 min-h-11 rounded-xl bg-surface-container-low text-on-surface-variant'
            }
          >
            {name}
          </button>
        ))}
      </div>
      <div>
        {visible.length === 0 ? (
          <p className="text-on-surface-variant">Nenhum produto encontrado.</p>
        ) : (
          <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {catalogPage.rows.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  dispatch({
                    type: 'add',
                    item: {
                      produto_id: item.id,
                      nome: item.nome,
                      codigo: item.codigo,
                      valor_unitario: item.preco,
                    },
                  })
                }
                className="text-left bg-surface-container-lowest rounded-2xl p-3 min-h-11"
              >
                <img alt="" src={item.foto} className="w-full h-24 object-cover rounded-xl" />
                <p className="font-semibold text-on-surface mt-2">{item.nome}</p>
                <p className="font-headline font-extrabold text-on-surface">{money(item.preco)}</p>
              </button>
            ))}
          </div>
          <Pagination state={catalogPage} />
          </div>
        )}
      </div>
    </section>
  );
});
