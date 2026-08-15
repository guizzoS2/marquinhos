export function Button({
  children,
  variant = 'primary',
  type = 'button',
  className = '',
  ...props
}) {
  const variants = {
    primary: 'bg-primary text-on-primary hover:bg-primary-dim',
    secondary:
      'bg-white text-on-surface border border-outline-variant hover:bg-surface-container-low',
    dark: 'bg-on-surface text-white hover:bg-on-surface/90',
  };

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 min-h-11 font-semibold transition-all active:scale-95 disabled:opacity-60 ${variants[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
