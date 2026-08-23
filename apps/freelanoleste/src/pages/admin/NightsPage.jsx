import { useEffect, useMemo, useState } from 'react';
import { fetchNightContracts } from '../../services/adminApi';
import { formatBrl } from '../../services/money';
import { subscribeFreelaStore } from '../../services/freelaStore';
import { stripeStatusLabel, subscribePlatformStore } from '../../services/platformStore';

export function AdminNightsPage() {
  const [rows, setRows] = useState(() => fetchNightContracts());
  const [filters, setFilters] = useState({ date: '', tenantId: '', status: '' });
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const refresh = () => setRows(fetchNightContracts());
    refresh();
    const offPlatform = subscribePlatformStore(refresh);
    const offFreela = subscribeFreelaStore(refresh);
    return () => {
      offPlatform();
      offFreela();
    };
  }, []);

  const tenants = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      if (row.tenantId && !map.has(row.tenantId)) {
        map.set(row.tenantId, row.tenantName);
      }
    });
    return [...map.entries()];
  }, [rows]);

  const statuses = useMemo(
    () => [...new Set(rows.map((row) => row.status).filter(Boolean))],
    [rows]
  );

  const visible = rows.filter((row) => {
    if (filters.date && row.date !== filters.date) return false;
    if (filters.tenantId && row.tenantId !== filters.tenantId) return false;
    if (filters.status && row.status !== filters.status) return false;
    return true;
  });

  const selected = visible.find((row) => row.id === selectedId) || null;

  return (
    <div className="space-y-8 max-w-6xl">
      <section className="space-y-2">
        <h2 className="font-display text-4xl uppercase tracking-wide">Noites</h2>
        <p className="text-sm text-[var(--muted)]">
          Contratos por noite. Transcript só leitura. Sem editar valor.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="block space-y-2">
          <span className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
            Data
          </span>
          <input
            type="date"
            value={filters.date}
            onChange={(event) => setFilters((prev) => ({ ...prev, date: event.target.value }))}
            className="bar-field w-full min-h-11 px-3 py-3"
          />
        </label>
        <label className="block space-y-2">
          <span className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
            Bar
          </span>
          <select
            value={filters.tenantId}
            onChange={(event) => setFilters((prev) => ({ ...prev, tenantId: event.target.value }))}
            className="bar-field w-full min-h-11 px-3 py-3"
          >
            <option value="">Todos</option>
            {tenants.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="font-display text-sm tracking-widest uppercase text-[var(--muted)]">
            Status
          </span>
          <select
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            className="bar-field w-full min-h-11 px-3 py-3"
          >
            <option value="">Todos</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className="overflow-x-auto">
        <table className="bar-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Bar</th>
              <th>Freela</th>
              <th className="text-right">Valor</th>
              <th>Trail</th>
              <th>Status</th>
              <th>Stripe</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={row.id}
                className={selectedId === row.id ? 'bg-[var(--sheet)]' : 'cursor-pointer'}
                onClick={() => setSelectedId(row.id === selectedId ? null : row.id)}
              >
                <td>{row.date || '—'}</td>
                <td>
                  <p>{row.tenantName}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {stripeStatusLabel[row.stripeStatus] || row.stripeStatus}
                  </p>
                </td>
                <td>{row.freelaName}</td>
                <td className="text-right font-mono">{formatBrl(row.lastAmount)}</td>
                <td>
                  {row.isNegotiable ? 'Negociável' : 'Travado'}
                  {row.amount !== row.lastAmount ? (
                    <span className="block text-xs text-[var(--muted)]">
                      {formatBrl(row.amount)} → {formatBrl(row.lastAmount)}
                    </span>
                  ) : null}
                </td>
                <td>{row.statusLabel}</td>
                <td>{row.stripeId || 'mock'}</td>
                <td>
                  {row.reviewUnlocked
                    ? `${row.reviewGiven ? 'freela' : '—'} / ${row.reviewReceived ? 'bar' : '—'}`
                    : 'Não'}
                </td>
              </tr>
            ))}
            {!visible.length ? (
              <tr>
                <td colSpan={8} className="text-[var(--muted)]">
                  Nenhum contrato neste filtro.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selected ? (
        <section className="bar-block space-y-3">
          <h3 className="font-display text-2xl uppercase">
            {selected.title || 'Transcript'} · {selected.freelaName}
          </h3>
          <p className="text-sm text-[var(--muted)]">
            Chat só leitura. Valor atual {formatBrl(selected.lastAmount)}.
          </p>
          <ul className="space-y-3">
            {selected.messages.map((message) => (
              <li key={message.id} className="border-b border-dashed border-[color-mix(in_srgb,var(--ink)_18%,transparent)] pb-3">
                <p className="text-[10px] tracking-[0.2em] uppercase text-[var(--muted)]">
                  {message.from} · {message.type}
                </p>
                <p className="text-sm mt-1">{message.text}</p>
              </li>
            ))}
            {!selected.messages.length ? (
              <li className="text-sm text-[var(--muted)]">Sem mensagens nesta sala.</li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
