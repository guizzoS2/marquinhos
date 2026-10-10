import { useEffect, useId, useRef, useState } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';

export function FileField({
  id,
  label,
  accept,
  onChange,
  fileName,
  disabled = false,
  cleared = false,
  className = '',
  ariaLabel,
}) {
  const autoId = useId();
  const inputId = id || autoId;
  const captionId = `${inputId}-caption`;
  const inputRef = useRef(null);
  const [picked, setPicked] = useState('');
  const hadFile = useRef(!cleared);
  const shown = fileName ?? picked;

  useEffect(() => {
    if (cleared && hadFile.current) {
      setPicked('');
      if (inputRef.current) inputRef.current.value = '';
    }
    hadFile.current = !cleared;
  }, [cleared]);

  function handleChange(event) {
    const file = event.target.files?.[0];
    setPicked(file?.name || '');
    onChange?.(event);
  }

  return (
    <div className={`min-w-0 space-y-2 ${className}`.trim()}>
      {label ? (
        <span
          id={captionId}
          className="block pl-1 text-xs font-label font-bold uppercase text-on-surface-variant"
        >
          {label}
        </span>
      ) : null}
      <div className="flex min-w-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          disabled={disabled}
          tabIndex={-1}
          onChange={handleChange}
          aria-labelledby={label ? captionId : undefined}
          aria-label={label ? undefined : ariaLabel}
          className="sr-only"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={disabled}
          className="w-full sm:w-auto"
          aria-label={label ? `${label}. Escolher arquivo` : ariaLabel || 'Escolher arquivo'}
          onClick={() => inputRef.current?.click()}
        >
          <Icon name="file_upload" />
          Escolher arquivo
        </Button>
        <span
          className={`min-w-0 truncate text-sm ${shown ? 'text-on-surface' : 'text-on-surface-variant'}`}
        >
          {shown || 'Nenhum arquivo escolhido'}
        </span>
      </div>
    </div>
  );
}
