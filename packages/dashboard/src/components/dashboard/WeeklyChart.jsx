export function WeeklyChart({ data = [] }) {
  const heightMap = {
    15: 'h-[15%]',
    20: 'h-[20%]',
    30: 'h-[30%]',
    35: 'h-[35%]',
    40: 'h-[40%]',
    45: 'h-[45%]',
    50: 'h-[50%]',
    65: 'h-[65%]',
    75: 'h-[75%]',
    80: 'h-[80%]',
    85: 'h-[85%]',
    90: 'h-[90%]',
    95: 'h-[95%]',
    98: 'h-[98%]',
  };

  return (
    <section className="lg:col-span-2 space-y-4">
      <div>
        <h3 className="font-display text-2xl uppercase tracking-wide">Semana</h3>
        <p className="text-xs text-[var(--muted,#5c5c5c)]">Receita vs saída</p>
      </div>
      <div className="h-52 md:h-64 flex items-end justify-between gap-1 sm:gap-2 pt-4 border-t border-dashed border-[color-mix(in_srgb,var(--ink,#111)_18%,transparent)]">
        {data.map((item) => (
          <div key={item.day} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full flex items-end justify-center gap-1 h-full">
              <div
                className={`w-1/3 ${
                  item.highlight ? 'bg-[var(--spray,#FFDB15)]' : 'bg-[var(--spray,#FFDB15)]/40'
                } ${heightMap[item.revenue] || 'h-1/2'}`}
              />
              <div
                className={`w-1/3 bg-error/50 ${heightMap[item.expense] || 'h-1/3'}`}
              />
            </div>
            <span className="text-[10px] uppercase text-[var(--muted,#5c5c5c)]">{item.day}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
