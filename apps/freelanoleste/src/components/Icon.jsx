export function Icon({ name, className = '' }) {
  return (
    <span className={`material-symbols-outlined ${className}`.trim()}>{name}</span>
  );
}
