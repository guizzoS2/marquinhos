export function SegmentedControl({ items, value, onChange, label = 'Opções' }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex w-fit items-center gap-1 rounded-xl bg-surface-container-low p-1"
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
            className={`min-h-11 px-4 rounded-lg text-sm whitespace-nowrap ${
              active
                ? 'bg-surface font-bold text-on-surface shadow-sm'
                : 'font-medium text-on-surface-variant'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
