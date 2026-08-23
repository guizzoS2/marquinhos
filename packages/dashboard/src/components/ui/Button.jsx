export function Button({
  children,
  variant = 'primary',
  type = 'button',
  className = '',
  icon,
  ...props
}) {
  const variants = {
    primary: 'bg-primary text-on-primary',
    secondary: 'bg-transparent text-inherit border-2 border-current',
    dark: 'bg-[var(--ink,#111)] text-[var(--paper,#f4efe6)]',
    ghost: 'bg-transparent text-inherit border border-current',
    danger: 'bg-error text-on-error',
  };

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 px-5 py-3 min-h-11 font-display uppercase tracking-wide disabled:opacity-60 bar-cta ${variants[variant]} ${className}`.trim()}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
