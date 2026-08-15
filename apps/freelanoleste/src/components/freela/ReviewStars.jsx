import { Icon } from '../Icon';

export function ReviewStars({ value }) {
  const numeric = Number(value) || 0;
  const rounded = Math.round(numeric);

  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Nota ${numeric} de 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Icon
          key={star}
          name="star"
          className={`text-base ${
            star <= rounded ? 'text-primary' : 'text-outline-variant'
          }`}
        />
      ))}
      <span className="ml-1 text-sm font-medium">{numeric.toFixed(1)}</span>
    </span>
  );
}
