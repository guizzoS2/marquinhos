import { Button } from '../ui/Button';

function Field({ label, value }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest">
        {label}
      </p>
      <p className="text-on-surface font-medium break-words">{value || '—'}</p>
    </div>
  );
}

export function ProductDetail({ item, canDelete, onEdit, onDelete, onCancel }) {
  if (!item) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <img
          alt=""
          src={item.foto || item.image}
          className="w-20 h-20 rounded-2xl object-cover shrink-0 bg-surface"
        />
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest">
            Código {item.codigo || '—'}
          </p>
          <h4 className="font-headline text-2xl font-bold text-on-surface break-words">{item.nome}</h4>
          {item.lowStock ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-error-container/10 text-error-dim border border-error/20">
              <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />
              Estoque Baixo
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-secondary-container/20 text-on-secondary-fixed-variant">
              Estável
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Marca" value={item.marca} />
        <Field label="Categoria" value={item.categoria || item.category} />
        <Field label="Unidade" value={item.unidade} />
        <Field label="Valor unitário" value={item.valor_unitario || item.cost} />
        <Field label="Estoque atual" value={item.stock} />
        <Field label="Estoque sugerido" value={item.minStock} />
      </div>
      <Field label="Descrição" value={item.descricao || item.subtitle} />

      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="secondary" type="button" onClick={onCancel}>
          Fechar
        </Button>
        {canDelete ? (
          <Button variant="danger" type="button" onClick={onDelete}>
            Apagar
          </Button>
        ) : null}
        <Button type="button" onClick={onEdit}>
          Editar
        </Button>
      </div>
    </div>
  );
}
