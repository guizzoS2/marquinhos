const variants = {
  ink: 'poster',
  paper: 'poster poster-paper',
  yellow: 'poster poster-yellow',
};

export function PosterCard({
  children,
  variant = 'ink',
  rotate = '-rotate-1',
  className = '',
}) {
  return (
    <article
      className={`${variants[variant]} p-4 md:p-8 ${rotate} motion-reduce:rotate-0 ${className}`.trim()}
    >
      {children}
    </article>
  );
}
