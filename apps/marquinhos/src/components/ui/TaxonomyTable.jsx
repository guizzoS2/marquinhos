import { Button } from './Button';
import { Icon } from './Icon';

export function TaxonomyHead({ label }) {
  return (
    <thead>
      <tr className="bg-surface-container-low text-sm font-medium text-on-surface-variant">
        <th className="w-px py-3 pl-2 pr-0 md:pl-4">
          <span className="sr-only">Expandir</span>
        </th>
        <th className="whitespace-nowrap px-4 py-3 text-left font-medium">{label}</th>
        <th className="hidden whitespace-nowrap px-4 py-3 text-left font-medium md:table-cell">Descrição</th>
        <th className="hidden whitespace-nowrap px-4 py-3 text-right font-medium md:table-cell">Ações</th>
      </tr>
    </thead>
  );
}

export function TaxonomyRow({ icon, title, subtitle, tag, description, actions, open, onToggle, expandLabel, children }) {
  return (
    <>
      <tr className="border-t border-outline-variant hover:bg-surface-container-low">
        <td className="w-px py-3 pl-2 pr-0 align-top md:pl-4 md:align-middle">
          {onToggle ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-expanded={open}
              aria-label={expandLabel}
              onClick={onToggle}
            >
              <Icon name="expand_more" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </Button>
          ) : (
            <span className="block h-11 w-11" aria-hidden="true" />
          )}
        </td>
        <td className="px-4 py-3 align-middle">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary text-on-primary">
              <Icon name={icon} filled className="text-2xl" />
            </div>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 break-words text-base font-bold text-on-surface">
                {title}
                {tag ? (
                  <span className="rounded-full border border-outline bg-surface-container-low px-2 py-0.5 text-xs font-semibold text-on-surface-variant">
                    {tag}
                  </span>
                ) : null}
              </p>
              {subtitle ? <p className="text-xs text-on-surface-variant">{subtitle}</p> : null}
            </div>
          </div>
          {description ? (
            <p className="mt-2 break-words text-sm text-on-surface-variant md:hidden">{description}</p>
          ) : null}
          {actions ? <div className="mt-2 md:hidden">{actions}</div> : null}
        </td>
        <td className="hidden px-4 py-3 align-middle text-on-surface-variant md:table-cell">{description || '—'}</td>
        <td className="hidden w-px whitespace-nowrap px-4 py-3 text-right align-middle md:table-cell">{actions}</td>
      </tr>
      {open ? (
        <tr className="border-t border-outline-variant bg-surface-container-low">
          <td colSpan={4} className="px-2 py-3 md:px-4 md:py-4 md:pl-16">
            {children}
          </td>
        </tr>
      ) : null}
    </>
  );
}

export function SubTable({ columns, children }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-outline-variant bg-surface">
      <table className="w-full min-w-[18rem] border-collapse text-left text-sm">
        <thead>
          <tr className="text-sm font-medium text-on-surface-variant">
            {columns.map((column) => (
              <th
                key={column.label}
                className={`whitespace-nowrap px-3 py-2 font-medium md:px-4 ${column.align === 'right' ? 'text-right' : 'text-left'} ${
                  column.desktopOnly ? 'hidden md:table-cell' : ''
                }`.trim()}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function SubRow({ children }) {
  return <tr className="border-t border-outline-variant">{children}</tr>;
}

export function SubCell({ children, align = 'left', muted = false, fit = false, desktopOnly = false }) {
  return (
    <td
      className={`px-3 py-2 align-middle md:px-4 ${align === 'right' ? 'text-right' : 'text-left'} ${
        muted ? 'text-on-surface-variant' : 'text-on-surface'
      } ${fit ? 'w-px whitespace-nowrap' : ''} ${desktopOnly ? 'hidden md:table-cell' : ''}`.trim()}
    >
      {children}
    </td>
  );
}
