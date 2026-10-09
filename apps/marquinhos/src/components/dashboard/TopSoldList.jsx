import { Icon } from '../ui/Icon';

const rankToneClass = {
  secondary: 'bg-primary text-on-primary',
  slate: 'bg-on-surface text-white',
  muted: 'bg-surface-container text-on-surface',
};

export function TopSoldList({ items = [] }) {
  return (
    <section className="h-full bg-surface border border-outline rounded-xl p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold">Top 5 vendidos</h2>
      </div>
      {!items.length ? (
        <p className="text-sm text-on-surface-variant">Nenhuma venda no período.</p>
      ) : null}
      <div className="divide-y divide-outline-variant">
        {items.map((item, index) => {
          const rank = index;
          return (
          <div
            key={item.id}
            className={`flex items-center gap-4 py-3 first:pt-0 last:pb-0 ${rank > 2 ? 'opacity-80' : ''}`}
          >
            {item.image ? (
              <div className="relative">
                <img
                  alt={item.name}
                  className="w-12 h-12 rounded-lg object-cover"
                  src={item.image}
                />
                <span
                  className={`absolute -top-2 -right-2 text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full ${rankToneClass[item.rankTone] || 'bg-primary text-on-primary'}`}
                >
                  {rank + 1}
                </span>
              </div>
            ) : (
              <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center">
                <Icon name={item.icon} className="text-on-surface-variant" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold truncate">{item.name}</h4>
              <p className="text-xs text-on-surface-variant">{item.category}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-black">{item.orders}</p>
              <p className="text-[10px] text-on-surface-variant uppercase font-bold">
                Unidades
              </p>
            </div>
          </div>
          );
        })}
      </div>
    </section>
  );
}
