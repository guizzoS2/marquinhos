import { Icon } from '../ui/Icon';

const rankToneClass = {
  secondary: 'bg-primary text-on-primary',
  slate: 'bg-on-surface text-white',
  muted: 'bg-surface-container text-on-surface',
};

export function TopSoldList({ items = [] }) {
  return (
    <section className="bg-surface-container-lowest p-8 rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-extrabold tracking-tight">Top 5 Vendidos</h2>
        <button type="button" className="text-xs font-bold text-on-surface hover:underline">
          Ver todos
        </button>
      </div>
      <div className="space-y-6">
        {items.map((item, index) => (
          <div
            key={item.id}
            className={`flex items-center gap-4 ${index > 2 ? 'opacity-80' : ''}`}
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
                  {index + 1}
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
                Pedidos
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
