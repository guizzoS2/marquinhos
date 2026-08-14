import { Icon } from '../ui/Icon';

const badgeClasses = {
  positive: 'text-on-surface font-semibold text-xs bg-primary px-2 py-1 rounded-full',
  neutral: 'text-on-surface-variant text-xs bg-surface-container/50 px-2 py-1 rounded-full',
  critical: 'text-error font-bold text-xs animate-pulse',
};

const iconWrapClasses = {
  payments: 'bg-primary/20 text-on-surface',
  engineering: 'bg-surface-container text-on-surface',
  warning: 'bg-error/10 text-error',
};

export function MetricCard({ label, value, badge, badgeTone = 'neutral', icon }) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-none flex flex-col justify-between h-40 group hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconWrapClasses[icon] || 'bg-primary/20 text-on-surface'}`}
        >
          <Icon name={icon} filled className="text-2xl" />
        </div>
        {badge ? <span className={badgeClasses[badgeTone]}>{badge}</span> : null}
      </div>
      <div>
        <p className="text-on-surface-variant text-xs font-medium uppercase tracking-wider">
          {label}
        </p>
        <h3 className="text-3xl font-black text-on-surface mt-1 tracking-tight">{value}</h3>
      </div>
    </div>
  );
}
