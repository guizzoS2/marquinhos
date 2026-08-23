export function StatusStamp({ children, rotate = '-rotate-2', className = '' }) {
  return (
    <span
      className={`stamp ${rotate} motion-reduce:rotate-0 ${className}`.trim()}
    >
      {children}
    </span>
  );
}
