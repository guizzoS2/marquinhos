import { useCartDispatch } from '../../contexts/CartContext';

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function OpenComandas({ sales = [] }) {
  const dispatch = useCartDispatch();
  const open = sales.filter((sale) => sale.status === 'aberta');

  function load(sale) {
    dispatch({
      type: 'load',
      saleId: sale.id,
      numeroComanda: sale.numero_comanda,
      clienteId: sale.cliente_id ? String(sale.cliente_id) : '',
      lines: (sale.itens || []).map((item) => ({
        produto_id: String(item.produto_id),
        nome: item.nome,
        codigo: '',
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
      })),
    });
  }

  return (
    <section className="space-y-4">
      <h3 className="font-headline text-xl font-bold text-on-surface">Comandas abertas</h3>
      {open.length === 0 ? (
        <p className="text-on-surface-variant">Nenhuma comanda aberta.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {open.map((sale) => (
            <button
              key={sale.id}
              type="button"
              onClick={() => load(sale)}
              className="w-full text-left bg-surface-container-lowest rounded-2xl p-6 min-h-11 transition-all hover:shadow-xl hover:shadow-on-surface/5"
            >
              <p className="font-headline text-3xl font-extrabold text-on-surface">
                {sale.numero_comanda}
              </p>
              <p className="text-on-surface-variant mt-1">{sale.cliente_nome || 'Consumidor'}</p>
              <p className="font-headline text-xl font-bold text-on-surface mt-3">{money(sale.total)}</p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
