export function Input({
  label,
  id,
  className = '',
  containerClassName = '',
  ...props
}) {
  const inputId = id || props.name;

  return (
    <div className={`space-y-2 ${containerClassName}`.trim()}>
      {label ? (
        <label
          htmlFor={inputId}
          className="text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest pl-1"
        >
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={`w-full bg-surface-container-low border-none rounded-2xl py-3 px-4 min-h-11 text-on-surface focus:ring-2 focus:ring-primary-container transition-all ${className}`.trim()}
        {...props}
      />
    </div>
  );
}
