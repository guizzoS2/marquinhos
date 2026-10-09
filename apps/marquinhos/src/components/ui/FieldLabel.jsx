export function FieldLabel({ children, id }) {
  return (
    <p id={id} className="pl-1 text-xs font-label font-bold uppercase text-on-surface-variant">
      {children}
    </p>
  );
}
