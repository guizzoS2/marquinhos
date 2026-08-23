import { useEffect } from 'react';
import { Icon } from '../Icon';

export function FreelaSheet({ open, title, onClose, children, fullScreen = false }) {
  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center md:p-4">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-on-surface/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 flex flex-col w-full bg-surface text-on-surface overflow-hidden ${
          fullScreen
            ? 'h-dvh max-h-dvh'
            : 'max-h-[92dvh] md:max-h-[90vh] md:max-w-lg md:rounded-2xl border border-outline-variant shadow-2xl'
        }`}
      >
        {title ? (
          <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-outline-variant min-h-14">
            <button
              type="button"
              aria-label="Fechar"
              onClick={onClose}
              className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-full hover:bg-surface-container"
            >
              <Icon name="close" />
            </button>
            <h2 className="font-headline font-bold text-sm md:text-base truncate">{title}</h2>
          </div>
        ) : null}
        <div className="flex-1 min-h-0 flex flex-col">{children}</div>
      </div>
    </div>
  );
}
