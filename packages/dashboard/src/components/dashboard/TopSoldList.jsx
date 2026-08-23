export function TopSoldList({ items = [] }) {
  return (
    <section className="space-y-4">
      <h3 className="font-display text-2xl uppercase tracking-wide">Mais saiu</h3>
      {!items.length ? (
        <p className="text-sm text-[var(--muted,#5c5c5c)]">Sem ranking ainda.</p>
      ) : (
        <ol className="space-y-3">
          {items.map((item, index) => (
            <li key={item.id} className="flex items-center gap-3 border-l-2 border-[var(--spray,#FFDB15)] pl-3">
              <span className="font-display text-lg w-6">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">{item.name}</p>
                <p className="text-xs text-[var(--muted,#5c5c5c)]">{item.category}</p>
              </div>
              <p className="font-mono text-sm">{item.orders}</p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
