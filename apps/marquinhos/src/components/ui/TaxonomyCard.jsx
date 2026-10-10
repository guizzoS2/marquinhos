import { Icon } from './Icon';

export function TaxonomyCard({ icon, title, subtitle, tags = [], description, actions, children }) {
  return (
    <article className="flex h-full min-w-0 flex-col rounded-xl border border-outline bg-surface p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-on-primary">
          <Icon name={icon} filled className="text-2xl" />
        </div>
        {tags.length ? (
          <div className="flex min-w-0 flex-wrap justify-end gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-outline bg-surface-container-low px-2.5 py-1 text-xs font-semibold text-on-surface-variant"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <h3 className="mt-4 break-words font-headline text-xl font-extrabold leading-tight text-on-surface">{title}</h3>
      {subtitle ? <p className="mt-1 text-sm font-medium text-on-surface-variant">{subtitle}</p> : null}
      {description ? <p className="mt-3 break-words text-sm leading-relaxed text-on-surface">{description}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
      {actions ? (
        <div className="mt-auto flex justify-end border-t border-outline-variant pt-3">
          <div className="mt-1">{actions}</div>
        </div>
      ) : null}
    </article>
  );
}

export function TaxonomyChildren({ label, items, empty, renderActions, renderMeta }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-label font-bold uppercase text-on-surface-variant">{label}</p>
      {items.length ? (
        <ul className="divide-y divide-outline-variant rounded-lg border border-outline-variant">
          {items.map((item) => (
            <li key={item.id} className="flex min-h-11 items-center justify-between gap-3 px-3 py-1">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-on-surface">{item.name}</p>
                {renderMeta ? <p className="text-xs text-on-surface-variant">{renderMeta(item)}</p> : null}
              </div>
              {renderActions ? <div className="shrink-0">{renderActions(item)}</div> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-on-surface-variant">{empty}</p>
      )}
    </div>
  );
}
