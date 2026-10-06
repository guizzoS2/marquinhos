const SLICE = [
  'stroke-primary',
  'stroke-tertiary',
  'stroke-error',
  'stroke-error-container',
  'stroke-on-surface-variant',
  'stroke-primary-dim',
];

const DOT = [
  'bg-primary',
  'bg-tertiary',
  'bg-error',
  'bg-error-container',
  'bg-on-surface-variant',
  'bg-primary-dim',
];

export function CategoryDonut({ slices = [], total = 'R$ 0,00' }) {
  const rings = [];
  let cursor = 0;
  slices.forEach((slice, index) => {
    const length = slice.share * 100;
    rings.push({
      id: slice.id,
      dash: length >= 100 ? '100 0.001' : `${length} ${100 - length}`,
      offset: cursor,
      className: SLICE[index % SLICE.length],
    });
    cursor += length;
  });

  return (
    <section className="bg-surface-container-lowest p-4 md:p-8 rounded-xl shadow-sm min-w-0">
      <h2 className="text-xl font-extrabold tracking-tight mb-6">Vendas por Categoria</h2>
      {!slices.length ? (
        <p className="text-sm text-on-surface-variant">Sem vendas no período.</p>
      ) : (
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-44 h-44">
            <svg viewBox="0 0 42 42" className="w-full h-full" aria-hidden="true">
              <g transform="rotate(-90 21 21)">
                <circle cx="21" cy="21" r="15.9155" strokeWidth="6" className="fill-none stroke-surface-container" />
                {rings.map((ring) => (
                  <circle
                    key={ring.id}
                    cx="21"
                    cy="21"
                    r="15.9155"
                    strokeWidth="6"
                    strokeDasharray={ring.dash}
                    strokeDashoffset={-ring.offset}
                    className={`fill-none ${ring.className}`}
                  />
                ))}
              </g>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">Total</p>
              <p className="text-sm font-black text-on-surface">{total}</p>
            </div>
          </div>
          <ul className="w-full space-y-3">
            {slices.map((slice, index) => (
              <li key={slice.id} className="flex items-center gap-3 min-h-11">
                <span className={`w-3 h-3 rounded-full shrink-0 ${DOT[index % DOT.length]}`} />
                <span className="text-sm font-semibold text-on-surface truncate flex-1">{slice.name}</span>
                <span className="text-xs text-on-surface-variant shrink-0">
                  {slice.percent}% · {slice.value}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
