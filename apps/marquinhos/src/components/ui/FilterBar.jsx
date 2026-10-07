export function FilterBar({ children, actions = null }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
      {children}
      {actions ? (
        <div className="flex flex-col gap-3 self-end md:ml-auto md:flex-row md:flex-wrap md:items-center md:self-auto">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
