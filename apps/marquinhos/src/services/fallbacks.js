import { EXPENSE_TYPES } from './catalogTaxonomy';
import { buildCashFlowSummary } from './cashFlowUtils';

export const overviewFallback = {
  metrics: [
    {
      id: 'revenue',
      label: 'Faturamento diário',
      value: 'R$ 0',
      badge: '',
      badgeTone: 'neutral',
      icon: 'payments',
    },
    {
      id: 'freela-cost',
      label: 'Custo de freelas hoje',
      value: 'R$ 0',
      badge: '',
      badgeTone: 'neutral',
      icon: 'engineering',
    },
    {
      id: 'stock-alert',
      label: 'Alerta de estoque',
      value: '0 Itens',
      badge: '',
      badgeTone: 'neutral',
      icon: 'warning',
    },
  ],
  weeklyPerformance: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map((day) => ({
    day,
    revenue: 0,
    expense: 0,
    highlight: day === 'SEX',
  })),
  topSold: [],
  suggestion: null,
};

export const expenseCategories = EXPENSE_TYPES;

export const cashFlowFallback = {
  period: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
  categories: expenseCategories,
  incomes: [],
  expenses: [],
  summary: buildCashFlowSummary([], []),
};

export const inventoryFallback = {
  filters: ['Todos', 'Bebidas alcoólicas', 'Bebidas não alcoólicas', 'Comidas, porções e petiscos', 'Mercearia'],
  items: [],
  entries: [],
  productions: [],
  promotions: [],
  comboItems: [],
  sales: [],
  closings: [],
  purchases: [],
};

export const freelancersFallback = {
  roles: ['Barman', 'Garçom', 'Cozinha'],
  people: [],
  dailies: [],
  summary: { costsToday: 'R$ 0', activeNow: '00' },
};

export const suppliersFallback = {
  suppliers: [],
};
