export const SHIFT_STATUSES = [
  { id: 'on_shift', label: 'Em turno' },
  { id: 'pending_payment', label: 'Pendente pagamento' },
  { id: 'available', label: 'Disponível' },
];

export const MAX_SHIFT_DAYS = 31;

export function shiftStatusLabel(status) {
  return SHIFT_STATUSES.find((item) => item.id === status)?.label || '—';
}

export function sameRole(left, right) {
  return String(left || '').trim().toLowerCase() === String(right || '').trim().toLowerCase();
}

export function onlyDigits(value) {
  const raw = String(value || '');
  let digits = raw.replace(/\D/g, '');
  if ((raw.trim().startsWith('+') || digits.length > 11) && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  return digits;
}

export function maskPhone(value) {
  const digits = onlyDigits(value).slice(0, 11);
  if (!digits) return '';
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (digits.length < 3) return `(${ddd}`;
  if (digits.length < 7) return `(${ddd}) ${rest}`;
  if (digits.length <= 10) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
}

export function isValidPhone(value) {
  const digits = onlyDigits(value);
  if (digits.length !== 10 && digits.length !== 11) return false;
  const ddd = Number(digits.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;
  if (digits.length === 11 && digits[2] !== '9') return false;
  return true;
}

export function parseIsoDate(value) {
  if (!value || typeof value !== 'string') return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function startOfWeekMonday(date) {
  const start = startOfDay(date);
  const day = start.getDay();
  const diff = day === 0 ? 6 : day - 1;
  start.setDate(start.getDate() - diff);
  return start;
}

export function periodBounds(period, anchor = new Date()) {
  const day = startOfDay(anchor);
  if (period === 'Hoje') {
    return { start: day, end: endOfDay(day) };
  }
  if (period === 'Semana') {
    const start = startOfWeekMonday(day);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end: endOfDay(end) };
  }
  const start = new Date(day.getFullYear(), day.getMonth(), 1);
  const end = new Date(day.getFullYear(), day.getMonth() + 1, 0);
  return { start, end: endOfDay(end) };
}

export function shiftAnchor(anchor, period, direction) {
  const next = startOfDay(anchor);
  const delta = direction === 'next' ? 1 : -1;
  if (period === 'Hoje') next.setDate(next.getDate() + delta);
  else if (period === 'Semana') next.setDate(next.getDate() + delta * 7);
  else next.setMonth(next.getMonth() + delta);
  return next;
}

export function formatPeriodLabel(period, anchor) {
  const { start, end } = periodBounds(period, anchor);
  if (period === 'Hoje') {
    return start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  }
  if (period === 'Semana') {
    const from = start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    const to = end.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    return `${from} – ${to}`;
  }
  return start.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function formatShiftDate(value) {
  const date = parseIsoDate(value);
  if (!date) return value || '—';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function expandIsoRange(startIso, endIso) {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso || startIso);
  if (!start || !end) {
    throw new Error('Informe a data do turno.');
  }
  if (end < start) {
    throw new Error('A data final precisa ser igual ou posterior à inicial.');
  }
  const dates = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    dates.push(toIsoDate(cursor));
    if (dates.length > MAX_SHIFT_DAYS) {
      throw new Error(`O período pode ter no máximo ${MAX_SHIFT_DAYS} dias.`);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function filterShifts(dailies, people, { period, anchor, role, query }) {
  const { start, end } = periodBounds(period, anchor);
  const needle = String(query || '').trim().toLowerCase();
  return (dailies || []).filter((daily) => {
    const date = parseIsoDate(daily.date);
    if (!date || date < start || date > end) return false;
    if (role && !sameRole(daily.role, role)) return false;
    if (!needle) return true;
    const person = (people || []).find((item) => String(item.id) === String(daily.freelancerId));
    return String(person?.name || '').toLowerCase().includes(needle);
  });
}

export function peopleByRole(people, role) {
  return (people || []).filter((person) => sameRole(person.role, role));
}
