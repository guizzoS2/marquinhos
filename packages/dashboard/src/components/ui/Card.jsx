export function Card({ children, className = '', as: Component = 'div', ...props }) {
  return (
    <Component
      className={`bg-surface-container-lowest rounded-2xl shadow-sm ${className}`.trim()}
      {...props}
    >
      {children}
    </Component>
  );
}
