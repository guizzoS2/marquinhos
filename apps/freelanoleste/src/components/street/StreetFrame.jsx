export function StreetFrame({ children }) {
  return (
    <div className="street relative min-h-screen overflow-x-hidden">
      <div className="street-wash" aria-hidden="true" />
      <div className="scanline" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
