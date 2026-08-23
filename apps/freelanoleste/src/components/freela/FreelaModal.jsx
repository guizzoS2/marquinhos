import { useEffect } from 'react';
import { Icon } from '../Icon';

export function FreelaModal({ open, title, onClose, children }) {
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
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4">
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
        className="relative z-10 w-full max-w-md max-h-[90dvh] overflow-y-auto bg-surface text-on-surface rounded-2xl border border-outline-variant shadow-2xl"
      >
        <div className="sticky top-0 flex items-center gap-2 px-4 py-3 border-b border-outline-variant bg-surface min-h-14">
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-full hover:bg-surface-container"
          >
            <Icon name="close" />
          </button>
          <h2 className="font-headline font-bold text-sm md:text-base">{title}</h2>
        </div>
        <div className="p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}
