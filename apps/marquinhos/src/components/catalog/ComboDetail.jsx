import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

export function ComboDetail({ combo, parts = [], onCancel }) {
  if (!combo) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        {combo.foto || combo.image ? (
          <img
            alt=""
            src={combo.foto || combo.image}
            className="h-20 w-20 shrink-0 rounded-xl object-cover"
          />
        ) : null}
        <div className="space-y-2">
          <p className="text-xs font-label font-bold text-on-surface-variant uppercase">
            Código {combo.codigo || '—'}
          </p>
          <h4 className="font-headline text-2xl font-bold text-on-surface">{combo.nome || combo.name}</h4>
          <p className="text-on-surface font-medium">{combo.valor_unitario || combo.cost}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {parts.map((part) => (
          <div key={part.produto_associado_id} className="flex items-center gap-3">
            <img alt="" src={part.foto} className="w-12 h-12 rounded-xl object-cover" />
            <div>
              <p className="font-semibold text-on-surface">{part.nome}</p>
              <p className="text-sm text-on-surface-variant">
                {part.quantidade} un ·{' '}
                {part.deduz_estoque_integral ? 'Deduz estoque integral' : 'Não deduz estoque integral'}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Button type="button" variant="secondary" onClick={onCancel}>
          <Icon name="close" />
          Fechar
        </Button>
      </div>
    </div>
  );
}
