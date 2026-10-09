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

export const expenseCategories = [
  { id: 'bebidas', name: 'Bebidas', type: 'expense', defaultNature: 'variable', icon: 'local_shipping' },
  { id: 'fornecedor', name: 'Fornecedor', type: 'expense', defaultNature: 'variable', icon: 'local_shipping' },
  { id: 'freelancer', name: 'Freelancer', type: 'expense', defaultNature: 'variable', icon: 'person' },
  { id: 'suprimentos', name: 'Suprimentos', type: 'expense', defaultNature: 'variable', icon: 'ac_unit' },
  { id: 'utilidades', name: 'Utilidades', type: 'expense', defaultNature: 'fixed', icon: 'bolt' },
  { id: 'aluguel', name: 'Aluguel', type: 'expense', defaultNature: 'fixed', icon: 'home' },
  { id: 'software', name: 'Software', type: 'expense', defaultNature: 'fixed', icon: 'devices' },
  { id: 'salarios', name: 'Salários', type: 'expense', defaultNature: 'fixed', icon: 'badge' },
  { id: 'manutencao', name: 'Manutenção', type: 'expense', defaultNature: 'variable', icon: 'build' },
];

export const cashFlowFallback = {
  period: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
  categories: expenseCategories,
  incomes: [],
  expenses: [],
  summary: buildCashFlowSummary([], []),
};

export const inventoryFallback = {
  filters: ['Todos', 'Cervejas', 'Destilados', 'Insumos', 'Soft Drinks'],
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
