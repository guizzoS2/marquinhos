import { memo, useMemo, useState } from 'react';
import { isValid, parseISO } from 'date-fns';
import { Input } from '../ui/Input';
import { saleUnitPrice } from '../../services/catalogRules';
import { useCartDispatch } from '../../contexts/CartContext';

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const PdvSearch = memo(function PdvSearch({ items = [], promotions = [], serverNow }) {
  const dispatch = useCartDispatch();
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return items
      .filter((item) => {
        const nome = String(item.nome || item.name || '').toLowerCase();
        const codigo = String(item.codigo || '').toLowerCase();
        return nome.includes(term) || codigo.includes(term);
      })
      .slice(0, 8);
  }, [items, query]);

  return (
    <section className="bg-surface-container-lowest rounded-2xl p-4 md:p-6 space-y-4">
      <h3 className="font-headline text-xl font-bold text-on-surface">Buscar produto</h3>
      <Input
        label="Nome ou código"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar produto"
        autoComplete="off"
      />
      {query.trim() && matches.length === 0 ? (
        <p className="text-sm text-on-surface-variant">Nenhum produto encontrado.</p>
      ) : null}
      <div className="flex flex-col gap-2">
        {matches.map((item) => {
          const pricedAt = parseISO(String(serverNow || ''));
          const preco = isValid(pricedAt) ? saleUnitPrice(item, promotions, pricedAt) : saleUnitPrice(item, []);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                dispatch({
                  type: 'add',
                  item: {
                    produto_id: String(item.id),
                    nome: item.nome || item.name,
                    codigo: item.codigo || '',
                    valor_unitario: preco,
                  },
                })
              }
              className="w-full text-left flex items-center gap-3 px-4 min-h-11 rounded-2xl bg-surface-container-low text-on-surface"
            >
              <img alt="" src={item.foto || item.image} className="w-10 h-10 rounded-lg object-cover" />
              <span className="flex-1 font-medium">
                {item.codigo ? `${item.codigo} · ` : ''}
                {item.nome || item.name}
              </span>
              <span className="font-semibold">{money(preco)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
});
