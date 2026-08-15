import { Icon } from '../Icon';

export function KpiCard({ icon, label, value, hint }) {
  return (
    <article className="bg-surface-container-lowest rounded-2xl p-5 md:p-6 shadow-sm space-y-3">
      <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
        <Icon name={icon} className="text-2xl" />
      </div>
      <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
        {label}
      </p>
      <p className="font-headline text-2xl md:text-3xl font-extrabold">{value}</p>
      {hint ? <p className="text-xs text-on-surface-variant">{hint}</p> : null}
    </article>
  );
}
