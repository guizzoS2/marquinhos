import { memo, useMemo, useState } from 'react';
import { isValid, parseISO } from 'date-fns';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { SearchField } from '../ui/SearchField';
import { PdvModal } from './PdvModal';
import { saleUnitPrice } from '../../services/catalogRules';
import { useCartDispatch } from '../../contexts/CartContext';

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function ProductPhoto({ src }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <span className="flex h-full w-full items-center justify-center text-on-surface-variant">
        <Icon name="inventory_2" className="text-4xl" />
      </span>
    );
  }
  return (
    <img
      alt=""
      src={src}
      onError={() => setBroken(true)}
      className="h-full w-full object-cover"
    />
  );
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
  const [detail, setDetail] = useState(null);

  const catalog = useMemo(() => {
    const pricedAt = parseISO(String(serverNow || ''));
    const valid = isValid(pricedAt);
    return items.map((item) => ({
      id: String(item.id),
      nome: item.nome || item.name || 'Produto',
      codigo: item.codigo || '',
      categoria: item.categoria || item.category || '',
      foto: item.foto || item.image || '',
      preco: valid ? saleUnitPrice(item, promotions, pricedAt) : saleUnitPrice(item, []),
      source: item,
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

  return (
    <section className="min-w-0 space-y-6">
      <div className="space-y-4">
        <SearchField wide value={query} onChange={setQuery} placeholder="Buscar produto" label="Buscar produto" />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map((name) => (
            <Button
              key={name}
              type="button"
              variant={category === name ? 'primary' : 'secondary'}
              className="shrink-0"
              onClick={() => setCategory(name)}
            >
              {name}
            </Button>
          ))}
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="rounded-2xl border border-outline bg-surface p-4 text-on-surface-variant">
          Nenhum produto encontrado.
        </p>
      ) : (
        <div className="max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
            {visible.map((item) => (
              <article
                key={item.id}
                className="relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-outline bg-surface"
              >
                <button
                  type="button"
                  className="flex min-h-11 w-full flex-col p-3 text-left hover:bg-surface-container-low"
                  onClick={() => setDetail(item)}
                >
                  <div className="aspect-[4/3] overflow-hidden rounded-xl bg-surface-container-low">
                    <ProductPhoto src={item.foto} />
                  </div>
                  <div className="mt-3 pr-14">
                    <p className="line-clamp-2 text-sm font-semibold text-on-surface">{item.nome}</p>
                    <p className="mt-1 font-headline text-lg font-extrabold text-on-surface">{money(item.preco)}</p>
                  </div>
                </button>
                <div className="absolute bottom-3 right-3">
                  <Button
                    type="button"
                    size="icon"
                    aria-label={`Adicionar ${item.nome}`}
                    onClick={() =>
                      dispatch({
                        type: 'add',
                        item: {
                          produto_id: item.id,
                          nome: item.nome,
                          codigo: item.codigo,
                          foto: item.foto,
                          valor_unitario: item.preco,
                        },
                      })
                    }
                  >
                    <Icon name="add" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
      {detail ? (
        <PdvModal title={detail.nome} icon="inventory_2" onClose={() => setDetail(null)}>
          <ProductSpecs item={detail} />
          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={() => setDetail(null)}>
              <Icon name="close" />
              Fechar
            </Button>
          </div>
        </PdvModal>
      ) : null}
    </section>
  );
});

function Spec({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-label font-bold uppercase text-on-surface-variant">{label}</p>
      <p className="break-words font-medium text-on-surface">
        {value == null || value === '' ? '—' : value}
      </p>
    </div>
  );
}

function ProductSpecs({ item }) {
  const source = item.source || {};
  const volume =
    source.volume_peso == null || source.volume_peso === '' ? '' : String(source.volume_peso);
  return (
    <div className="space-y-4">
      <div className="aspect-[4/3] overflow-hidden rounded-xl bg-surface-container-low">
        <ProductPhoto src={item.foto} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Spec label="Código" value={item.codigo} />
        <Spec label="Categoria" value={source.categoria || source.category || item.categoria} />
        <Spec label="Marca" value={source.marca} />
        <Spec label="Volume / peso" value={volume} />
        <Spec label="Medida" value={source.medida} />
        <Spec label="Estoque atual" value={source.stock} />
        <Spec label="Valor" value={money(item.preco)} />
      </div>
      <Spec label="Descrição" value={source.descricao || source.subtitle} />
    </div>
  );
}
