import { useState } from 'react';
import { ReviewStars } from './ReviewStars';
import { Button } from '../Button';

export function ReviewForm({ title, submitLabel = 'Enviar review', onSubmit }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    setError('');
    try {
      onSubmit({ rating, comment });
      setComment('');
    } catch (err) {
      setError(err.message || 'Não foi possível enviar o review.');
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      {title ? <p className="text-sm font-semibold">{title}</p> : null}
      <ReviewStars value={rating} onChange={setRating} />
      <label className="block space-y-2">
        <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant pl-1">
          Comentário
        </span>
        <textarea
          required
          rows={3}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          className="w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11"
        />
      </label>
      {error ? <p className="text-sm text-error font-medium">{error}</p> : null}
      <Button type="submit" className="w-full sm:w-auto">
        {submitLabel}
      </Button>
    </form>
  );
}
