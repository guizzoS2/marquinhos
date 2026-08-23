import { Icon } from '../Icon';

export function ReviewStars({ value, onChange }) {
  const numeric = Number(value) || 0;
  const rounded = Math.round(numeric);
  const interactive = typeof onChange === 'function';

  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Nota ${numeric} de 5`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const icon = (
          <Icon
            name="star"
            className={`text-base ${
              star <= rounded ? 'text-primary' : 'text-outline-variant'
            }`}
          />
        );
        if (!interactive) {
          return <span key={star}>{icon}</span>;
        }
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            aria-label={`${star} de 5`}
            className="min-h-11 min-w-11 inline-flex items-center justify-center"
          >
            {icon}
          </button>
        );
      })}
      <span className="ml-1 text-sm font-medium">{numeric.toFixed(1)}</span>
    </span>
  );
}
