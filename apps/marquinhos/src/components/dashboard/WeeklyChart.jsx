function filledRows(percent) {
  const count = Math.max(0, Math.min(10, Math.round(Number(percent) / 10)));
  return Array.from({ length: 10 }, (_, index) => index >= 10 - count);
}

function Bar({ filled, className, label }) {
  const top = filled.findIndex(Boolean);
  return (
    <div className="w-1/2 h-full grid grid-rows-10" title={label}>
      {filled.map((on, index) => (
        <div key={index} className={on ? `${className} ${index === top ? 'rounded-t-sm' : ''}` : ''} />
      ))}
    </div>
  );
}

export function WeeklyChart({ data = [], title = 'Performance Semanal' }) {
  const hasValue = data.some((item) => Number(item.revenue) > 0 || Number(item.expense) > 0);

  return (
    <section className="lg:col-span-2 bg-surface-container-lowest p-4 md:p-8 rounded-xl shadow-sm space-y-6 min-w-0">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
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
      {hasValue ? (
        <div className="overflow-x-auto">
          <div className="h-52 md:h-64 flex items-stretch gap-1 min-w-max">
            {data.map((item, index) => (
              <div
                key={`${item.day}-${index}`}
                className="w-8 sm:w-10 md:w-auto md:flex-1 md:min-w-8 h-full flex flex-col"
              >
                <div className="flex-1 min-h-0 flex items-stretch gap-0.5">
                  <Bar
                    filled={filledRows(item.revenue)}
                    label={`Receita ${item.revenueLabel || ''}`}
                    className={item.highlight ? 'bg-primary' : 'bg-primary/60'}
                  />
                  <Bar
                    filled={filledRows(item.expense)}
                    label={`Despesa ${item.expenseLabel || ''}`}
                    className="bg-error-container"
                  />
                </div>
                <span
                  className={`h-5 text-[10px] font-bold text-center truncate ${
                    item.highlight ? 'text-on-surface' : 'text-on-surface-variant'
                  }`}
                >
                  {item.day}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-on-surface-variant">Sem movimentação neste período.</p>
      )}
    </section>
  );
}
