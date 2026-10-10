import { describeExpense, expenseTypeLabel, partyForCategoryId } from './catalogTaxonomy';

/** Parse "R$ 1.250,00" or number to cents */
export function parseMoneyToCents(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value * 100);
  }
  if (!value) return 0;
  const normalized = String(value)
    .replace(/[^\d,.-]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function formatCents(cents) {
  const amount = (Number(cents) || 0) / 100;
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatCompactCents(cents) {
  const amount = (Number(cents) || 0) / 100;
  return `R$ ${amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function expensePartyKind(categoryId) {
  return partyForCategoryId(categoryId);
}

export function natureLabel(nature) {
  return nature === 'fixed' ? 'Fixa' : 'Variável';
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function movementCategoryText(row) {
  const parts = [];
  if (row?.tipo === 'entrada') {
    (row.groupTags || []).forEach((tag) => {
      if (tag?.label) parts.push(tag.label);
    });
    if (row.comanda) parts.push('Comanda');
  } else if (row?.categoria) {
    parts.push(row.categoria);
  }
  if (row?.promocao) parts.push('Promoção');
  if (row?.tipo === 'saida' && row.nature) parts.push(natureLabel(row.nature));
  return parts.join(' · ');
}

export function buildMovementCsv(rows = []) {
  const lines = [['Data/Hora', 'Descrição', 'Origem', 'Categoria', 'Valor'].map(csvCell).join(';')];
  rows.forEach((row) => {
    lines.push(
      [row.data_hora, row.descricao, row.entidade || '', movementCategoryText(row), row.valor]
        .map(csvCell)
        .join(';')
    );
  });
  return `\uFEFF${lines.join('\n')}`;
}

const MONTH_INDEX = {
  jan: 0,
  fev: 1,
  mar: 2,
  abr: 3,
  mai: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  set: 8,
  out: 9,
  nov: 10,
  dez: 11,
};

export function toIsoDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfMonthIso(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return toIsoDate(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function parseCashFlowDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const br = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const short = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const match = short.match(/^(\d{1,2})\s*(?:de\s+)?([a-z]{3})/);
  if (!match) return '';
  const month = MONTH_INDEX[match[2]];
  if (month == null) return '';
  return `${new Date().getFullYear()}-${String(month + 1).padStart(2, '0')}-${String(match[1]).padStart(2, '0')}`;
}

export function inDateRange(value, from, to) {
  const iso = parseCashFlowDate(value);
  if (!iso) return true;
  const start = from && to && from > to ? to : from;
  const end = from && to && from > to ? from : to;
  if (start && iso < start) return false;
  if (end && iso > end) return false;
  return true;
}

export function formatIsoRange(from, to) {
  const start = from && to && from > to ? to : from;
  const end = from && to && from > to ? from : to;
  const fmt = (iso) => {
    if (!iso) return '—';
    const [year, month, day] = iso.split('-');
    return `${day}/${month}/${year}`;
  };
  if (!start && !end) return 'Período';
  if (start && end) return `${fmt(start)} — ${fmt(end)}`;
  if (start) return `A partir de ${fmt(start)}`;
  return `Até ${fmt(end)}`;
}

export function buildCashFlowSummary(incomes = [], expenses = [], deltas = {}) {
  const revenueCents = incomes.reduce(
    (sum, row) => sum + (row.amount ?? parseMoneyToCents(row.value)),
    0
  );
  const expenseCents = expenses.reduce(
    (sum, row) => sum + (row.amount ?? parseMoneyToCents(row.value)),
    0
  );
  const fixedCents = expenses
    .filter((row) => row.nature === 'fixed')
    .reduce((sum, row) => sum + (row.amount ?? parseMoneyToCents(row.value)), 0);
  const variableCents = expenses
    .filter((row) => row.nature !== 'fixed')
    .reduce((sum, row) => sum + (row.amount ?? parseMoneyToCents(row.value)), 0);

  const contribution = revenueCents - variableCents;
  const estimated = contribution - fixedCents;
  const marginPct =
    revenueCents > 0 ? Math.round((contribution / revenueCents) * 100) : 0;
  const variableShare =
    revenueCents > 0 ? Math.round((variableCents / revenueCents) * 100) : 0;

  return {
    totalRevenue: formatCompactCents(revenueCents),
    revenueDelta: deltas.revenueDelta || '0%',
    totalExpenses: formatCompactCents(expenseCents),
    expensesDelta: deltas.expensesDelta || '0%',
    grossProfit: formatCompactCents(estimated),
    margin: `${marginPct}% Margem`,
    netProfit: formatCompactCents(estimated),
    fixedExpenses: formatCompactCents(fixedCents),
    variableExpenses: formatCompactCents(variableCents),
    contributionMargin: formatCompactCents(contribution),
    estimatedProfit: formatCompactCents(estimated),
    variableShare: `${variableShare}%`,
    revenueCents,
    expenseCents,
    fixedCents,
    variableCents,
    contributionCents: contribution,
    estimatedCents: estimated,
  };
}

export function buildCashFlowCsv(data) {
  const expenses = data.expenses || [];

  const lines = [
    ['Data', 'Tipo', 'Descrição', 'Categoria', 'Natureza', 'Valor'].join(';'),
  ];

  (data.incomes || []).forEach((row) => {
    lines.push(
      [
        row.date,
        'Entrada',
        `"${row.description || ''}"`,
        row.category || '',
        '-',
        row.value || formatCents(row.amount),
      ].join(';')
    );
  });

  expenses.forEach((row) => {
    lines.push(
      [
        row.date,
        'Saída',
        `"${row.supplier || row.description || ''}"`,
        row.category || '',
        natureLabel(row.nature),
        row.value || formatCents(row.amount),
      ].join(';')
    );
  });

  const summary = data.summary || buildCashFlowSummary(data.incomes, data.expenses);
  lines.push('');
  lines.push(['Totais', '', '', '', '', ''].join(';'));
  lines.push(['Receita total', '', '', '', '', summary.totalRevenue].join(';'));
  lines.push(['Despesas fixas', '', '', '', '', summary.fixedExpenses].join(';'));
  lines.push(['Despesas variáveis', '', '', '', '', summary.variableExpenses].join(';'));
  lines.push(['Margem de contribuição', '', '', '', '', summary.contributionMargin].join(';'));
  lines.push(['Lucro estimado', '', '', '', '', summary.estimatedProfit].join(';'));

  return `\uFEFF${lines.join('\n')}`;
}

function movementTime(row) {
  if (row?.createdAt) {
    const time = new Date(row.createdAt).getTime();
    if (!Number.isNaN(time)) return time;
  }
  const iso = parseCashFlowDate(row?.date);
  if (!iso) return 0;
  return new Date(`${iso}T00:00:00`).getTime();
}

function formatMovementStamp(row) {
  if (row?.createdAt) {
    const date = new Date(row.createdAt);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }
  return row?.date || '—';
}

export function unifyCashMovements(incomes = [], expenses = []) {
  const rows = [
    ...incomes.map((row) => ({
      id: row.id,
      data_hora: formatMovementStamp(row),
      date: row.date,
      createdAt: row.createdAt || null,
      descricao: row.description || '—',
      description: row.description || '',
      entidade: row.cliente || row.customer || null,
      source: row.source || 'manual',
      saleId: row.saleId || null,
      categoria: row.category || '',
      categoryIcon: row.categoryIcon || 'payments',
      categoryTone: row.categoryTone || 'secondary',
      valor: row.value || formatCents(row.amount),
      amount: row.amount ?? parseMoneyToCents(row.value),
      tipo: 'entrada',
      nature: null,
    })),
    ...expenses.map((row) => {
      const descricao =
        row.description ||
        describeExpense({
          party: partyForCategoryId(row.categoryId),
          categoryName: row.category,
          subtypeName: row.subtype || '',
          supplier: row.supplier || '',
          date: row.date || '',
        });
      return {
      id: row.id,
      data_hora: formatMovementStamp(row),
      date: row.date,
      createdAt: row.createdAt || null,
      descricao,
      description: descricao,
      entidade: row.supplier || null,
      supplier: row.supplier || '',
      supplierId: row.supplierId || '',
      freelancerId: row.freelancerId || '',
      source: row.source || 'manual',
      saleId: row.saleId || null,
      categoria: expenseTypeLabel(row),
      categoryId: row.categoryId || '',
      categoryIcon: row.categoryIcon || 'payments',
      categoryTone: null,
      valor: row.value || formatCents(row.amount),
      amount: row.amount ?? parseMoneyToCents(row.value),
      tipo: 'saida',
      nature: row.nature || 'variable',
      recurrence: row.recurrence || '',
    };
    }),
  ];
  return rows.sort((left, right) => movementTime(right) - movementTime(left) || String(right.id).localeCompare(String(left.id)));
}

export function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
