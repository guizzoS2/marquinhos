export function Tabs({ items, value, onChange }) {
  return (
    <div className="border-b border-outline overflow-x-auto">
      <div className="flex" role="tablist">
        {items.map((item) => {
          const active = item.id === value;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(item.id)}
              className={`px-4 min-h-11 text-sm whitespace-nowrap border-b-2 -mb-px ${
                active
                  ? 'font-semibold text-on-surface border-primary'
                  : 'font-medium text-on-surface-variant border-transparent'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
