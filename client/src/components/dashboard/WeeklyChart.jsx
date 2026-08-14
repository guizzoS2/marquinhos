const heightMap = {
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

export function WeeklyChart({ data = [] }) {
  return (
    <section className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-xl shadow-sm space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Performance Semanal</h2>
          <p className="text-sm text-on-surface-variant">
            Comparativo de Receita vs. Despesas
          </p>
        </div>
        <div className="flex gap-4 text-xs font-bold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span className="text-on-surface-variant">Receita</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-error-container" />
            <span className="text-on-surface-variant">Despesas</span>
          </div>
        </div>
      </div>
      <div className="h-64 flex items-end justify-between gap-4 pt-4 px-2">
        {data.map((item) => (
          <div key={item.day} className="flex-1 flex flex-col items-center gap-2 group">
            <div className="w-full flex items-end justify-center gap-1 h-full">
              <div
                className={`w-1/3 rounded-t-md transition-all ${
                  item.highlight
                    ? 'bg-primary shadow-lg shadow-primary/10'
                    : 'bg-primary/20 group-hover:bg-primary/30'
                } ${heightMap[item.revenue] || 'h-1/2'}`}
              />
              <div
                className={`w-1/3 bg-error-container/20 rounded-t-md ${heightMap[item.expense] || 'h-1/3'}`}
              />
            </div>
            <span
              className={`text-[10px] font-bold ${
                item.highlight ? 'text-on-surface' : 'text-on-surface-variant'
              }`}
            >
              {item.day}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
