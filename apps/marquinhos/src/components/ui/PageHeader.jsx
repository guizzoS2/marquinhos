export function PageHeader({ title, description, children }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-extrabold text-on-surface font-headline">{title}</h1>
        {description ? <p className="text-sm text-on-surface-variant mt-1">{description}</p> : null}
      </div>
      {children ? (
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:justify-end">
          {children}
        </div>
      ) : null}
    </header>
  );
}
