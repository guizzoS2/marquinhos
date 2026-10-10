export function RequiredMark() {
  return (
    <span className="text-error" aria-hidden="true">
      {' *'}
    </span>
  );
}

export function FieldLabel({ children, id, required = false }) {
  return (
    <p id={id} className="pl-1 text-xs font-label font-bold uppercase text-on-surface-variant">
      {children}
      {required ? <RequiredMark /> : null}
    </p>
  );
}
