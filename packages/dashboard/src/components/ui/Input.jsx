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
          className="font-display text-sm tracking-widest uppercase text-[var(--muted,#5c5c5c)]"
        >
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        className={`bar-field w-full min-h-11 px-3 py-3 ${className}`.trim()}
        {...props}
      />
    </div>
  );
}
