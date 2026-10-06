function coords(points, key, width, height, max) {
  const count = points.length;
  return points.map((point, index) => {
    const x = count === 1 ? width / 2 : (index / (count - 1)) * width;
    const y = height - (point[key] / max) * height;
    return { x, y };
  });
}

function linePath(points) {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
}

function areaPath(points, baseline) {
  if (!points.length) return '';
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath(points)} L${last.x.toFixed(2)} ${baseline} L${first.x.toFixed(2)} ${baseline} Z`;
}

export function TrendChart({ points = [], unit = 'dia' }) {
  const width = 640;
  const height = 200;
  const max = Math.max(1, ...points.map((point) => Math.max(point.revenue || 0, point.expense || 0)));
  const revenue = coords(points, 'revenue', width, height, max);
  const expense = coords(points, 'expense', width, height, max);
  const hasMovement = points.some((point) => point.revenue > 0 || point.expense > 0);

  return (
    <section className="bg-surface-container-lowest p-4 md:p-8 rounded-xl shadow-sm lg:col-span-2 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Receitas vs Despesas</h2>
          <p className="text-xs text-on-surface-variant">Agrupado por {unit}</p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs font-semibold">
          <span className="inline-flex items-center gap-2 text-on-surface">
            <span className="w-3 h-3 rounded-full bg-primary" />
            Receitas
          </span>
          <span className="inline-flex items-center gap-2 text-on-surface">
            <span className="w-3 h-3 rounded-full bg-error" />
            Despesas
          </span>
        </div>
      </div>
      {!hasMovement ? (
        <p className="text-sm text-on-surface-variant">Sem movimentação neste período.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[36rem] lg:min-w-0">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40 md:h-56" role="img" aria-label="Receitas e despesas no período">
              <path d={areaPath(revenue, height)} className="fill-primary/40" />
              <path d={areaPath(expense, height)} className="fill-error/25" />
              <path d={linePath(revenue)} className="fill-none stroke-primary stroke-2" />
              <path d={linePath(expense)} className="fill-none stroke-error stroke-2" />
              {revenue.map((point, index) => (
                <circle key={`r-${points[index].label}-${index}`} cx={point.x} cy={point.y} r="4" className="fill-primary">
                  <title>{`${points[index].label}: Receitas ${points[index].revenueLabel}`}</title>
                </circle>
              ))}
              {expense.map((point, index) => (
                <circle key={`e-${points[index].label}-${index}`} cx={point.x} cy={point.y} r="4" className="fill-error">
                  <title>{`${points[index].label}: Despesas ${points[index].expenseLabel}`}</title>
                </circle>
              ))}
            </svg>
            <div className="flex justify-between gap-1 mt-2">
              {points.map((point, index) => (
                <span key={`${point.label}-${index}`} className="text-[10px] text-on-surface-variant text-center flex-1 truncate">
                  {point.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
