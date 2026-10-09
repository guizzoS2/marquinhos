import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button';
import { Icon } from './Icon';

export function FieldModal({ title, icon, wide = false, onClose, children }) {
  const panel = useRef(null);

  useEffect(() => {
    function onKey(event) {
      if (event.key !== 'Escape') return;
      const open = document.querySelectorAll('[data-field-modal]');
      if (open.length && open[open.length - 1] !== panel.current) return;
      event.stopPropagation();
      onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div ref={panel} data-field-modal className="fixed inset-0 z-[105] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar modal"
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${
          wide ? 'max-w-2xl' : 'max-w-lg'
        } max-h-[90vh] min-w-0 space-y-6 overflow-x-hidden overflow-y-auto rounded-2xl bg-surface-container-lowest p-5 shadow-2xl shadow-on-surface/10 md:p-8`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-on-surface">
              <Icon name={icon} />
            </div>
            <h3 className="font-headline text-xl font-bold text-on-surface break-words">{title}</h3>
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={onClose} aria-label="Fechar">
            <Icon name="close" />
          </Button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
