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

export function natureLabel(nature) {
  return nature === 'fixed' ? 'Fixa' : 'Variável';
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

export function buildCashFlowCsv(data, { natureFilter = 'all' } = {}) {
  const expenses = (data.expenses || []).filter((row) => {
    if (natureFilter === 'all') return true;
    return row.nature === natureFilter;
  });

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
