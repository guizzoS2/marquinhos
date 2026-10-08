import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

function menuBox(node) {
  const rect = node.getBoundingClientRect();
  const gap = 6;
  const width = Math.max(rect.width, Math.min(220, window.innerWidth - 16));
  let left = rect.left;
  if (left + width > window.innerWidth - 8) left = rect.right - width;
  left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
  const below = window.innerHeight - rect.bottom - gap;
  const above = rect.top - gap;
  const up = below < 160 && above > below;
  const maxHeight = Math.max(96, Math.min(280, up ? above : below));
  if (up) {
    return { left, width, bottom: window.innerHeight - rect.top + gap, maxHeight };
  }
  return { left, width, top: rect.bottom + gap, maxHeight };
}

export function Dropdown({
  id,
  label,
  value,
  onChange,
  options,
  disabled = false,
  placeholder = 'Selecione',
  className = 'w-full',
  muted = false,
  leading = '',
  search = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [box, setBox] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const listId = useId();
  const selected = options.find((option) => String(option.value) === String(value ?? ''));
  const term = query.trim().toLowerCase();
  const visible = search && term
    ? options.filter((option) => String(option.label || '').toLowerCase().includes(term))
    : options;

  useEffect(() => {
    if (!open) return undefined;
    function closeFromOutside(event) {
      if (buttonRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setOpen(false);
    }
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    function move() {
      if (buttonRef.current) setBox(menuBox(buttonRef.current));
    }
    move();
    if (search) searchRef.current?.focus();
    document.addEventListener('mousedown', closeFromOutside);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', move);
    window.addEventListener('scroll', move, true);
    return () => {
      document.removeEventListener('mousedown', closeFromOutside);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', move);
      window.removeEventListener('scroll', move, true);
    };
  }, [open, search]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  return (
    <div className={`relative min-w-0 ${className}`}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => {
          if (buttonRef.current) setBox(menuBox(buttonRef.current));
          setOpen((current) => !current);
        }}
        className={`relative flex h-11 w-full items-center gap-2 rounded-xl border px-4 text-left text-sm font-semibold outline-none focus:border-primary focus:outline-none focus:ring-0 disabled:opacity-60 ${
          muted ? 'bg-surface-container-low' : 'bg-surface'
        } ${open ? 'border-primary' : 'border-outline'} ${leading ? 'pl-11' : ''}`}
      >
        {leading ? (
          <Icon
            name={leading}
            className="pointer-events-none absolute left-3 text-xl text-on-surface-variant"
          />
        ) : null}
        <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${selected ? 'text-on-surface' : 'text-on-surface-variant'}`}>
          {selected?.label || placeholder}
        </span>
        <Icon name={open ? 'expand_less' : 'expand_more'} className="shrink-0 text-xl text-on-surface-variant" />
      </button>
      {open && box
        ? createPortal(
            <div
              ref={menuRef}
              style={{
                position: 'fixed',
                left: box.left,
                width: box.width,
                ...(box.bottom != null ? { bottom: box.bottom } : { top: box.top }),
              }}
              className="z-[110] rounded-2xl border border-outline bg-surface p-2 shadow-sm"
            >
            {search ? (
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar"
                aria-label={`Buscar ${label}`}
                className="mb-2 h-11 w-full rounded-lg border border-outline bg-surface px-3 text-sm font-normal text-on-surface outline-none placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-0 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
              />
            ) : null}
            <ul
              id={listId}
              role="listbox"
              aria-label={label}
              style={{ maxHeight: search ? Math.max(96, box.maxHeight - 52) : box.maxHeight }}
              className="overflow-y-auto"
            >
              {visible.length === 0 ? (
                <li className="px-3 py-2 text-sm text-on-surface-variant">Nenhum resultado.</li>
              ) : null}
              {visible.map((option) => {
                const active = String(option.value) === String(value ?? '');
                return (
                  <li key={`${option.value}`} role="none">
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        onChange(option.value);
                        setOpen(false);
                      }}
                      className={`flex h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-left text-sm font-semibold ${
                        active
                          ? 'bg-primary/30 text-on-surface'
                          : 'text-on-surface hover:bg-surface-container-low'
                      }`}
                    >
                      <span className="min-w-0">{option.label}</span>
                      {active ? <Icon name="check" className="shrink-0 text-on-surface" /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
