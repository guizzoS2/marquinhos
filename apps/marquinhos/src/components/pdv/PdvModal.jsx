import { useEffect } from 'react';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

export function PdvModal({ title, icon = 'info', onClose, children }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar modal"
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[90vh] w-full max-w-lg space-y-6 overflow-y-auto rounded-2xl bg-surface-container-lowest p-5 shadow-2xl shadow-on-surface/10 md:p-8">
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
    </div>
  );
}
