import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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

function placeHint(anchor, tip) {
  const rect = anchor.getBoundingClientRect();
  const tipRect = tip?.getBoundingClientRect();
  const width = tipRect?.width || 0;
  const height = tipRect?.height || 28;
  const edge = 8;
  let left = rect.left + (rect.width - width) / 2;
  if (width > window.innerWidth - edge * 2) left = edge;
  else left = Math.max(edge, Math.min(left, window.innerWidth - width - edge));
  if (rect.top > height + 12) {
    return { left, bottom: window.innerHeight - rect.top + 8 };
  }
  return { left, top: rect.bottom + 8 };
}

function IconHint({ anchor, label, id }) {
  const tipRef = useRef(null);
  const [box, setBox] = useState(null);

  useLayoutEffect(() => {
    const node = anchor;
    if (!node) return undefined;
    function place() {
      const tip = tipRef.current;
      setBox(placeHint(node, tip));
      if (tip && tip.getBoundingClientRect().width === 0) {
        requestAnimationFrame(() => setBox(placeHint(node, tipRef.current)));
      }
    }
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchor, label]);

  return createPortal(
    <span
      ref={tipRef}
      id={id}
      role="tooltip"
      style={{
        position: 'fixed',
        left: box?.left ?? 0,
        visibility: box ? 'visible' : 'hidden',
        ...(box?.bottom != null ? { bottom: box.bottom } : { top: box?.top ?? 0 }),
      }}
      className="pointer-events-none z-[130] whitespace-nowrap rounded-lg bg-on-surface px-2 py-1 text-xs font-semibold text-white"
    >
      {label}
    </span>,
    document.body,
  );
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  icon,
  title,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...props
}) {
  const buttonRef = useRef(null);
  const [showHint, setShowHint] = useState(false);
  const hintId = useId();
  const hint = size === 'icon' ? title || props['aria-label'] || '' : '';

  return (
    <>
      <button
        ref={buttonRef}
        type={type}
        className={`inline-flex items-center justify-center gap-2 rounded-full text-sm font-semibold leading-5 transition-colors disabled:opacity-60 [&_.material-symbols-outlined]:text-xl ${sizes[size] || sizes.md} ${variants[variant] || variants.primary} ${className}`.trim()}
        {...props}
        aria-describedby={showHint && hint ? hintId : props['aria-describedby']}
        onMouseEnter={(event) => {
          if (hint) setShowHint(true);
          onMouseEnter?.(event);
        }}
        onMouseLeave={(event) => {
          setShowHint(false);
          onMouseLeave?.(event);
        }}
        onFocus={(event) => {
          if (hint) setShowHint(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setShowHint(false);
          onBlur?.(event);
        }}
      >
        {icon}
        {children}
      </button>
      {showHint && hint ? <IconHint anchor={buttonRef.current} label={hint} id={hintId} /> : null}
    </>
  );
}
