import { Icon } from '../ui/Icon';

const badgeClasses = {
  positive: 'text-on-surface font-semibold text-xs bg-primary px-2 py-1 rounded-full',
  neutral: 'text-on-surface-variant text-xs bg-surface-container/50 px-2 py-1 rounded-full',
  critical: 'text-error font-bold text-xs animate-pulse',
};

export function MetricCard({ label, value, badge, badgeTone = 'neutral', icon, valueTone }) {
  return (
    <div className="bg-surface border border-outline rounded-xl p-4 md:p-5">
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
    </div>
  );
}
