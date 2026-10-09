import { useState } from 'react';
import { Icon } from './Icon';

function MediaFallback({ icon, size = 'lg' }) {
  if (size === 'sm') {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-on-primary">
        <Icon name={icon} className="text-base" />
      </span>
    );
  }

  return (
    <span className="flex h-full w-full items-center justify-center bg-primary text-on-primary">
      <Icon name={icon} className="text-[5rem] leading-none" />
    </span>
  );
}

export function EntityMedia({ src, icon = 'image' }) {
  const [broken, setBroken] = useState(false);
  const show = Boolean(src) && !broken;

  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary">
      {show ? (
        <img src={src} alt="" onError={() => setBroken(true)} className="h-full w-full object-cover" />
      ) : (
        <MediaFallback icon={icon} />
      )}
    </div>
  );
}

export function TablePhoto({ src, icon = 'inventory_2' }) {
  const [broken, setBroken] = useState(false);
  const show = Boolean(src) && !broken;
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-container-low">
      {show ? (
        <img className="h-full w-full object-cover" alt="" src={src} onError={() => setBroken(true)} />
      ) : (
        <Icon name={icon} className="text-on-surface-variant" />
      )}
    </div>
  );
}

export function EntityThumb({ src, icon = 'inventory_2' }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) return <MediaFallback icon={icon} size="sm" />;
  return (
    <img src={src} alt="" onError={() => setBroken(true)} className="h-6 w-6 rounded-full object-cover" />
  );
}

export function EntityCardGrid({ children }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{children}</div>;
}

export function EntityCard({ image, icon = 'image', title, badge, onClick, accent = false, actions, children }) {
  const frame = 'relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-outline bg-surface text-left';
  const main = (
    <div className="flex items-start gap-3 p-4">
      <EntityMedia src={image} icon={icon} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="min-w-0 font-headline text-lg font-bold text-on-surface">{title}</h3>
          {badge ? <div className="shrink-0">{badge}</div> : null}
        </div>
        {children}
      </div>
    </div>
  );

  const mark = accent ? <span className="absolute inset-y-0 left-0 w-1 bg-error" /> : null;

  if (!actions) {
    if (onClick) {
      return (
        <button type="button" onClick={onClick} className={`${frame} min-h-11 cursor-pointer hover:bg-surface-container-low`}>
          {mark}
          {main}
        </button>
      );
    }
    return (
      <article className={frame}>
        {mark}
        {main}
      </article>
    );
  }

  return (
    <article className={frame}>
      {mark}
      {onClick ? (
        <button type="button" onClick={onClick} className="flex min-h-11 w-full flex-1 flex-col text-left hover:bg-surface-container-low">
          {main}
        </button>
      ) : (
        main
      )}
      <div className="flex flex-wrap gap-2 border-t border-outline-variant p-4">{actions}</div>
    </article>
  );
}
