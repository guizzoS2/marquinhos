export const MENU_GROUPS = [
  {
    id: 'bebidas-alcoolicas',
    name: 'Bebidas alcoólicas',
    subgroups: [
      { id: 'cervejas', name: 'Cervejas' },
      { id: 'cervejas-artesanais', name: 'Cervejas artesanais' },
      { id: 'destilados', name: 'Destilados' },
      { id: 'doses-e-licores', name: 'Doses e licores' },
      { id: 'vinhos-e-espumantes', name: 'Vinhos e espumantes' },
      { id: 'coqueteis-e-drinks', name: 'Coquetéis e drinks' },
      { id: 'drinks-autorais', name: 'Drinks autorais' },
    ],
  },
  {
    id: 'bebidas-nao-alcoolicas',
    name: 'Bebidas não alcoólicas',
    subgroups: [
      { id: 'refrigerantes', name: 'Refrigerantes' },
      { id: 'aguas', name: 'Águas' },
      { id: 'sucos', name: 'Sucos' },
      { id: 'energeticos', name: 'Energéticos' },
      { id: 'outras-bebidas', name: 'Outras' },
    ],
  },
  {
    id: 'comidas',
    name: 'Comidas, porções e petiscos',
    subgroups: [],
  },
  {
    id: 'mercearia',
    name: 'Mercearia',
    subgroups: [
      { id: 'cigarros', name: 'Cigarros' },
      { id: 'doces', name: 'Doces' },
      { id: 'chicletes', name: 'Chicletes' },
      { id: 'outros-mercearia', name: 'Outros' },
    ],
  },
];

export const PRODUCT_FORMATS = ['Lata', 'Long neck', 'Litrão', 'Garrafa', 'Dose', 'Copo', 'Porção', 'Unidade'];

export const FIXED_EXPENSE_IDS = ['compra_estoque', 'funcionarios', 'freelancer'];

export const EXPENSE_TYPES = [
  {
    id: 'compra_estoque',
    name: 'Compra de estoque',
    type: 'expense',
    defaultNature: 'variable',
    party: 'supplier',
    icon: 'local_shipping',
    allowsSubtypes: false,
    subtypes: [],
  },
  {
    id: 'funcionarios',
    name: 'Funcionários',
    type: 'expense',
    defaultNature: 'variable',
    party: 'staff',
    icon: 'badge',
    allowsSubtypes: false,
    subtypes: [],
  },
  {
    id: 'freelancer',
    name: 'Freelancer',
    type: 'expense',
    defaultNature: 'variable',
    party: 'freelancer',
    icon: 'person',
    allowsSubtypes: false,
    subtypes: [],
  },
  {
    id: 'taxas',
    name: 'Taxas',
    type: 'expense',
    defaultNature: 'variable',
    party: 'none',
    icon: 'receipt_long',
    allowsSubtypes: false,
    subtypes: [],
  },
  {
    id: 'manutencao',
    name: 'Manutenção',
    type: 'expense',
    defaultNature: 'variable',
    party: 'none',
    icon: 'build',
    allowsSubtypes: false,
    subtypes: [],
  },
  {
    id: 'despesas_gerais',
    name: 'Despesas gerais',
    type: 'expense',
    defaultNature: 'variable',
    party: 'none',
    icon: 'payments',
    allowsSubtypes: true,
    subtypes: [
      { id: 'aluguel', name: 'Aluguel', defaultNature: 'fixed' },
      { id: 'utilidades', name: 'Utilidades', defaultNature: 'fixed' },
      { id: 'software', name: 'Software', defaultNature: 'fixed' },
      { id: 'outras', name: 'Outras', defaultNature: 'variable' },
    ],
  },
];

export const RETIRED_EXPENSE_IDS = ['bebidas', 'fornecedor', 'suprimentos', 'salarios', 'utilidades', 'aluguel', 'software'];

const PARTY_BY_ID = {
  compra_estoque: 'supplier',
  fornecedor: 'supplier',
  bebidas: 'supplier',
  suprimentos: 'supplier',
  freelancer: 'freelancer',
  funcionarios: 'staff',
  salarios: 'staff',
};

