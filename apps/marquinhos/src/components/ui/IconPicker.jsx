import { GENERAL_ICONS } from '../../services/taxonomyIcons';
import { Icon } from './Icon';

function IconGrid({ icons, value, onChange }) {
  return (
    <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
      {icons.map((item) => {
        const active = item.name === value;
        return (
          <button
            key={item.name}
            type="button"
            title={item.label}
            aria-label={item.label}
            aria-pressed={active}
            onClick={() => onChange(item.name)}
            className={`flex h-11 w-full items-center justify-center rounded-lg border transition-colors ${
              active
                ? 'border-primary bg-primary text-on-primary'
                : 'border-outline bg-surface text-on-surface hover:bg-surface-container-low'
            }`}
          >
            <Icon name={item.name} filled={active} className="text-2xl" />
          </button>
        );
      })}
    </div>
  );
}

export function IconPicker({ value, onChange, related = [], relatedLabel = 'Relacionados' }) {
  const generalOnly = GENERAL_ICONS.filter((item) => !related.some((row) => row.name === item.name));
  return (
    <fieldset className="space-y-3">
      <legend className="pl-1 text-xs font-label font-bold uppercase text-on-surface-variant">Ícone</legend>
      {related.length ? (
        <div className="space-y-2">
          <p className="pl-1 text-xs font-semibold text-on-surface-variant">{relatedLabel}</p>
          <IconGrid icons={related} value={value} onChange={onChange} />
        </div>
      ) : null}
      <div className="space-y-2">
        <p className="pl-1 text-xs font-semibold text-on-surface-variant">Gerais</p>
        <IconGrid icons={generalOnly} value={value} onChange={onChange} />
      </div>
    </fieldset>
  );
}
