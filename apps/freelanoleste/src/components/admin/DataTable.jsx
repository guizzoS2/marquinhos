export function DataTable({ columns, children, empty }) {
  return (
    <div className="bg-surface-container-low rounded-2xl overflow-hidden p-1 shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low text-on-surface-variant text-xs font-bold uppercase tracking-widest">
              {columns.map((col) => (
                <th key={col} className="px-4 md:px-6 py-4 whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-variant/30">{children}</tbody>
        </table>
      </div>
      {empty ? (
        <p className="px-6 py-8 text-center text-sm text-on-surface-variant">{empty}</p>
      ) : null}
    </div>
  );
}