const LEGACY_TYPE = {
  bebidas: 'Compra de estoque',
  fornecedor: 'Compra de estoque',
  suprimentos: 'Compra de estoque',
  compra_estoque: 'Compra de estoque',
  salarios: 'Funcionários',
  funcionarios: 'Funcionários',
  aluguel: 'Despesas gerais',
  utilidades: 'Despesas gerais',
  software: 'Despesas gerais',
  despesas_gerais: 'Despesas gerais',
  manutencao: 'Manutenção',
  freelancer: 'Freelancer',
  taxas: 'Taxas',
};

const LEGACY_SUBTYPE = {
  aluguel: 'Aluguel',
  utilidades: 'Utilidades',
  software: 'Software',
};

const LEGACY_PRODUCT = {
  cervejas: ['bebidas-alcoolicas', 'cervejas'],
  destilados: ['bebidas-alcoolicas', 'destilados'],
  'cervejas artesanais': ['bebidas-alcoolicas', 'cervejas-artesanais'],
  'doses e licores': ['bebidas-alcoolicas', 'doses-e-licores'],
  'vinhos e espumantes': ['bebidas-alcoolicas', 'vinhos-e-espumantes'],
  vinhos: ['bebidas-alcoolicas', 'vinhos-e-espumantes'],
  'coqueteis e drinks': ['bebidas-alcoolicas', 'coqueteis-e-drinks'],
  coqueteis: ['bebidas-alcoolicas', 'coqueteis-e-drinks'],
  'drinks autorais': ['bebidas-alcoolicas', 'drinks-autorais'],
  'soft drinks': ['bebidas-nao-alcoolicas', 'outras-bebidas'],
  'soft drink': ['bebidas-nao-alcoolicas', 'outras-bebidas'],
  refrigerantes: ['bebidas-nao-alcoolicas', 'refrigerantes'],
  aguas: ['bebidas-nao-alcoolicas', 'aguas'],
  sucos: ['bebidas-nao-alcoolicas', 'sucos'],
  energeticos: ['bebidas-nao-alcoolicas', 'energeticos'],
  mercearia: ['mercearia', ''],
  cigarros: ['mercearia', 'cigarros'],
  doces: ['mercearia', 'doces'],
  chicletes: ['mercearia', 'chicletes'],
  comidas: ['comidas', ''],
  'comidas, porcoes e petiscos': ['comidas', ''],
};

