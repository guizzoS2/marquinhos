import { Icon } from '../ui/Icon';
import { Pagination } from '../ui/Pagination';
import { PAGE_SIZE, usePagedList } from '../ui/usePagedList';

const rankToneClass = {
  secondary: 'bg-primary text-on-primary',
  slate: 'bg-on-surface text-white',
  muted: 'bg-surface-container text-on-surface',
};

export function TopSoldList({ items = [] }) {
  const page = usePagedList(items, items.map((item) => item.id).join('|'));

  return (
    <section className="bg-surface-container-lowest p-4 md:p-8 rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <h2 className="text-xl font-extrabold">Top 5 Vendidos</h2>
      </div>
      {!items.length ? (
        <p className="text-sm text-on-surface-variant">Nenhuma venda no período.</p>
      ) : null}
      <div className="space-y-6">
        {page.rows.map((item, index) => {
          const rank = page.current * PAGE_SIZE + index;
          return (
          <div
            key={item.id}
            className={`flex items-center gap-4 ${rank > 2 ? 'opacity-80' : ''}`}
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
      <div className="mt-6">
        <Pagination page={page.current} pageCount={page.pageCount} onPage={page.setPage} />
      </div>
    </section>
  );
}
