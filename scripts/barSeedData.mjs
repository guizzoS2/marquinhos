import { buildCashFlowSummary, formatCents } from '../apps/marquinhos/src/services/cashFlowUtils.js';

const expenseCategories = [
  { id: 'bebidas', name: 'Bebidas', type: 'expense', defaultNature: 'variable', icon: 'local_shipping' },
  { id: 'freelancer', name: 'Freelancer', type: 'expense', defaultNature: 'variable', icon: 'person' },
  { id: 'suprimentos', name: 'Suprimentos', type: 'expense', defaultNature: 'variable', icon: 'ac_unit' },
  { id: 'utilidades', name: 'Utilidades', type: 'expense', defaultNature: 'fixed', icon: 'bolt' },
  { id: 'aluguel', name: 'Aluguel', type: 'expense', defaultNature: 'fixed', icon: 'home' },
  { id: 'software', name: 'Software', type: 'expense', defaultNature: 'fixed', icon: 'devices' },
  { id: 'salarios', name: 'Salários', type: 'expense', defaultNature: 'fixed', icon: 'badge' },
  { id: 'manutencao', name: 'Manutenção', type: 'expense', defaultNature: 'variable', icon: 'build' },
];

const PAYMENTS = ['dinheiro', 'cartao_credito', 'cartao_debito', 'pix'];

