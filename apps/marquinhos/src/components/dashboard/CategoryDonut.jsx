import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const SLICE_COLORS = ['#FFDB15', '#3D3D3D', '#B31B25', '#fb5151', '#5C5C5C', '#E6C400'];

const DOT = [
  'bg-primary',
  'bg-tertiary',
  'bg-error',
  'bg-error-container',
  'bg-on-surface-variant',
  'bg-primary-dim',
];

function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 shadow-sm">
      <p className="text-xs font-bold text-on-surface">{row.name}</p>
      <p className="text-xs text-on-surface-variant">
        {row.percent}% · {row.value}
      </p>
    </div>
  );
}

export function CategoryDonut({ slices = [], total = 'R$ 0,00' }) {
  return (
    <section className="bg-surface-container-lowest p-4 md:p-8 rounded-xl shadow-sm min-w-0">
      <h2 className="text-xl font-extrabold tracking-tight mb-6">Vendas por Categoria</h2>
      {!slices.length ? (
        <p className="text-sm text-on-surface-variant">Sem vendas no período.</p>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-56 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="share"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="82%"
                  paddingAngle={slices.length > 1 ? 3 : 0}
                  cornerRadius={8}
                  startAngle={90}
                  endAngle={-270}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                >
                  {slices.map((slice, index) => (
                    <Cell key={slice.id} fill={SLICE_COLORS[index % SLICE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">Total</p>
              <p className="text-sm font-black text-on-surface text-center px-10">{total}</p>
            </div>
          </div>
          <ul className="w-full space-y-2">
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
