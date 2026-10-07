const variants = {
  primary: 'bg-primary text-on-primary hover:bg-primary-dim',
  secondary: 'bg-surface text-on-surface border border-outline hover:bg-surface-container-low',
  dark: 'bg-on-surface text-white hover:bg-on-surface/90',
  ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container-low',
  danger: 'bg-error text-on-error hover:opacity-90',
};

const sizes = {
  md: 'h-11 px-4',
  icon: 'h-11 w-11',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  icon,
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold leading-5 transition-colors disabled:opacity-60 [&_.material-symbols-outlined]:text-xl ${sizes[size] || sizes.md} ${variants[variant] || variants.primary} ${className}`.trim()}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
