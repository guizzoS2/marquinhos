import { format, isValid, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseCashFlowDate, parseMoneyToCents } from './cashFlowUtils';
import { PAYMENT_METHODS } from './inventoryProduct';
import { productTotals, salePayments } from './saleRules';

export function movementInstant(row) {
  if (row?.createdAt) {
    const date = parseISO(String(row.createdAt));
    if (isValid(date)) return date;
  }
  const iso = parseCashFlowDate(row?.date);
  if (!iso) return null;
  return new Date(`${iso}T00:00:00`);
}

export function dayKey(date) {
  return format(date, 'yyyy-MM-dd');
}

export function formatDayLabel(iso) {
  const date = parseISO(String(iso || ''));
  if (!isValid(date)) return '—';
  return format(date, 'dd/MM/yyyy', { locale: ptBR });
}

export function closingCutoff(closing) {
  const date = parseISO(String(closing?.until || closing?.closed_at || ''));
  return isValid(date) ? date : null;
}

export function latestCutoff(closings) {
  let max = null;
  (closings || []).forEach((closing) => {
    const cutoff = closingCutoff(closing);
    if (cutoff && (!max || cutoff > max)) max = cutoff;
  });
  return max;
}

export function closedMovementSets(closings) {
  const incomeIds = new Set();
  const expenseIds = new Set();
  let legacyUntil = null;
  (closings || []).forEach((closing) => {
    const hasIds = Array.isArray(closing.income_ids) || Array.isArray(closing.expense_ids);
    if (hasIds) {
      (closing.income_ids || []).forEach((id) => incomeIds.add(String(id)));
      (closing.expense_ids || []).forEach((id) => expenseIds.add(String(id)));
      return;
    }
    const cutoff = closingCutoff(closing);
    if (cutoff && (!legacyUntil || cutoff > legacyUntil)) legacyUntil = cutoff;
  });
  return { incomeIds, expenseIds, legacyUntil };
}

export function isMovementOpen(row, kind, closed) {
  const ids = kind === 'expense' ? closed.expenseIds : closed.incomeIds;
  if (ids.has(String(row?.id))) return false;
  if (closed.legacyUntil) {
    const instant = movementInstant(row);
    if (instant && instant <= closed.legacyUntil) return false;
  }
  return true;
}

export function openMovements(incomes, expenses, closings) {
  const closed = closedMovementSets(closings);
  return {
    incomes: (incomes || []).filter((row) => isMovementOpen(row, 'income', closed)),
    expenses: (expenses || []).filter((row) => isMovementOpen(row, 'expense', closed)),
  };
}

export function pendingDays(incomes, expenses) {
  const keys = new Set();
  [...(incomes || []), ...(expenses || [])].forEach((row) => {
    const instant = movementInstant(row);
    if (instant) keys.add(dayKey(instant));
  });
  return [...keys].sort();
}

export function parseCutoff(day, time, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(day || ''))) return null;
  if (!/^\d{2}:\d{2}$/.test(String(time || ''))) return null;
  const start = new Date(`${day}T${time}:00`);
  if (Number.isNaN(start.getTime())) return null;
  if (`${day} ${time}` === format(now, 'yyyy-MM-dd HH:mm')) return now;
  return new Date(`${day}T${time}:59`);
}

export function rowCents(row) {
  if (row?.amount != null && Number.isFinite(Number(row.amount))) return Number(row.amount);
  return parseMoneyToCents(row?.value);
}

export function sumReais(rows) {
  const cents = (rows || []).reduce((sum, row) => sum + rowCents(row), 0);
  return Math.round(cents) / 100;
}

function inWindow(value, from, until, day) {
  const date = parseISO(String(value || ''));
  if (!isValid(date)) return false;
  if (from && date <= from) return false;
  if (until && date > until) return false;
  if (day && dayKey(date) !== day) return false;
  return true;
}

export function windowFor({ modo, day, time, openIncomes = [], openExpenses = [], now = new Date() }) {
  const days = pendingDays(openIncomes, openExpenses);
  if (!days.length) {
    return { error: 'Nada pendente de fechamento.', incomes: [], expenses: [], modo: 'dia', day: null, until: null, from: null };
  }
  const several = modo === 'varios' && days.length > 1;
  const useDay = several ? day : days.includes(day) ? day : days[days.length - 1];
  const until = parseCutoff(useDay, time, now);
  if (!until) {
    return { error: 'Horário inválido.', incomes: [], expenses: [], modo: several ? 'varios' : 'dia', day: useDay, until: null, from: null };
  }
  if (until > now) {
    return { error: 'O horário não pode passar de agora.', incomes: [], expenses: [], modo: several ? 'varios' : 'dia', day: useDay, until, from: null };
  }
  const inRange = (row) => {
    const instant = movementInstant(row);
    if (!instant || instant > until) return false;
    if (!several && dayKey(instant) !== useDay) return false;
    return true;
  };
  const incomes = openIncomes.filter(inRange);
  const expenses = openExpenses.filter(inRange);
  if (!incomes.length && !expenses.length) {
    return { error: 'Nada para fechar nesse horário.', incomes, expenses, modo: several ? 'varios' : 'dia', day: useDay, until, from: null };
  }
  const instants = [...incomes, ...expenses].map(movementInstant).filter(Boolean).sort((left, right) => left - right);
  return {
    error: '',
    incomes,
    expenses,
    modo: several ? 'varios' : 'dia',
    day: several ? null : useDay,
    until,
    from: instants[0] || null,
  };
}

export function totalsInWindow(sales, { from, until, day }) {
  const byMethod = Object.fromEntries(PAYMENT_METHODS.map((method) => [method, 0]));
  (sales || []).forEach((sale) => {
    const payments = salePayments(sale);
    if (payments.length) {
      payments.forEach((payment) => {
        if (!inWindow(payment.created_at, from, until, day)) return;
        if (byMethod[payment.forma_pagamento] == null) return;
        byMethod[payment.forma_pagamento] = Math.round((byMethod[payment.forma_pagamento] + Number(payment.valor || 0)) * 100) / 100;
      });
      return;
    }
    if (sale.status !== 'paga') return;
    if (!inWindow(sale.created_at, from, until, day)) return;
    if (byMethod[sale.forma_pagamento] == null) return;
    byMethod[sale.forma_pagamento] = Math.round((byMethod[sale.forma_pagamento] + Number(sale.total || 0)) * 100) / 100;
  });
  const total = Math.round(Object.values(byMethod).reduce((sum, value) => sum + value, 0) * 100) / 100;
  return { byMethod, total };
}

export function settledInWindow(sales, range) {
  const rows = [];
  (sales || []).forEach((sale) => {
    if (sale.status === 'paga' && inWindow(sale.updated_at || sale.created_at, range.from, range.until, range.day)) {
      rows.push(sale);
    }
    (sale.historico || []).forEach((cycle) => {
      if (inWindow(cycle.quitado_em, range.from, range.until, range.day)) rows.push({ itens: cycle.itens });
    });
  });
  return productTotals(rows);
}

export function snapshotLine(row) {
  return {
    id: row.id,
    createdAt: row.createdAt || null,
    date: row.date || '',
    description: row.description || row.supplier || '',
    value: row.value || '',
    amount: rowCents(row),
  };
}
