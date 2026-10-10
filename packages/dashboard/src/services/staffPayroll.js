export function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseIsoDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

export function validIso(iso) {
  return parseIsoDate(iso) ? String(iso) : '';
}

export function fifthBusinessDay(year, monthIndex) {
  const cursor = new Date(year, monthIndex, 1);
  let found = 0;
  while (found < 5) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) found += 1;
    if (found === 5) return new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    cursor.setDate(cursor.getDate() + 1);
  }
  return cursor;
}

export function contractPayrollDates(startIso, endIso) {
  const start = validIso(startIso);
  const end = validIso(endIso);
  if (!start || !end || end < start) return [];
  const startDate = parseIsoDate(start);
  const endDate = parseIsoDate(end);
  const dates = [];
  let year = startDate.getFullYear();
  let month = startDate.getMonth();
  const endKey = endDate.getFullYear() * 12 + endDate.getMonth();
  while (year * 12 + month <= endKey) {
    const iso = toIsoDate(fifthBusinessDay(year, month));
    if (iso >= start && iso <= end) dates.push(iso);
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return dates;
}

export function payrollKey(staffId, iso) {
  return `payroll-${staffId}-${String(iso).slice(0, 7)}`;
}

export function nextPayrollDate(person, today = new Date()) {
  const todayIso = toIsoDate(today);
  return contractPayrollDates(person?.contractStart, person?.contractEnd).find((iso) => iso >= todayIso) || '';
}

export function isContractActive(person, today = new Date()) {
  const todayIso = toIsoDate(today);
  if (!person?.contractStart || !person?.contractEnd) return false;
  return person.contractStart <= todayIso && todayIso <= person.contractEnd;
}

export function isContractEnded(person, today = new Date()) {
  const todayIso = toIsoDate(today);
  return Boolean(person?.contractEnd) && person.contractEnd < todayIso;
}

const ADMIN_PERMISSIONS = ['overview', 'caixa', 'estoque', 'fornecedores', 'equipe', 'perfil'];
const STOCK_PERMISSIONS = ['estoque', 'perfil'];

export function normalizeStaffPerson(raw, index = 0) {
  const safe = raw || {};
  let permissions = Array.isArray(safe.permissions) ? safe.permissions.filter(Boolean) : [];
  if (!permissions.length) {
    if (safe.role === 'admin' || safe.barRole === 'admin') permissions = ADMIN_PERMISSIONS;
    else if (safe.role === 'stock' || safe.barRole === 'stock') permissions = STOCK_PERMISSIONS;
  }
  const monthly = Number(safe.monthlyCostCents);
  return {
    id: safe.id == null || safe.id === '' ? index + 1 : safe.id,
    uid: safe.uid || null,
    name: String(safe.name || '').trim(),
    email: String(safe.email || '').trim().toLowerCase(),
    title: String(safe.title || '').trim(),
    permissions,
    contractType: safe.contractType === 'pj' ? 'pj' : safe.contractType === 'clt' ? 'clt' : '',
    monthlyCostCents: Number.isFinite(monthly) ? Math.round(monthly) : 0,
    contractStart: validIso(safe.contractStart),
    contractEnd: validIso(safe.contractEnd),
    accountStatus: safe.accountStatus || (safe.uid ? 'active' : ''),
    disabled: Boolean(safe.disabled),
    createdAt: safe.createdAt || new Date().toISOString(),
  };
}

export function hasStaffAccount(person) {
  return Boolean(person?.uid || person?.accountStatus === 'invited' || person?.accountStatus === 'pending');
}

export function staffAccountLabel(person) {
  if (person?.disabled) return 'Desativada';
  if (person?.accountStatus === 'invited') return 'Convite enviado';
  if (person?.accountStatus === 'pending') return 'Convite pendente';
  if (person?.uid || person?.accountStatus === 'active') return 'Ativa';
  return 'Sem conta';
}

export function formatIsoBr(iso) {
  const date = parseIsoDate(iso);
  if (!date) return '—';
  return date.toLocaleDateString('pt-BR');
}

export function filterStaffPeople(people, filters = {}, today = new Date()) {
  const query = String(filters.query || '').trim().toLowerCase();
  const contractType = filters.contractType || 'all';
  const contract = filters.contract || 'all';
  const account = filters.account || 'all';
  return (people || []).filter((person) => {
    if (query && !String(person.name || '').toLowerCase().includes(query)) return false;
    if (contractType !== 'all' && person.contractType !== contractType) return false;
    if (contract === 'active' && !isContractActive(person, today)) return false;
    if (contract === 'ended' && !isContractEnded(person, today)) return false;
    if (account === 'with' && !hasStaffAccount(person)) return false;
    if (account === 'without' && hasStaffAccount(person)) return false;
    return true;
  });
}

function defaultPresent({ person, iso, amount, key, prev }) {
  return {
    ...prev,
    id: prev?.id || key,
    payrollKey: key,
    staffId: String(person.id),
    isoDate: iso,
    amount,
    source: 'staff_payroll',
    supplier: person.name || 'Funcionário',
  };
}

export function syncStaffPayrollExpenses(people, expenses, present = defaultPresent, today = new Date()) {
  const todayIso = toIsoDate(today);
  const existing = (expenses || []).filter((row) => row.source === 'staff_payroll');
  const rest = (expenses || []).filter((row) => row.source !== 'staff_payroll');
  const byKey = new Map(existing.map((row) => [row.payrollKey || row.id, row]));
  const seen = new Set();
  const payroll = [];

  (people || []).forEach((person) => {
    if (!person?.contractStart || !person?.contractEnd) return;
    const amount = Number(person.monthlyCostCents);
    if (!Number.isFinite(amount)) return;
    contractPayrollDates(person.contractStart, person.contractEnd).forEach((iso) => {
      const key = payrollKey(person.id, iso);
      seen.add(key);
      const prev = byKey.get(key);
      if (prev && iso <= todayIso) {
        payroll.push(prev);
        return;
      }
      payroll.push(present({ person, iso, amount: Math.round(amount), key, prev }));
    });
  });

  existing.forEach((row) => {
    const key = row.payrollKey || row.id;
    if (seen.has(key)) return;
    if ((row.isoDate || '') <= todayIso) payroll.push(row);
  });

  return [...payroll, ...rest];
}

export function assertStaffInfo(payload) {
  const name = String(payload.name || '').trim();
  const title = String(payload.title || '').trim();
  const contractType = payload.contractType === 'pj' ? 'pj' : payload.contractType === 'clt' ? 'clt' : '';
  const contractStart = validIso(payload.contractStart);
  const contractEnd = validIso(payload.contractEnd);
  if (!name) throw new Error('Informe o nome.');
  if (!title) throw new Error('Informe o cargo.');
  if (!contractType) throw new Error('Marque CLT ou PJ.');
  if (!contractStart || !contractEnd) throw new Error('Informe o início e o fim do contrato.');
  if (contractEnd < contractStart) throw new Error('A data final é anterior ao início.');
  const cents =
    payload.monthlyCostCents != null && payload.monthlyCost == null
      ? Math.round(Number(payload.monthlyCostCents))
      : null;
  if (cents != null && (!Number.isFinite(cents) || cents < 0)) {
    throw new Error('Informe o custo mensal.');
  }
  return { name, title, contractType, contractStart, contractEnd };
}
