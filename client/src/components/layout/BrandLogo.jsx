export function BrandLogo({ variant = 'header', className = '' }) {
  if (variant === 'full') {
    return (
      <img
        src="/logo.png"
        alt="Marquinho's"
        className={`block rounded-2xl bg-primary object-cover ${className || 'w-40 h-40'}`}
      />
    );
  }

  const sizes = {
    header: 'h-12 w-40',
    sidebar: 'h-12 w-40 mx-auto',
  };

  return (
    <div className={`overflow-hidden rounded-lg bg-primary ${sizes[variant] || sizes.header} ${className}`}>
      <img
        src="/logo.png"
        alt="Marquinho's Bar e Petiscos"
        className="h-full w-full object-cover object-center"
      />
    </div>
  );
}