function plain(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function taxonomyId(name, taken) {
  const base =
    plain(name)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'item';
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function cloneGroup(group) {
  return {
    id: group.id,
    name: group.name,
    description: String(group.description || '').trim(),
    ...(group.icon ? { icon: String(group.icon) } : {}),
    subgroups: (group.subgroups || []).map((item) => ({ id: item.id, name: item.name })),
  };
}

function findGroup(groups, id) {
  return groups.find((group) => group.id === id);
}

function findSubgroup(group, id) {
  return (group?.subgroups || []).find((item) => item.id === id);
}

export function mergeMenuGroups(existing, legacyFilters = []) {
  if (Array.isArray(existing)) return existing.map(cloneGroup);
  const groups = MENU_GROUPS.map(cloneGroup);
  (legacyFilters || []).forEach((label) => {
    const name = String(label || '').trim();
    if (!name || plain(name) === 'todos' || plain(name) === 'combos') return;
    const legacy = LEGACY_PRODUCT[plain(name)];
    if (legacy && findGroup(groups, legacy[0])) return;
    if (groups.some((group) => plain(group.name) === plain(name))) return;
    if (groups.some((group) => (group.subgroups || []).some((sub) => plain(sub.name) === plain(name)))) return;
    const taken = new Set(groups.map((group) => group.id));
    groups.push({ id: taxonomyId(name, taken), name, subgroups: [] });
  });
  return groups;
}

export function mergeFormats(existing) {
  const list = [];
  const source = Array.isArray(existing) ? existing : PRODUCT_FORMATS;
  source.forEach((item) => {
    const name = String(item || '').trim();
    if (!name || list.some((row) => plain(row) === plain(name))) return;
    list.push(name);
  });
  return list;
}

const SOFT_DRINK = ['refrigerante', 'agua', 'suco', 'energetico', 'energeticos'];
const LEGACY_BUCKETS = new Set(['bebidas', 'bebida', 'porcoes', 'porcao', 'insumos', 'combos', 'combo']);

function legacyBucket(group) {
  return LEGACY_BUCKETS.has(plain(group?.name)) || LEGACY_BUCKETS.has(plain(group?.id));
}

export function stockGroupOf(product, groups = []) {
  if (!product || product.tipo === 'combo') return null;
  const list = groups?.length ? groups : MENU_GROUPS;
  const byId = product.grupoId ? list.find((group) => group.id === product.grupoId) : null;
  if (byId && !legacyBucket(byId)) return byId;

  const names = [product.grupo, product.subgrupo, product.categoria, product.category].map(plain).filter(Boolean);
  const byName = list.find((group) => !legacyBucket(group) && names.includes(plain(group.name)));
  if (byName) return byName;

  const bySubgroup = list.find((group) =>
    (group.subgroups || []).some((sub) => names.includes(plain(sub.name)) || names.includes(plain(sub.id)))
  );
  if (bySubgroup) return bySubgroup;

  const legacy = LEGACY_PRODUCT[plain(product.categoria || product.grupo || product.category)];
  if (legacy) {
    const mapped = list.find((group) => group.id === legacy[0]);
    if (mapped) return mapped;
  }

  const bucket = plain(product.grupo || product.categoria || product.category);
  if (bucket === 'porcoes' || bucket === 'porcao' || bucket === 'comidas') {
    return list.find((group) => group.id === 'comidas') || list.find((group) => plain(group.name).includes('comida')) || null;
  }
  if (bucket === 'mercearia' || bucket === 'insumos') {
    return list.find((group) => group.id === 'mercearia') || null;
  }
  if (bucket === 'bebidas' || bucket === 'bebida') {
    const blob = plain(`${product.nome || ''} ${product.name || ''} ${product.subgrupo || ''} ${product.familia || ''}`);
    const soft = SOFT_DRINK.some((word) => blob.includes(word));
    const id = soft ? 'bebidas-nao-alcoolicas' : 'bebidas-alcoolicas';
    return list.find((group) => group.id === id) || null;
  }
  return null;
}

export function resolveProductTaxonomy(item) {
  if (item?.tipo === 'combo') {
    return { grupoId: '', grupo: '', subgrupoId: '', subgrupo: '', formato: '', familia: '' };
  }
  const formato = String(item?.formato || '').trim();
  const familia = String(item?.familia || '').trim();
  if (item?.grupo || item?.grupoId) {
    return {
      grupoId: item.grupoId || '',
      grupo: item.grupo || '',
      subgrupoId: item.subgrupoId || '',
      subgrupo: item.subgrupo || '',
      formato,
      familia,
    };
  }
  const legacy = LEGACY_PRODUCT[plain(item?.categoria || item?.category)];
  if (legacy) {
    const group = findGroup(MENU_GROUPS, legacy[0]);
    const subgroup = findSubgroup(group, legacy[1]);
    return {
      grupoId: group?.id || '',
      grupo: group?.name || '',
      subgrupoId: subgroup?.id || '',
      subgrupo: subgroup?.name || '',
      formato,
      familia,
    };
  }
  const name = String(item?.categoria || item?.category || '').trim();
  if (!name || plain(name) === 'insumos') {
    return { grupoId: '', grupo: name && plain(name) !== 'insumos' ? name : 'Insumos', subgrupoId: '', subgrupo: '', formato, familia };
  }
  return { grupoId: '', grupo: name, subgrupoId: '', subgrupo: '', formato, familia };
}

export function partyForCategoryId(categoryId) {
  return PARTY_BY_ID[categoryId] || 'none';
}

export function expensePartyOf(category) {
  if (category?.party) return category.party;
  return partyForCategoryId(category?.id);
}

export function activeExpenseTypes(categories) {
  return (categories || []).filter((item) => item && !item.retired && !RETIRED_EXPENSE_IDS.includes(item.id));
}

export function categoryAllowsSubtypes(category) {
  if (typeof category?.allowsSubtypes === 'boolean') return category.allowsSubtypes;
  return (category?.subtypes || []).length > 0;
}

export function fixedExpenseCategory(categoryId) {
  return FIXED_EXPENSE_IDS.includes(categoryId);
}

const GROUP_TAGS = {
  'bebidas-alcoolicas': { tone: 'blue', icon: 'sports_bar' },
  'bebidas-nao-alcoolicas': { tone: 'cyan', icon: 'water_drop' },
  comidas: { tone: 'orange', icon: 'restaurant' },
  mercearia: { tone: 'purple', icon: 'storefront' },
};

const EXPENSE_TAGS = {
  compra_estoque: { tone: 'amber', icon: 'local_shipping' },
  fornecedor: { tone: 'amber', icon: 'local_shipping' },
  bebidas: { tone: 'amber', icon: 'local_shipping' },
  suprimentos: { tone: 'amber', icon: 'local_shipping' },
  funcionarios: { tone: 'indigo', icon: 'badge' },
  salarios: { tone: 'indigo', icon: 'badge' },
  freelancer: { tone: 'teal', icon: 'person' },
  taxas: { tone: 'rose', icon: 'receipt_long' },
  manutencao: { tone: 'brown', icon: 'build' },
  despesas_gerais: { tone: 'pink', icon: 'payments' },
  aluguel: { tone: 'pink', icon: 'payments' },
  utilidades: { tone: 'pink', icon: 'payments' },
  software: { tone: 'pink', icon: 'payments' },
  comanda_aberta: { tone: 'ink', icon: 'receipt_long' },
};

const TAG_TONES = ['blue', 'cyan', 'orange', 'purple', 'amber', 'indigo', 'teal', 'rose', 'brown', 'pink'];

function tagToneFor(key) {
  const text = String(key || 'tag');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return TAG_TONES[hash % TAG_TONES.length];
}

function knownGroup(id, name) {
  if (id && GROUP_TAGS[id]) {
    const seeded = MENU_GROUPS.find((group) => group.id === id);
    return { ...GROUP_TAGS[id], label: name || seeded?.name || id };
  }
  const target = plain(name || id);
  if (!target) return null;
  const seeded = MENU_GROUPS.find((group) => group.id === id || plain(group.name) === target);
  if (seeded && GROUP_TAGS[seeded.id]) return { ...GROUP_TAGS[seeded.id], label: seeded.name };
  return null;
}

export function groupTag(source = {}) {
  const id = typeof source === 'string' ? source : source.id || source.grupoId || '';
  const name = typeof source === 'string' ? '' : source.name || source.grupo || '';
  if (plain(name) === 'venda' || plain(id) === 'venda') {
    return { tone: 'accent', icon: 'point_of_sale', label: 'Venda' };
  }
  const known = knownGroup(id, name);
  if (known) return known;
  const label = name || id || 'Grupo';
  return { tone: tagToneFor(id || label), icon: 'category', label };
}

export function groupIcon(group) {
  return group?.icon || groupTag(group || {}).icon;
}

export function expenseIcon(category) {
  if (category?.icon && category.icon !== 'category') return category.icon;
  return expenseTag(category?.id, { icon: category?.icon, name: category?.name }).icon;
}

export function productGroupTag(item) {
  const taxonomy = resolveProductTaxonomy(item || {});
  const id = item?.grupoId || taxonomy.grupoId || '';
  const name = item?.grupo || taxonomy.grupo || item?.category || item?.categoria || '';
  if (!id && !name) return { tone: 'neutral', icon: 'category', label: '—' };
  return groupTag({ id, name });
}

export function saleGroupTags(sale, products = []) {
  const tags = [];
  const seen = new Set();
  (sale?.itens || []).forEach((line) => {
    const product = (products || []).find((item) => String(item.id) === String(line.produto_id));
    if (!product) return;
    const taxonomy = resolveProductTaxonomy(product);
    const id = product.grupoId || taxonomy.grupoId || '';
    const name = product.grupo || taxonomy.grupo || '';
    const key = id || plain(name);
    if (!key || seen.has(key)) return;
    seen.add(key);
    tags.push(groupTag({ id, name }));
  });
  if (!tags.length) tags.push(groupTag({ name: 'Venda' }));
  return tags;
}

export function incomeGroupTags(row, sale, products = []) {
  if (sale) return saleGroupTags(sale, products);
  const name = String(row?.categoria || '').trim();
  if (!name || plain(name) === 'varejo' || plain(name) === 'venda') return [groupTag({ name: 'Venda' })];
  const tag = groupTag({ name });
  const known = MENU_GROUPS.some((group) => plain(group.name) === plain(name) || group.id === name);
  if (!known && row?.categoryIcon) return [{ ...tag, icon: row.categoryIcon }];
  return [tag];
}

export function expenseTag(categoryId, extra = {}) {
  const id = categoryId || extra.id || '';
  const known = EXPENSE_TAGS[id];
  if (known) return { tone: known.tone, icon: known.icon };
  return {
    tone: tagToneFor(id || extra.name || 'despesa'),
    icon: extra.icon || 'payments',
  };
}

export function expenseCategoryTone(categoryId) {
  return expenseTag(categoryId).tone;
}

export function expenseTypeLabel(row) {
  const id = row?.categoryId || '';
  const base = LEGACY_TYPE[id] || row?.category || row?.categoria || 'Despesa';
  const subtype = row?.subtype || LEGACY_SUBTYPE[id] || '';
  if (subtype && !String(base).includes(subtype)) return `${base} · ${subtype}`;
  return base;
}

function joinNames(names) {
  const list = names.filter(Boolean);
  if (!list.length) return '';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} e ${list[1]}`;
  return `${list[0]}, ${list[1]} e mais ${list.length - 2}`;
}

export function withoutExpenseDate(text) {
  return String(text || '')
    .replace(/\s+em\s+\d{1,2}\s+de\s+[a-zà-ú.]{3,}\.?$/i, '')
    .replace(/\s+em\s+\d{1,2}\/\d{1,2}(?:\/\d{2,4})?$/i, '')
    .trim();
}

export function describeExpense({
  party = 'none',
  categoryName = '',
  subtypeName = '',
  supplier = '',
  productNames = [],
  note = '',
} = {}) {
  const written = withoutExpenseDate(note);
  if (written && written !== '—') return written;
  const who = String(supplier || '').trim();
  const products = joinNames(productNames.map((item) => String(item || '').trim()).filter(Boolean));
  if (party === 'staff') return who ? `Pagamento de ${who}` : 'Pagamento de funcionário';
  if (party === 'freelancer') {
    return who ? `Contratação de ${who}` : 'Contratação de freelancer';
  }
  if (party === 'supplier') {
    if (products && who) return `Compra de ${products} com ${who}`;
    if (products) return `Compra de ${products}`;
    if (who) return `Compra de estoque com ${who}`;
    return 'Compra de estoque';
  }
  if (subtypeName) return subtypeName;
  return categoryName || 'Despesa';
}

export function saleDescription(sale) {
  const note = String(sale?.observacao || '').trim();
  if (note) return note;
  const names = (sale?.itens || []).map((item) => item?.nome).filter(Boolean);
  if (!names.length) return 'Venda';
  return `Venda de ${joinNames(names)}`;
}

export function saleGroupLabel(sale, products = []) {
  const names = [];
  (sale?.itens || []).forEach((line) => {
    const product = (products || []).find((item) => String(item.id) === String(line.produto_id));
    const group = product?.grupo || resolveProductTaxonomy(product || {}).grupo;
    if (group && !names.includes(group)) names.push(group);
  });
  return names.join(', ') || 'Venda';
}

export function movementCopy(row, { sale = null, purchase = null, products = [] } = {}) {
  if (row?.tipo === 'entrada') {
    const rawDescription = row.description || (row.descricao && row.descricao !== '—' ? row.descricao : '');
    const staleDescription = !rawDescription || String(rawDescription).startsWith('PDV');
    const staleCategory = !row.categoria || row.categoria === 'Varejo';
    return {
      descricao: sale && staleDescription ? saleDescription(sale) : rawDescription || (sale ? saleDescription(sale) : 'Venda'),
      categoria: sale && staleCategory ? saleGroupLabel(sale, products) : staleCategory ? 'Venda' : row.categoria,
      origem: row.entidade || sale?.cliente_nome || '',
    };
  }
  const party = partyForCategoryId(row?.categoryId);
  const stored = row?.description || (row?.descricao && row.descricao !== '—' ? row.descricao : '');
  const generated = describeExpense({
    party,
    categoryName: expenseTypeLabel(row),
    subtypeName: row?.subtype || LEGACY_SUBTYPE[row?.categoryId] || '',
    supplier: row?.supplier || '',
    date: row?.date || '',
    productNames: (purchase?.itens || []).map((item) => item.nome),
    note: stored,
  });
  return {
    descricao: generated,
    categoria: expenseTypeLabel(row),
    origem: row?.supplier || row?.entidade || '',
  };
}
