import { Link } from 'react-router-dom';

const variants = {
  cta: 'bg-primary text-on-primary',
  ghost: 'bg-inverse-on-surface text-inverse-surface',
  ink: 'bg-secondary-dim text-inverse-on-surface',
};

export function RoughButton({
  children,
  to,
  variant = 'cta',
  className = '',
  type = 'button',
  ...props
}) {
  const classes =
    `rough-btn font-display uppercase tracking-wide inline-flex items-center justify-center min-h-11 px-5 py-3 ${variants[variant]} ${className}`.trim();

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
