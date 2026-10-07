export function Tabs({ items, value, onChange, label = 'Seções' }) {
  return (
    <div className="relative">
      <div className="absolute inset-x-0 bottom-0 h-px bg-outline" aria-hidden="true" />
      <div
        role="tablist"
        aria-label={label}
        className="relative flex overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
              className={`relative shrink-0 px-4 min-h-11 text-sm whitespace-nowrap ${
                active ? 'font-bold text-on-surface' : 'font-medium text-on-surface-variant'
              }`}
            >
              {item.label}
              <span
                className={`absolute inset-x-0 bottom-0 z-10 h-0.5 ${active ? 'bg-primary' : 'bg-transparent'}`}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
