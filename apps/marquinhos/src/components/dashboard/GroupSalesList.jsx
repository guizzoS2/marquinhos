import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const SLICE_COLORS = ['#FFDB15', '#3D3D3D', '#B31B25', '#fb5151', '#5C5C5C'];

const DOT = ['bg-primary', 'bg-tertiary', 'bg-error', 'bg-error-container', 'bg-on-surface-variant'];

function formatReais(cents) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((Number(cents) || 0) / 100);
}

function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 shadow-sm">
      <p className="text-xs font-bold text-on-surface">{row.name}</p>
      <p className="text-xs text-on-surface-variant">
        {row.percent}% · {row.value}
      </p>
    </div>
  );
}

export function GroupSalesList({ slices = [] }) {
  const rows = slices.slice(0, 5);
  const totalCents = rows.reduce((sum, row) => sum + (Number(row.cents) || 0), 0);

  return (
    <section className="flex h-full min-w-0 flex-col rounded-xl border border-outline bg-surface p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-extrabold">Vendas por grupo</h2>
      </div>
      {!rows.length ? (
        <p className="text-sm text-on-surface-variant">Sem vendas no período.</p>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 md:flex-row md:items-center">
          <div className="relative h-44 w-44 shrink-0 md:h-52 md:w-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rows}
                  dataKey="cents"
                  nameKey="name"
                  innerRadius="62%"
                  outerRadius="82%"
                  paddingAngle={rows.length > 1 ? 3 : 0}
                  cornerRadius={8}
                  startAngle={90}
                  endAngle={-270}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                >
                  {rows.map((slice, index) => (
                    <Cell key={slice.id} fill={SLICE_COLORS[index % SLICE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<DonutTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[10px] uppercase text-on-surface-variant">Total</p>
              <p className="px-8 text-center text-xs font-black text-on-surface md:text-sm">{formatReais(totalCents)}</p>
            </div>
          </div>
          <ul className="w-full min-w-0 flex-1 divide-y divide-outline-variant">
            {rows.map((slice, index) => (
              <li key={slice.id} className="flex min-h-12 items-center gap-3 py-3 first:pt-0 last:pb-0">
                <span className={`h-3 w-3 shrink-0 rounded-full ${DOT[index % DOT.length]}`} />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-on-surface">{slice.name}</span>
                <span className="shrink-0 text-right text-xs text-on-surface-variant">
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
