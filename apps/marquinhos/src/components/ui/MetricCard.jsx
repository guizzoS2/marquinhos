import { Icon } from '../ui/Icon';

const badgeClasses = {
  positive: 'text-on-surface font-semibold text-xs bg-primary px-2 py-1 rounded-full',
  neutral: 'text-on-surface-variant text-xs bg-surface-container/50 px-2 py-1 rounded-full',
  critical: 'text-error font-bold text-xs animate-pulse',
};

const accents = [
  'bg-primary/20 border-primary',
  'bg-error/10 border-error',
  'bg-surface-container border-tertiary',
  'bg-surface-container-high border-primary-dim',
  'bg-error-container/20 border-error-container',
  'bg-tertiary-container border-outline',
  'bg-surface-container-low border-on-surface',
  'bg-primary-container/40 border-primary-dim',
];

export function MetricCard({ label, value, badge, badgeTone = 'neutral', icon, valueTone, accent = 0 }) {
  const tone = accents[accent % accents.length];

  return (
    <div
      className={`p-5 md:p-6 rounded-xl shadow-sm border-2 flex flex-col justify-between min-h-40 gap-6 ${tone}`}
    >
      <div className="flex justify-between items-start gap-3">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-surface-container-lowest text-on-surface">
          <Icon name={icon} filled className="text-2xl" />
        </div>
        {badge ? <span className={badgeClasses[badgeTone]}>{badge}</span> : null}
      </div>
      <div className="min-w-0">
        <p className="text-on-surface-variant text-xs font-medium">{label}</p>
        <h3
          className={`text-3xl font-black mt-1 leading-tight break-words ${
            valueTone === 'negative'
              ? 'text-error'
              : valueTone === 'positive'
                ? 'text-secondary'
                : 'text-on-surface'
          }`}
        >
          {value}
        </h3>
      </div>
    </div>
  );
}
