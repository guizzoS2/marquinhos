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
  isWithinInterval,
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

function iso(day) {
  return format(day, 'yyyy-MM-dd');
}

function label(from, to) {
  const start = parseIso(from);
  const end = parseIso(to);
  if (!start && !end) return 'Selecionar datas';
  const first = start && end && start > end ? end : start || end;
  const last = start && end && start > end ? start : end || start;
  const text = format(first, 'dd/MM/yyyy', { locale: ptBR });
  if (!last || isSameDay(first, last)) return text;
  return `${text} – ${format(last, 'dd/MM/yyyy', { locale: ptBR })}`;
}

function ordered(start, end) {
  if (!start) return { start: null, end: null };
  if (!end || start <= end) return { start, end: end || start };
  return { start: end, end: start };
}

function placePanel(node) {
  const rect = node.getBoundingClientRect();
  const width = Math.min(336, window.innerWidth - 16);
  const below = window.innerHeight - rect.bottom;
  const above = rect.top;
  const up = below < 392 && above > below;
  let left = rect.left;
  if (left + width > window.innerWidth - 8) left = rect.right - width;
  left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
  if (up) return { left, width, bottom: window.innerHeight - rect.top + 6 };
  return { left, width, top: rect.bottom + 6 };
}

export function DateRangeField({ from = '', to = '', onChange }) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState(null);
  const [cursor, setCursor] = useState(() => parseIso(from) || new Date());
  const [anchor, setAnchor] = useState(null);
  const [hover, setHover] = useState(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);
  const panelId = useId();
  const today = startOfDay(new Date());
  const shown = label(from, to);

  const preview = ordered(anchor || parseIso(from), anchor ? hover || anchor : parseIso(to));

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
      setAnchor(null);
      setHover(null);
      setOpen(false);
    }
    function onKey(event) {
      if (event.key === 'Escape') {
        setAnchor(null);
        setHover(null);
        setOpen(false);
      }
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

  function commit(start, end) {
    const range = ordered(startOfDay(start), startOfDay(end));
    onChange?.({ from: iso(range.start), to: iso(range.end) });
  }

  function choose(day) {
    const date = startOfDay(day);
    setCursor(date);
    if (!anchor) {
      setAnchor(date);
      setHover(date);
      commit(date, date);
      return;
    }
    commit(anchor, date);
    setAnchor(null);
    setHover(null);
    setOpen(false);
  }

  function pickToday() {
    setAnchor(null);
    setHover(null);
    setCursor(today);
    commit(today, today);
    setOpen(false);
  }

  function openPanel() {
    setCursor(parseIso(from) || new Date());
    setAnchor(null);
    setHover(null);
    if (buttonRef.current) setBox(placePanel(buttonRef.current));
    setOpen((current) => !current);
  }

  return (
    <div className="relative w-full sm:w-max">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Período"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={openPanel}
        className={`flex h-11 w-full items-center justify-start gap-2 rounded-2xl border bg-surface px-4 text-left text-sm font-semibold outline-none focus:border-primary focus:outline-none focus:ring-0 sm:w-max ${
          open ? 'border-primary' : 'border-outline'
        }`}
      >
        <Icon name="calendar_month" className="shrink-0 text-xl text-on-surface-variant" />
        <span className="whitespace-nowrap font-semibold text-on-surface">{shown}</span>
      </button>
      {open && box
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-label="Selecionar período"
              style={{
                position: 'fixed',
                left: box.left,
                width: box.width,
                ...(box.bottom != null ? { bottom: box.bottom } : { top: box.top }),
              }}
              className="z-[110] rounded-2xl border border-outline bg-surface p-3 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-2 px-3 text-sm font-semibold text-on-surface"
                  onClick={pickToday}
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
                    title="Mês anterior"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full text-on-surface"
                    onClick={() => setCursor((current) => addMonths(current, -1))}
                  >
                    <Icon name="chevron_left" />
                  </button>
                  <button
                    type="button"
                    aria-label="Próximo mês"
                    title="Próximo mês"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full text-on-surface"
                    onClick={() => setCursor((current) => addMonths(current, 1))}
                  >
                    <Icon name="chevron_right" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7">
                {weekdays.map((weekday) => (
                  <span
                    key={weekday}
                    className="flex h-8 items-center justify-center text-xs text-on-surface-variant"
                  >
                    {weekday}
                  </span>
                ))}
                {days.map((day) => {
                  const date = startOfDay(day);
                  const start = preview.start;
                  const end = preview.end;
                  const same = start && end ? isSameDay(start, end) : false;
                  const isStart = start ? isSameDay(date, start) : false;
                  const isEnd = end ? isSameDay(date, end) : false;
                  const between =
                    start && end && !same
                      ? isWithinInterval(date, {
                          start: start < end ? start : end,
                          end: start < end ? end : start,
                        }) && !isStart && !isEnd
                      : false;
                  const inMonth = isSameMonth(day, cursor);
                  const isToday = isSameDay(date, today);
                  const edge = isStart || isEnd;
                  return (
                    <div key={iso(day)} className="relative flex h-11 items-center justify-center">
                      {between ? <span className="absolute inset-y-1 left-0 right-0 bg-primary/20" /> : null}
                      {isStart && !same ? (
                        <span className="absolute inset-y-1 left-1/2 right-0 bg-primary/20" />
                      ) : null}
                      {isEnd && !same ? (
                        <span className="absolute inset-y-1 left-0 right-1/2 bg-primary/20" />
                      ) : null}
                      <button
                        type="button"
                        onMouseEnter={() => {
                          if (anchor) setHover(date);
                        }}
                        onMouseLeave={() => {
                          if (anchor) setHover(anchor);
                        }}
                        onClick={() => choose(day)}
                        className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-full text-sm ${
                          edge
                            ? 'bg-primary font-bold text-on-primary'
                            : inMonth
                              ? 'font-medium text-on-surface hover:bg-surface-container-low'
                              : 'text-on-surface-variant hover:bg-surface-container-low'
                        }`}
                      >
                        {format(day, 'd')}
                        {isToday && !edge ? (
                          <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary" />
                        ) : null}
                      </button>
                    </div>
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
