export function SegmentedControl({
  items,
  value,
  onChange,
  label = 'Opções',
  className = '',
  variant = 'surface',
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`inline-flex h-11 items-stretch gap-1 rounded-xl border border-outline bg-surface p-1 ${className || 'w-fit'}`}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`h-full min-h-0 flex-1 rounded-lg px-4 text-sm whitespace-nowrap ${
              active
                ? variant === 'primary'
                  ? 'bg-primary font-bold text-on-primary'
                  : 'bg-surface font-bold text-on-surface shadow-sm'
                : 'font-normal text-on-surface'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
