import { Button } from './Button';

export function Pagination({ page, pageCount, onPage }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Button type="button" variant="secondary" disabled={page <= 0} onClick={() => onPage(page - 1)}>
        Anterior
      </Button>
      <p className="text-sm text-on-surface-variant">
        {page + 1} / {pageCount}
      </p>
      <Button
        type="button"
        variant="secondary"
        disabled={page >= pageCount - 1}
        onClick={() => onPage(page + 1)}
      >
        Próxima
      </Button>
    </div>
  );
}
