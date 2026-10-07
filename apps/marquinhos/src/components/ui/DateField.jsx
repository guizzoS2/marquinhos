import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Icon } from './Icon';

const WEEK_START = 0;

function parseIso(value) {
  if (!value) return null;
  const date = parseISO(String(value));
  return Number.isNaN(date.getTime()) ? null : startOfDay(date);
}

function titleCase(value) {
  const clean = String(value || '').replace('.', '');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function placePanel(node) {
  const rect = node.getBoundingClientRect();
  const width = Math.min(336, window.innerWidth - 16);
  const height = 400;
  const below = window.innerHeight - rect.bottom;
  const up = below < height && rect.top > below;
  return {
    left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
    top: up ? Math.max(8, rect.top - height - 6) : rect.bottom + 6,
    width,
  };
}

export function DateField({
  id,
  label,
  name,
  value = '',
  onChange,
  min,
  max,
  required = false,
  disabled = false,
  containerClassName = '',
}) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState(null);
  const [cursor, setCursor] = useState(() => parseIso(value) || new Date());
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const panelId = useId();
  const selected = parseIso(value);
  const minDate = parseIso(min);
  const maxDate = parseIso(max);
  const today = startOfDay(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: WEEK_START });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: WEEK_START });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const weekdays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: WEEK_START });
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return titleCase(format(day, 'EEE', { locale: ptBR }));
    });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    function outside(event) {
      if (buttonRef.current?.contains(event.target) || panelRef.current?.contains(event.target)) return;
      setOpen(false);
    }
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    function move() {
      if (buttonRef.current) setBox(placePanel(buttonRef.current));
    }
    move();
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', move);
    window.addEventListener('scroll', move, true);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', move);
      window.removeEventListener('scroll', move, true);
    };
  }, [open]);

  function blocked(day) {
    const date = startOfDay(day);
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  }

  function choose(day) {
    if (blocked(day)) return;
    onChange?.(format(day, 'yyyy-MM-dd'));
    setOpen(false);
  }

  function openPanel() {
    setCursor(selected || new Date());
    if (buttonRef.current) setBox(placePanel(buttonRef.current));
    setOpen((current) => !current);
  }

  const shown = selected ? format(selected, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data';

  return (
    <div className={`relative space-y-2 ${containerClassName}`.trim()}>
      {label ? (
        <label htmlFor={id} className="text-xs font-label font-bold text-on-surface-variant uppercase pl-1">
          {label}
        </label>
      ) : null}
      <input
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        name={name}
        value={value}
        required={required}
        onChange={() => {}}
      />
      <button
        ref={buttonRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={openPanel}
        className={`flex h-11 w-full items-center justify-start gap-2 rounded-2xl border bg-surface-container-low px-4 text-left text-sm font-semibold outline-none focus:border-primary focus:outline-none focus:ring-0 disabled:opacity-60 ${
          open ? 'border-primary' : 'border-outline'
        }`}
      >
        <Icon name="calendar_month" className="shrink-0 text-xl text-on-surface-variant" />
        <span className={`text-sm font-semibold ${selected ? 'text-on-surface' : 'text-on-surface-variant'}`}>{shown}</span>
      </button>
      {open && box
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-label={label || 'Selecionar data'}
              style={{ position: 'fixed', left: box.left, top: box.top, width: box.width }}
              className="z-[110] rounded-2xl border border-outline bg-surface p-3 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-2 px-3 text-sm font-semibold text-on-surface"
                  onClick={() => choose(today)}
                  disabled={blocked(today)}
                >
                  <Icon name="today" className="text-xl" />
                  Hoje
                </button>
                <p className="min-w-0 truncate text-sm font-bold text-on-surface">
                  {titleCase(format(cursor, 'MMMM yyyy', { locale: ptBR }))}
                </p>
                <div className="flex items-center">
                  <button
                    type="button"
                    aria-label="Mês anterior"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full text-on-surface"
                    onClick={() => setCursor((current) => addMonths(current, -1))}
                  >
                    <Icon name="chevron_left" />
                  </button>
                  <button
                    type="button"
                    aria-label="Próximo mês"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full text-on-surface"
                    onClick={() => setCursor((current) => addMonths(current, 1))}
                  >
                    <Icon name="chevron_right" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7">
                {weekdays.map((weekday) => (
                  <span key={weekday} className="flex h-8 items-center justify-center text-xs text-on-surface-variant">
                    {weekday}
                  </span>
                ))}
                {days.map((day) => {
                  const active = selected ? isSameDay(day, selected) : false;
                  const inMonth = isSameMonth(day, cursor);
                  const isToday = isSameDay(day, today);
                  const off = blocked(day);
                  return (
                    <button
                      key={format(day, 'yyyy-MM-dd')}
                      type="button"
                      disabled={off}
                      onClick={() => choose(day)}
                      className={`relative mx-auto flex h-11 w-11 items-center justify-center rounded-full text-sm disabled:opacity-30 ${
                        active
                          ? 'bg-primary font-bold text-on-primary'
                          : inMonth
                            ? 'font-medium text-on-surface hover:bg-surface-container-low'
                            : 'text-on-surface-variant hover:bg-surface-container-low'
                      }`}
                    >
                      {format(day, 'd')}
                      {isToday && !active ? (
                        <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
