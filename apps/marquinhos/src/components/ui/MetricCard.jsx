import { Children } from 'react';
import { Icon } from '../ui/Icon';

const badgeClasses = {
  positive: 'text-on-surface font-semibold text-xs bg-primary px-2 py-1 rounded-full',
  neutral: 'text-on-surface-variant text-xs bg-surface-container/50 px-2 py-1 rounded-full',
  critical: 'text-error font-bold text-xs animate-pulse',
};

export function MetricCard({ label, value, badge, badgeTone = 'neutral', icon, valueTone, onClick }) {
  const className = `h-full min-w-0 bg-surface border border-outline rounded-xl p-4 md:p-5 text-left ${onClick ? 'w-full cursor-pointer' : ''}`;
  const body = (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-lg bg-primary text-on-primary flex items-center justify-center shrink-0">
            <Icon name={icon} filled className="text-2xl" />
          </div>
          <p className="text-sm font-medium text-on-surface">{label}</p>
        </div>
        {badge ? <span className={badgeClasses[badgeTone]}>{badge}</span> : null}
      </div>
      <h3
        className={`text-3xl font-black font-headline mt-3 leading-tight break-words ${
          valueTone === 'negative' ? 'text-error' : 'text-on-surface'
        }`}
      >
        {value}
      </h3>
    </>
  );
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    );
  }
  return <div className={className}>{body}</div>;
}

const rowCols = {
  1: 'md:grid-cols-1',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-3',
  4: 'md:grid-cols-4',
  5: 'md:grid-cols-5',
};

function rowSizes(count, max = 5) {
  if (count <= 0) return [];
  const rowCount = Math.ceil(count / max);
  const base = Math.floor(count / rowCount);
  let extra = count % rowCount;
  return Array.from({ length: rowCount }, () => {
    const size = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra -= 1;
    return size;
  });
}

export function MetricGrid({ children }) {
  const items = Children.toArray(children);
  const sizes = rowSizes(items.length);
  let offset = 0;

  return (
    <div className="space-y-4 md:space-y-6">
      {sizes.map((size) => {
        const slice = items.slice(offset, offset + size);
        offset += size;
        return (
          <div key={slice.map((item) => item.key).join('|')} className={`grid grid-cols-1 gap-4 md:gap-6 ${rowCols[size]}`}>
            {slice}
          </div>
        );
      })}
    </div>
  );
}
