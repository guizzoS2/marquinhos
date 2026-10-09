import { useEffect, useState } from 'react';
import { Dropdown } from './Dropdown';
import { Icon } from './Icon';
import { PAGE_SIZES } from './usePagedList';

function pageWindow(currentIndex, pageCount) {
  const current = currentIndex + 1;
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const keep = new Set([
    1,
    2,
    3,
    pageCount - 2,
    pageCount - 1,
    pageCount,
    current - 1,
    current,
    current + 1,
  ]);
  const sorted = [...keep].filter((page) => page >= 1 && page <= pageCount).sort((a, b) => a - b);
  const items = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) items.push(`ellipsis-${sorted[index - 1]}`);
    items.push(page);
  });
  return items;
}

function commitPage(value, page, pageCount, onPage) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return page;
  const next = Math.min(pageCount, Math.max(1, parsed)) - 1;
  if (next !== page) onPage(next);
  return next;
}

function NavButton({ label, icon, disabled, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex shrink-0 items-center justify-center h-11 w-11 rounded-full border border-outline bg-surface text-on-surface disabled:opacity-40 [&_.material-symbols-outlined]:text-xl"
    >
      <Icon name={icon} />
    </button>
  );
}

export function Pagination({ state, compact = false }) {
  const page = state.current;
  const { pageCount, setPage, pageSize, setPageSize } = state;
  const [draft, setDraft] = useState(String(page + 1));

  useEffect(() => {
    setDraft(String(page + 1));
  }, [page]);

  const items = pageWindow(page, pageCount);
  if (!state.paged) return null;

  return (
    <nav
      aria-label="Paginação"
      className={`flex max-w-full min-w-0 flex-col gap-3 rounded-2xl border border-outline bg-surface px-3 py-3 ${
        compact ? '' : 'lg:flex-row lg:flex-wrap lg:items-center lg:justify-between'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2 text-sm text-on-surface">
        <span>Página</span>
        <input
          type="text"
          inputMode="numeric"
          aria-label="Número da página"
          value={draft}
          onChange={(event) => setDraft(event.target.value.replace(/\D/g, ''))}
          onBlur={() => setDraft(String(commitPage(draft, page, pageCount, setPage) + 1))}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return;
            event.preventDefault();
            setDraft(String(commitPage(draft, page, pageCount, setPage) + 1));
          }}
          className="h-11 w-12 rounded-lg border border-outline bg-surface text-center text-sm font-semibold text-on-surface outline-none focus:border-primary focus:outline-none focus:ring-0"
        />
        <span>de {pageCount}</span>
      </div>

      <div className={`flex min-w-0 max-w-full items-center gap-1 overflow-x-auto ${compact ? 'w-full' : 'w-full lg:w-auto'}`}>
        <NavButton
          label="Primeira página"
          icon="first_page"
          disabled={page <= 0}
          onClick={() => setPage(0)}
        />
        <NavButton
          label="Página anterior"
          icon="chevron_left"
          disabled={page <= 0}
          onClick={() => setPage(page - 1)}
        />
        {items.map((item) =>
          typeof item === 'string' ? (
            <span key={item} className="px-1 text-sm text-on-surface-variant" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-label={`Página ${item}`}
              aria-current={item === page + 1 ? 'page' : undefined}
              onClick={() => setPage(item - 1)}
              className={`inline-flex shrink-0 items-center justify-center h-11 w-11 rounded-full text-sm font-semibold ${
                item === page + 1
                  ? 'bg-primary font-semibold text-on-primary'
                  : 'text-on-surface'
              }`}
            >
              {item}
            </button>
          ),
        )}
        <NavButton
          label="Próxima página"
          icon="chevron_right"
          disabled={page >= pageCount - 1}
          onClick={() => setPage(page + 1)}
        />
        <NavButton
          label="Última página"
          icon="last_page"
          disabled={page >= pageCount - 1}
          onClick={() => setPage(pageCount - 1)}
        />
      </div>

      <label className="flex flex-wrap items-center gap-2 text-sm text-on-surface">
        Linhas por página
        <Dropdown
          label="Linhas por página"
          className="w-24"
          value={pageSize}
          onChange={setPageSize}
          options={PAGE_SIZES.map((size) => ({ value: size, label: String(size) }))}
        />
      </label>
    </nav>
  );
}