function mulberry32(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

function between(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

function money(reais) {
  return Math.round(Number(reais) * 100) / 100;
}

function isoDay(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function atTime(day, hour, minute) {
  const date = new Date(day);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function formatExpenseDate(isoDate) {
  const date = new Date(`${isoDate}T12:00:00`);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function weekdayWeight(date) {
  const day = date.getDay();
  if (day === 6) return 6;
  if (day === 5) return 5;
  if (day === 0) return 2;
  if (day === 4) return 2;
  return 1;
}

const CATALOG = [
  ['Bebidas', 'Pilsen 600ml', 'Marquinhos', 12, 350, 'ML'],
  ['Bebidas', 'Lager long neck', 'Serra', 10, 330, 'ML'],
  ['Bebidas', 'IPA lata', 'Leste', 16, 473, 'ML'],
  ['Bebidas', 'Weiss 500ml', 'Casa', 18, 500, 'ML'],
  ['Bebidas', 'Vinho tinto taça', 'Adega', 22, 150, 'ML'],
  ['Bebidas', 'Espumante taça', 'Adega', 28, 120, 'ML'],
  ['Bebidas', 'Gin tônica', 'Casa', 32, 300, 'ML'],
  ['Bebidas', 'Caipirinha', 'Casa', 24, 300, 'ML'],
  ['Bebidas', 'Whisky dose', 'Vale', 36, 50, 'ML'],
  ['Bebidas', 'Vodka dose', 'Vale', 26, 50, 'ML'],
  ['Bebidas', 'Refrigerante lata', 'Norte', 8, 350, 'ML'],
  ['Bebidas', 'Água sem gás', 'Norte', 6, 500, 'ML'],
  ['Bebidas', 'Suco natural', 'Casa', 12, 300, 'ML'],
  ['Bebidas', 'Energético', 'Norte', 14, 250, 'ML'],
  ['Porções', 'Batata frita', 'Cozinha', 28, 400, 'G'],
  ['Porções', 'Mandioca frita', 'Cozinha', 26, 400, 'G'],
  ['Porções', 'Frango passarinho', 'Cozinha', 36, 450, 'G'],
  ['Porções', 'Calabresa acebolada', 'Cozinha', 34, 400, 'G'],
  ['Porções', 'Queijo coalho', 'Cozinha', 32, 300, 'G'],
  ['Porções', 'Isca de peixe', 'Cozinha', 42, 350, 'G'],
  ['Porções', 'Pastel de queijo', 'Cozinha', 18, 120, 'G'],
  ['Porções', 'Bolinho de bacalhau', 'Cozinha', 38, 250, 'G'],
  ['Porções', 'Anel de cebola', 'Cozinha', 27, 300, 'G'],
  ['Porções', 'Tábua de frios', 'Cozinha', 58, 500, 'G'],
  ['Insumos', 'Limão kg', 'Horta', 9, 1, 'KG'],
  ['Insumos', 'Gelo 5kg', 'Gelosul', 16, 5, 'KG'],
  ['Insumos', 'Hortelã maço', 'Horta', 6, 1, 'UN'],
  ['Insumos', 'Xarope de gengibre', 'Casa', 22, 750, 'ML'],
  ['Insumos', 'Guardanapo fardo', 'Papel', 14, 1, 'UN'],
  ['Insumos', 'Carvão 3kg', 'Brasa', 19, 3, 'KG'],
];

const SUPPLIER_NAMES = [
  'Distribuidora Aurora',
  'Gelosul Leste',
  'Hortifruti da Penha',
  'Adega Central',
  'Bebidas Norte',
  'Embalagens Paulista',
  'Carnes do Porto',
  'Laticínios Serra',
  'Destilaria Vale',
  'Atacado São Miguel',
];

const FIRST_NAMES = ['Ana', 'Bruno', 'Camila', 'Diego', 'Elena', 'Felipe', 'Helena', 'Igor', 'Julia', 'Kaio', 'Lara', 'Miguel', 'Nina', 'Otávio', 'Paula'];
const ROLES = ['Barman', 'Garçom', 'Cozinha'];
const GUESTS = ['Consumidor', 'Consumidor', 'Consumidor', 'Mesa janela', 'Aniversário', 'Turma do fundão'];

function productRecord(row, index, stock, suggested) {
  const [categoria, nome, marca, preco, volume, medida] = row;
  const codigo = String(index + 1).padStart(4, '0');
  const low = stock <= suggested;
  return {
    id: `prd-${codigo}`,
    codigo,
    nome,
    name: nome,
    marca,
    descricao: nome,
    subtitle: nome,
    categoria,
    category: categoria,
    volume_peso: volume,
    medida,
    tipo: 'simples',
    estoque_atual: stock,
    estoque_sugerido: suggested,
    valor_unitario: preco,
    cost: preco,
    stock: `${stock} un`,
    minStock: `${suggested} un`,
    status: low ? 'low' : 'stable',
    statusLabel: low ? 'Estoque Baixo' : 'Estável',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function syncStock(product, qty) {
  product.estoque_atual = qty;
  product.stock = `${qty} un`;
  const low = qty <= product.estoque_sugerido;
  product.status = low ? 'low' : 'stable';
  product.statusLabel = low ? 'Estoque Baixo' : 'Estável';
}

export function buildBarSeed(now = new Date()) {
  const random = mulberry32(20261006);
  const end = new Date(now);
  end.setHours(20, 0, 0, 0);
  const start = new Date(end);
  start.setMonth(start.getMonth() - 6);
  start.setHours(11, 0, 0, 0);

  const products = CATALOG.map((row, index) => {
    const suggested = row[0] === 'Insumos' ? 8 : 24;
    const opening = row[0] === 'Bebidas' ? 180 : row[0] === 'Porções' ? 90 : 40;
    return productRecord(row, index, opening, suggested);
  });
  const byId = new Map(products.map((item) => [item.id, item]));
  const sellable = products.filter((item) => item.categoria !== 'Insumos');
  const weightedSellable = sellable.flatMap((item) =>
    item.categoria === 'Bebidas' ? [item, item, item] : [item]
  );

  const suppliers = SUPPLIER_NAMES.map((name, index) => ({
    id: index + 1,
    name,
    contact: `(11) 9${String(70000000 + index * 137).slice(0, 8)}`,
    cnpj: `00.000.000/0001-${String(10 + index).padStart(2, '0')}`,
    lastPurchase: '',
    lastValue: '',
    lastAmount: 0,
    history: [],
  }));

  const people = FIRST_NAMES.map((name, index) => {
    const role = ROLES[index % ROLES.length];
    const rate = 120 + (index % 5) * 20;
    return {
      id: index + 1,
      name: `${name} Freela`,
      role,
      contact: `(11) 9888${String(1000 + index).slice(-4)}`,
      status: 'available',
      statusLabel: 'Disponível',
      dailyRate: formatCents(rate * 100),
      image: '',
    };
  });

  const days = [];
  for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    days.push(new Date(cursor));
  }
  const bag = days.flatMap((day) => Array.from({ length: weekdayWeight(day) }, () => day));

  const expenses = [];
  const incomes = [];
  const purchases = [];
  const entries = [];
  const sales = [];

  for (let index = 0; index < 50; index += 1) {
    const day = days[Math.floor((index / 50) * (days.length - 1))];
    const when = atTime(day, between(random, 8, 11), between(random, 0, 59));
    const supplier = pick(random, suppliers);
    const lines = [];
    const count = between(random, 1, 3);
    const used = new Set();
    while (lines.length < count) {
      const product = pick(random, products);
      if (used.has(product.id)) continue;
      used.add(product.id);
      const quantidade = between(random, 8, 24);
      const overpriced = product.nome === 'Whisky dose' || product.nome === 'Gin tônica';
      const valor = overpriced ? money(product.valor_unitario * 1.4) : money(product.valor_unitario * 0.45);
      lines.push({
        produto_id: product.id,
        nome: product.nome,
        quantidade,
        valor_unitario: valor,
        valor_total: money(valor * quantidade),
      });
      syncStock(product, product.estoque_atual + quantidade);
    }
    const total = money(lines.reduce((sum, line) => sum + line.valor_total, 0));
    const purchaseId = `purchase-seed-${String(index + 1).padStart(3, '0')}`;
    const expenseId = `exp-${purchaseId}`;
    const stamp = when.toISOString();
    const dayIso = isoDay(when);
    purchases.push({
      id: purchaseId,
      date: dayIso,
      supplierId: supplier.id,
      supplierName: supplier.name,
      categoryId: 'bebidas',
      categoryName: 'Bebidas',
      total,
      itens: lines,
      expenseId,
      status: 'ativa',
      created_at: stamp,
    });
    lines.forEach((line, lineIndex) => {
      entries.push({
        id: `buy-${purchaseId}-${lineIndex}`,
        itemId: line.produto_id,
        quantity: line.quantidade,
        purchaseId,
        date: dayIso,
        created_at: stamp,
      });
    });
    const amountCents = Math.round(total * 100);
    expenses.push({
      id: expenseId,
      date: formatExpenseDate(dayIso),
      supplier: supplier.name,
      supplierId: supplier.id,
      category: 'Bebidas',
      categoryId: 'bebidas',
      categoryIcon: 'local_shipping',
      nature: 'variable',
      value: formatCents(amountCents),
      amount: amountCents,
      source: 'purchase',
      importKey: null,
      createdAt: stamp,
    });
    supplier.history.unshift({
      id: expenseId,
      date: formatExpenseDate(dayIso),
      category: 'Bebidas',
      value: formatCents(amountCents),
      amount: amountCents,
      purchaseId,
    });
    supplier.lastPurchase = formatExpenseDate(dayIso);
    supplier.lastValue = formatCents(amountCents);
    supplier.lastAmount = amountCents;
  }

  const comandas = new Map();
  let saleIndex = 0;
  let guard = 0;
  while (sales.length < 200 && guard < 4000) {
    guard += 1;
    const day = pick(random, bag);
    const when = atTime(day, between(random, 12, 23), between(random, 0, 59));
    const dayKey = isoDay(when);
    const lines = [];
    const count = between(random, 1, 3);
    for (let n = 0; n < count; n += 1) {
      const product = pick(random, weightedSellable);
      const quantidade = Math.min(between(random, 1, 3), product.estoque_atual);
      if (quantidade <= 0) continue;
      const valor = money(product.valor_unitario);
      lines.push({
        produto_id: product.id,
        nome: product.nome,
        quantidade,
        valor_unitario: valor,
        valor_total: money(valor * quantidade),
      });
      syncStock(product, product.estoque_atual - quantidade);
    }
    if (!lines.length) continue;
    saleIndex += 1;
    const total = money(lines.reduce((sum, line) => sum + line.valor_total, 0));
    const forma = pick(random, PAYMENTS);
    const guest = pick(random, GUESTS);
    let numero = null;
    if (random() < 0.55) {
      const taken = comandas.get(dayKey) || new Set();
      numero = between(random, 1, 40);
      let spin = 0;
      while (taken.has(numero) && spin < 40) {
        numero = between(random, 1, 40);
        spin += 1;
      }
      taken.add(numero);
      comandas.set(dayKey, taken);
    }
    const saleId = `sale-seed-${String(saleIndex).padStart(3, '0')}`;
    const stamp = when.toISOString();
    const sale = {
      id: saleId,
      numero_comanda: numero,
      status: 'paga',
      cliente_id: null,
      cliente_nome: guest,
      forma_pagamento: forma,
      valor_recebido: null,
      troco: null,
      parcelas: null,
      total,
      itens: lines,
      created_at: stamp,
      updated_at: stamp,
      usuario_id: null,
    };
    if (forma === 'dinheiro') {
      const recebido = money(total + between(random, 0, 20));
      sale.valor_recebido = recebido;
      sale.troco = money(recebido - total);
    }
    if (forma === 'cartao_credito') sale.parcelas = between(random, 1, 3);
    sales.push(sale);
    const amountCents = Math.round(total * 100);
    incomes.push({
      id: `inc-${saleId}`,
      date: formatExpenseDate(dayKey),
      description: numero != null ? `PDV · comanda ${numero} · ${guest}` : `PDV · ${guest}`,
      category: 'Varejo',
      categoryIcon: 'payments',
      categoryTone: 'secondary',
      value: formatCents(amountCents),
      amount: amountCents,
      source: 'pdv',
      importKey: null,
      createdAt: stamp,
    });
  }

  const dailies = [];
  for (let index = 0; index < 40; index += 1) {
    const person = people[index % people.length];
    const future = index >= 28;
    const day = future
      ? new Date(end.getTime() + (index - 27) * 24 * 60 * 60 * 1000)
      : days[Math.floor((index / 28) * (days.length - 1))];
    const dayIso = isoDay(day);
    const rate = Number(String(person.dailyRate).replace(/[^\d,]/g, '').replace(',', '.'));
    const value = Number.isFinite(rate) && rate > 0 ? rate : 150;
    const entry = {
      id: `daily-seed-${String(index + 1).padStart(3, '0')}`,
      freelancerId: person.id,
      date: dayIso,
      role: person.role,
      value,
      status: future ? 'pending_payment' : 'paid',
      createdAt: atTime(day, 9, 0).toISOString(),
    };
    if (!future) {
      const amountCents = Math.round(value * 100);
      const expenseId = `exp-${entry.id}`;
      entry.expenseId = expenseId;
      expenses.push({
        id: expenseId,
        date: formatExpenseDate(dayIso),
        supplier: person.name,
        supplierId: null,
        category: 'Freelancer',
        categoryId: 'freelancer',
        categoryIcon: 'person',
        nature: 'variable',
        value: formatCents(amountCents),
        amount: amountCents,
        source: 'freelancer_daily',
        importKey: null,
        createdAt: entry.createdAt,
      });
    }
    dailies.push(entry);
  }

  const low = products.filter((item) => item.categoria !== 'Insumos').sort((a, b) => a.estoque_atual - b.estoque_atual);
  low.slice(0, 4).forEach((item) => {
    item.estoque_sugerido = item.estoque_atual + 6;
    item.minStock = `${item.estoque_sugerido} un`;
    syncStock(item, item.estoque_atual);
  });

  const summary = buildCashFlowSummary(incomes, expenses);
  return {
    inventory: {
      filters: ['Todos', 'Bebidas', 'Porções', 'Insumos'],
      items: products,
      entries,
      productions: [],
      promotions: [],
      comboItems: [],
      sales,
      closings: [],
      purchases,
    },
    suppliers: { suppliers },
    freelancers: {
      roles: ROLES,
      people,
      dailies,
      summary: { costsToday: 'R$ 0', activeNow: '00' },
    },
    cashFlow: {
      period: end.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      categories: expenseCategories,
      incomes,
      expenses,
      summary,
    },
  };
}
