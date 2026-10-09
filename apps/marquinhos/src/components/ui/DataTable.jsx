const alignClass = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

const cellTone = {
  default: 'text-on-surface',
  muted: 'text-on-surface-variant',
  strong: 'font-semibold text-on-surface',
  danger: 'font-semibold text-error',
  positive: 'font-semibold text-success',
};

export function DataTable({ children, minWidth = '' }) {
  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface">
      <div className="overflow-x-auto">
        <table className={`w-full border-collapse text-left text-sm ${minWidth}`.trim()}>
          {children}
        </table>
      </div>
    </div>
  );
}

export function THead({ children }) {
  return (
    <thead>
      <tr className="bg-surface-container-low text-sm font-medium text-on-surface-variant">{children}</tr>
    </thead>
  );
}

export function Th({ children, align = 'left' }) {
  return (
    <th className={`whitespace-nowrap px-4 py-3 font-medium ${alignClass[align] || alignClass.left}`}>
      {children}
    </th>
  );
}

export function TBody({ children }) {
  return <tbody>{children}</tbody>;
}

export function Tr({ children, tone, className = '', ...props }) {
  const background = tone === 'out' ? 'bg-error/5 hover:bg-error/10' : 'hover:bg-surface-container-low';
  const clickable = props.onClick ? 'cursor-pointer' : '';
  return (
    <tr className={`border-t border-outline-variant ${background} ${clickable} ${className}`.trim()} {...props}>
      {children}
    </tr>
  );
}

export function Td({ children, align = 'left', tone = 'default', colSpan, className = '' }) {
  const numeric = align === 'right' ? 'tabular-nums' : '';
  return (
    <td
      colSpan={colSpan}
      className={`px-4 py-3 align-middle ${alignClass[align] || alignClass.left} ${cellTone[tone] || cellTone.default} ${numeric} ${className}`.trim()}
    >
      {children}
    </td>
  );
}

export function EmptyRow({ colSpan, children }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-on-surface-variant">
        {children}
      </td>
    </tr>
  );
}

export function TableActions({ children }) {
  return <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>;
}

const pillTone = {
  neutral: 'bg-surface-container text-on-surface-variant',
  accent: 'bg-primary/30 text-on-surface',
  danger: 'bg-error/10 text-error',
};

export function StatusPill({ tone = 'neutral', dot = false, children }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${pillTone[tone] || pillTone.neutral}`}
    >
      {dot ? (
        <span className={`h-1.5 w-1.5 rounded-full ${tone === 'danger' ? 'bg-error' : 'bg-on-surface'}`} />
      ) : null}
      {children}
    </span>
  );
}
