import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const RECEITA = '#FFDB15';
const DESPESA = '#B31B25';
const AXIS = '#5C5C5C';
const GRID = '#E5E5E5';

function axisReais(value) {
  const number = Number(value) || 0;
  if (Math.abs(number) >= 1000) {
    return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(number / 1000)} mil`;
  }
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(number);
}

function TrendTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl px-3 py-2 shadow-sm">
      <p className="text-xs font-bold text-on-surface mb-1">{row.label}</p>
      <p className="text-xs text-on-surface">Receitas {row.revenueLabel}</p>
      <p className="text-xs text-error">Despesas {row.expenseLabel}</p>
    </div>
  );
}

export function TrendChart({ points = [], unit = 'dia' }) {
  const hasMovement = points.some((point) => point.revenue > 0 || point.expense > 0);
  const data = points.map((point) => ({
    label: point.label,
    Receitas: (point.revenue || 0) / 100,
    Despesas: (point.expense || 0) / 100,
    revenueLabel: point.revenueLabel,
    expenseLabel: point.expenseLabel,
  }));

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
        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="overview-receita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={RECEITA} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={RECEITA} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="overview-despesa" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={DESPESA} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={DESPESA} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                minTickGap={24}
                tick={{ fill: AXIS, fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                width={56}
                tickFormatter={axisReais}
                tick={{ fill: AXIS, fontSize: 12 }}
              />
              <Tooltip content={<TrendTooltip />} cursor={{ stroke: GRID }} />
              <Area
                type="monotone"
                dataKey="Receitas"
                stroke="#E6C400"
                strokeWidth={2.5}
                fill="url(#overview-receita)"
                dot={false}
                activeDot={{ r: 5, fill: RECEITA, stroke: '#111111', strokeWidth: 1 }}
              />
              <Area
                type="monotone"
                dataKey="Despesas"
                stroke={DESPESA}
                strokeWidth={2.5}
                fill="url(#overview-despesa)"
                dot={false}
                activeDot={{ r: 5, fill: DESPESA, stroke: '#FFFFFF', strokeWidth: 1 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
