const overview = {
  metrics: [
    {
      id: 'revenue',
      label: 'Faturamento Diário',
      value: 'R$ 0',
      badge: '',
      badgeTone: 'neutral',
      icon: 'payments',
    },
    {
      id: 'freela-cost',
      label: 'Custo de Freelas Hoje',
      value: 'R$ 0',
      badge: '',
      badgeTone: 'neutral',
      icon: 'engineering',
    },
    {
      id: 'stock-alert',
      label: 'Alerta de Estoque',
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

const cashFlow = {
  period: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
  categories: [
    { id: 'bebidas', name: 'Bebidas', type: 'expense', defaultNature: 'variable', icon: 'local_shipping' },
    { id: 'freelancer', name: 'Freelancer', type: 'expense', defaultNature: 'variable', icon: 'person' },
    { id: 'suprimentos', name: 'Suprimentos', type: 'expense', defaultNature: 'variable', icon: 'ac_unit' },
    { id: 'utilidades', name: 'Utilidades', type: 'expense', defaultNature: 'fixed', icon: 'bolt' },
    { id: 'aluguel', name: 'Aluguel', type: 'expense', defaultNature: 'fixed', icon: 'home' },
    { id: 'software', name: 'Software', type: 'expense', defaultNature: 'fixed', icon: 'devices' },
    { id: 'salarios', name: 'Salários', type: 'expense', defaultNature: 'fixed', icon: 'badge' },
    { id: 'manutencao', name: 'Manutenção', type: 'expense', defaultNature: 'variable', icon: 'build' },
  ],
  incomes: [],
  expenses: [],
  summary: {
    totalRevenue: 'R$ 0',
    revenueDelta: '0%',
    totalExpenses: 'R$ 0',
    expensesDelta: '0%',
    grossProfit: 'R$ 0',
    margin: '0% Margem',
    netProfit: 'R$ 0',
    fixedExpenses: 'R$ 0',
    variableExpenses: 'R$ 0',
    contributionMargin: 'R$ 0',
    estimatedProfit: 'R$ 0',
    variableShare: '0%',
  },
};

const inventory = {
  filters: ['Todos', 'Cervejas', 'Destilados', 'Insumos', 'Soft Drinks'],
  items: [],
  metrics: [
    {
      id: 'low-stock',
      tone: 'error',
      badge: 'Ação',
      icon: 'warning',
      label: 'Itens em estoque baixo',
      value: '0',
      progress: 0,
    },
    {
      id: 'inventory-value',
      tone: 'secondary',
      badge: 'Ativo',
      icon: 'inventory',
      label: 'Valor do inventário',
      value: 'R$ 0',
      progress: 0,
    },
    {
      id: 'turnover',
      tone: 'tertiary',
      badge: 'Giro',
      icon: 'trending_up',
      label: 'Giro de estoque (mês)',
      value: '—',
      progress: 0,
    },
  ],
};

const freelancers = {
  roles: ['Barman', 'Garçom', 'Cozinha'],
  people: [],
  dailies: [],
  summary: { costsToday: 'R$ 0', activeNow: '00' },
};

const suppliers = {
  suppliers: [],
};

module.exports = { overview, cashFlow, inventory, freelancers, suppliers };
