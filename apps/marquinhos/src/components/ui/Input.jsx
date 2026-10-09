import { DateField } from './DateField';
import { RequiredMark } from './FieldLabel';

export function Input({
  label,
  id,
  className = '',
  containerClassName = '',
  ...props
}) {
  const inputId = id || props.name;

  if (props.type === 'date') {
    return (
      <DateField
        id={inputId}
        label={label}
        name={props.name}
        value={props.value || ''}
        min={props.min}
        max={props.max}
        required={props.required}
        disabled={props.disabled}
        containerClassName={containerClassName}
        onChange={(next) => props.onChange?.({ target: { name: props.name, value: next } })}
      />
    );
  }

  return (
    <div className={`space-y-2 ${containerClassName}`.trim()}>
      {label ? (
        <label
          htmlFor={inputId}
          className="text-xs font-label font-bold text-on-surface-variant uppercase pl-1"
        >
          {label}
          {props.required ? <RequiredMark /> : null}
        </label>
      ) : null}
      <input
        id={inputId}
        className={`h-11 w-full bg-surface-container-low border border-outline rounded-2xl px-4 text-sm font-semibold text-on-surface outline-none focus:border-primary focus:outline-none focus:ring-0 transition-all ${className}`.trim()}
        {...props}
      />
    </div>
  );
}
