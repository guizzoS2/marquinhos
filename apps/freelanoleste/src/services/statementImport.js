function parseMoneyToCents(value) {
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

export function statementFingerprint({ date, amountCents, description }) {
  const desc = String(description || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  return `${date}|${amountCents}|${desc}`;
}

export function parseBrDate(raw) {
  const value = String(raw || '').trim();
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = value.match(/^(\d{2})\/(\d{2})\/(\d{2,4})/);
  if (!br) return null;
  const year = br[3].length === 2 ? `20${br[3]}` : br[3];
  return `${year}-${br[2]}-${br[1]}`;
}

function detectKind(typeRaw, amountCents, description) {
  const blob = `${typeRaw || ''} ${description || ''}`.toLowerCase();
  if (amountCents < 0) return 'saida';
  if (/\b(d|débito|debito|sa[ií]da|enviado|pagamento|compra|tarifa)\b/.test(blob)) {
    return 'saida';
  }
  if (/\b(c|crédito|credito|entrada|recebido|venda|dep[oó]sito)\b/.test(blob)) {
    return 'entrada';
  }
  return 'entrada';
}

function toRow({ date, description, amountRaw, typeRaw }) {
  const iso = parseBrDate(date);
  if (!iso) return null;
  let amountCents = parseMoneyToCents(amountRaw);
  if (!amountCents) return null;
  const kind = detectKind(typeRaw, amountCents, description);
  amountCents = Math.abs(amountCents);
  const label = String(description || 'Lançamento').trim() || 'Lançamento';
  return {
    id: statementFingerprint({ date: iso, amountCents, description: label }),
    date: iso,
    description: label,
    amountCents,
    kind,
    selected: true,
  };
}

function splitCsvLine(line, sep) {
  const cells = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === sep && !quoted) {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

export function parseCsv(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const sep = lines[0].includes(';') ? ';' : ',';
  const headers = splitCsvLine(lines[0], sep).map((cell) => cell.toLowerCase());
  const dateIdx = headers.findIndex((h) => /data|date/.test(h));
  const descIdx = headers.findIndex((h) => /hist|desc|memo|lan[cç]amento|detalhe|nome/.test(h));
  const valueIdx = headers.findIndex((h) => /valor|value|amount|quantia/.test(h));
  const typeIdx = headers.findIndex((h) => /tipo|d\/c|d[eé]bito|cr[eé]dito|natureza/.test(h));
  if (dateIdx < 0 || valueIdx < 0) return [];

  return lines.slice(1).reduce((rows, line) => {
    const cells = splitCsvLine(line, sep);
    const row = toRow({
      date: cells[dateIdx],
      description: descIdx >= 0 ? cells[descIdx] : 'Lançamento',
      amountRaw: cells[valueIdx],
      typeRaw: typeIdx >= 0 ? cells[typeIdx] : '',
    });
    if (row) rows.push(row);
    return rows;
  }, []);
}

export function parseOfx(text) {
  const blocks = String(text || '').split(/<STMTTRN>/i).slice(1);
  return blocks.reduce((rows, block) => {
    const amount = block.match(/<TRNAMT>([^<\s]+)/i)?.[1];
    const posted = block.match(/<DTPOSTED>(\d{8})/i)?.[1];
    const memo = block.match(/<MEMO>([^<]+)/i)?.[1] || block.match(/<NAME>([^<]+)/i)?.[1];
    if (!posted || !amount) return rows;
    const date = `${posted.slice(6, 8)}/${posted.slice(4, 6)}/${posted.slice(0, 4)}`;
    const row = toRow({
      date,
      description: memo,
      amountRaw: amount.replace('.', ','),
      typeRaw: Number(amount) < 0 ? 'D' : 'C',
    });
    if (row) rows.push(row);
    return rows;
  }, []);
}

export function parseStatementText(text) {
  const lines = String(text || '').split(/\r?\n/);
  const dateRe = /(\d{2}\/\d{2}\/\d{2,4})/;
  const moneyRe = /(-?\s*(?:R\$\s*)?\d{1,3}(?:\.\d{3})*,\d{2}|-?\s*(?:R\$\s*)?\d+,\d{2})/;
  const rows = [];
  lines.forEach((line) => {
    const dateMatch = line.match(dateRe);
    const moneyMatch = line.match(moneyRe);
    if (!dateMatch || !moneyMatch) return;
    const description = line
      .replace(dateRe, '')
      .replace(moneyRe, '')
      .replace(/\s+/g, ' ')
      .trim();
    const row = toRow({
      date: dateMatch[1],
      description,
      amountRaw: moneyMatch[1],
      typeRaw: line,
    });
    if (row) rows.push(row);
  });
  if (rows.length) return rows;

  const blob = String(text || '').replace(/\s+/g, ' ');
  const globalRe =
    /(\d{2}\/\d{2}\/\d{2,4})(.{8,80}?)(-?\s*(?:R\$\s*)?\d{1,3}(?:\.\d{3})*,\d{2})/g;
  let match = globalRe.exec(blob);
  while (match) {
    const row = toRow({
      date: match[1],
      description: match[2],
      amountRaw: match[3],
      typeRaw: match[2],
    });
    if (row) rows.push(row);
    match = globalRe.exec(blob);
  }
  return rows;
}

async function parsePdf(file) {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  const chunks = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    chunks.push(content.items.map((item) => item.str).join(' '));
  }
  const rows = parseStatementText(chunks.join('\n'));
  if (!rows.length) {
    throw new Error('Não achei lançamentos no PDF. Exporte CSV do banco e envie de novo.');
  }
  return rows;
}

export async function parseStatementFile(file) {
  const name = String(file?.name || '').toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    return parseCsv(await file.text());
  }
  if (name.endsWith('.ofx')) {
    return parseOfx(await file.text());
  }
  if (name.endsWith('.pdf')) {
    return parsePdf(file);
  }
  throw new Error('Envie um arquivo PDF, CSV ou OFX.');
}
