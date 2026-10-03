// Motor de cálculo del IVA sobre el margen (REBU), método de operación a operación.
// Funciones puras, sin acceso a la red ni al almacenamiento: todo ocurre en memoria,
// en el navegador de quien lo usa. Las mismas funciones se prueban en Node
// (tests/rebu-core.test.mjs).
//
// Base legal (España): Ley 37/1992, arts. 135-139. Base imponible = margen de cada
// operación minorado en la cuota de IVA del propio margen:
//   margen = precio de venta (IVA incluido) − precio de compra (IVA incluido)
//   base   = margen × 100 / (100 + tipo)
// Si el margen es negativo o cero, la base es 0 y, en este método, no se arrastra.
// Los importes se manejan en céntimos enteros para no arrastrar errores de coma flotante.

// ---------------------------------------------------------------------------
// CSV

/** Detecta el separador mirando la primera línea con contenido. */
export function detectDelimiter(text) {
  const firstLine = (text.split(/\r\n|\n|\r/).find((l) => l.trim() !== '') || '');
  const candidates = [';', ',', '\t', '|'];
  let best = ';';
  let bestCount = 0;
  for (const d of candidates) {
    let count = 0;
    let quoted = false;
    for (const ch of firstLine) {
      if (ch === '"') quoted = !quoted;
      else if (ch === d && !quoted) count++;
    }
    if (count > bestCount) { best = d; bestCount = count; }
  }
  return best;
}

/**
 * Lee un CSV (RFC 4180 tolerante): comillas dobles, comillas escapadas (""),
 * saltos de línea dentro de comillas, BOM y finales de línea de Windows o Mac.
 * Devuelve { delimiter, headers, rows } con rows como arrays de texto.
 */
export function parseCSV(input) {
  let text = String(input ?? '');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const delimiter = detectDelimiter(text);
  const records = [];
  let field = '';
  let record = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === delimiter) { record.push(field); field = ''; continue; }
    if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      record.push(field);
      records.push(record);
      record = [];
      field = '';
      continue;
    }
    field += ch;
  }
  if (field !== '' || record.length > 0) { record.push(field); records.push(record); }
  const nonEmpty = records.filter((r) => r.some((c) => c.trim() !== ''));
  const headers = (nonEmpty[0] || []).map((h) => h.trim());
  const rows = nonEmpty.slice(1);
  return { delimiter, headers, rows, unclosedQuote: quoted };
}

// ---------------------------------------------------------------------------
// Números y fechas

/**
 * Mira una muestra de importes y decide si el fichero usa coma decimal («12,50»).
 * Hace falta para leer bien «1.234»: en un fichero con coma decimal son mil
 * doscientos treinta y cuatro euros; en uno con punto decimal, uno con 234.
 */
export function detectDecimalComma(values) {
  let comma = 0;
  let dot = 0;
  for (const v of values) {
    const s = String(v ?? '').trim();
    if (/\d,\d{1,2}$/.test(s) || /\d\.\d{3},\d+$/.test(s)) comma++;
    else if (/\d\.\d{1,2}$/.test(s) || /\d\.\d{4,}$/.test(s) || /\d,\d{3}\.\d+$/.test(s)) dot++;
  }
  return comma > dot;
}

/**
 * Convierte un importe escrito de cualquier forma habitual a número:
 * "45.000000" (base de datos), "1.234,56" (España/Francia), "1,234.56",
 * "1 234,56", "45 €", "-12,5". Devuelve NaN si no es un número.
 * decimalComma: true si el fichero usa coma decimal (ver detectDecimalComma).
 */
export function parseNumber(value, decimalComma = false) {
  if (typeof value === 'number') return value;
  let s = String(value ?? '').trim();
  if (s === '') return NaN;
  s = s.replace(/[€$£\s  ]/g, '').replace(/eur$/i, '');
  let negative = false;
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1); }
  if (s.startsWith('-')) { negative = !negative; s = s.slice(1); }
  else if (s.startsWith('+')) s = s.slice(1);
  if (!/^[0-9.,']+$/.test(s)) return NaN;
  s = s.replace(/'/g, '');
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot !== -1 && lastComma !== -1) {
    // El último separador que aparece es el decimal.
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (lastComma !== -1) {
    const parts = s.split(',');
    // "1,234,567" con grupos de tres: separador de miles. Si no, coma decimal.
    if (parts.length > 2 && parts.slice(1).every((p) => p.length === 3)) s = parts.join('');
    else if (parts.length === 2) s = parts.join('.');
    else return NaN;
  } else if (lastDot !== -1) {
    const parts = s.split('.');
    // "1.234.567" con grupos de tres: miles. Un solo punto: decimal (formato de base
    // de datos), salvo en un fichero con coma decimal, donde "1.234" son miles.
    if (parts.length > 2) {
      if (parts.slice(1).every((p) => p.length === 3)) s = parts.join('');
      else return NaN;
    } else if (decimalComma && parts[1].length === 3) {
      s = parts.join('');
    }
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  return negative ? -n : n;
}

/** Euros a céntimos enteros. */
export function toCents(n) {
  return Math.round(n * 100 + (n >= 0 ? 1e-9 : -1e-9));
}

/**
 * Lee una fecha: "2026-07-15", "2026-07-15 10:22:01", "15/07/2026", "15-07-2026",
 * "15.07.2026". Devuelve { y, m, d } o null. "0000-00-00" (sin factura) es null.
 */
export function parseDate(value) {
  const s = String(value ?? '').trim();
  let y, m, d;
  let match = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T].*)?$/);
  if (match) { y = +match[1]; m = +match[2]; d = +match[3]; }
  else {
    match = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:[ T].*)?$/);
    if (!match) return null;
    d = +match[1]; m = +match[2]; y = +match[3];
  }
  if (y < 1990 || m < 1 || m > 12 || d < 1) return null;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d > daysInMonth) return null;
  return { y, m, d };
}

export function quarterOf(date) {
  return `${date.y}-T${Math.floor((date.m - 1) / 3) + 1}`;
}

export function isoDate(date) {
  return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Columnas

const normalize = (s) => String(s ?? '')
  .toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '');

// Nombres que se reconocen para cada dato. Los primeros son los que pone la consulta
// SQL de la guía; el resto cubre exportaciones hechas a mano o con otras herramientas.
export const COLUMN_SYNONYMS = {
  fecha: ['fecha_factura', 'fecha', 'invoice_date', 'date_facture', 'date', 'fecha_pedido', 'date_add', 'data'],
  venta: ['venta_total', 'total_venta', 'venta', 'precio_venta', 'total_price_tax_incl', 'prix_vente', 'vente_ttc', 'prix_vente_ttc', 'total_ttc', 'importe', 'total'],
  costeUnitario: ['coste_unitario', 'original_wholesale_price', 'precio_coste', 'coste', 'costo', 'wholesale_price', 'prix_achat', 'prix_d_achat', 'cout_unitaire', 'purchase_supplier_price'],
  costeTotal: ['coste_total', 'total_coste', 'prix_achat_total', 'cout_total'],
  unidades: ['unidades', 'cantidad', 'product_quantity', 'quantite', 'quantity', 'qty'],
  devueltas: ['devueltas', 'product_quantity_refunded', 'unidades_devueltas', 'quantite_remboursee'],
  producto: ['producto', 'product_name', 'nombre', 'produit', 'designation', 'articulo'],
  pedido: ['pedido', 'id_order', 'referencia', 'reference', 'commande', 'order'],
  factura: ['factura', 'invoice_number', 'numero_factura', 'facture'],
  grupoImpuestos: ['grupo_impuestos', 'tax_rules_group', 'grupo_iva', 'groupe_taxes', 'tax_group'],
  ivaTienda: ['iva_tienda', 'tax_rate', 'iva_prestashop', 'tva_boutique'],
  // Tipo del IVA de cada pieza, en un CSV genérico (no de PrestaShop). No se acepta
  // una columna llamada solo «IVA» o «TVA»: suele ser un importe, no un porcentaje.
  tipoIva: ['tipo_iva', 'tipo', 'tipo_impositivo', 'porcentaje_iva', 'iva_porcentaje', 'taux_tva', 'taux', 'tva_taux', 'vat_rate', 'rate'],
  documentoCompra: ['documento_compra', 'doc_compra', 'n_documento_compra', 'factura_compra', 'document_achat', 'facture_achat'],
};

export const REQUIRED_COLUMNS = ['fecha', 'venta'];

/** Propone qué columna del fichero corresponde a cada dato. */
export function detectColumns(headers) {
  const norm = headers.map(normalize);
  const mapping = {};
  const used = new Set();
  for (const [key, synonyms] of Object.entries(COLUMN_SYNONYMS)) {
    for (const syn of synonyms) {
      const idx = norm.findIndex((h, i) => h === syn && !used.has(i));
      if (idx !== -1) { mapping[key] = idx; used.add(idx); break; }
    }
  }
  // "pedido" y "referencia" pueden venir los dos: si "pedido" se llevó el id numérico,
  // la referencia de PrestaShop (letras) se usa como etiqueta legible.
  const refIdx = norm.findIndex((h, i) => (h === 'referencia' || h === 'reference') && !used.has(i));
  if (refIdx !== -1) mapping.referencia = refIdx;
  return mapping;
}

export function missingColumns(mapping) {
  const missing = REQUIRED_COLUMNS.filter((k) => mapping[k] === undefined);
  if (mapping.costeUnitario === undefined && mapping.costeTotal === undefined) missing.push('coste');
  return missing;
}

// ---------------------------------------------------------------------------
// Líneas

const REBU_GROUP = /rebu|bienes?\s+usad|margen|marge|occasion|usato|margine/i;

/** Saca el tipo de un nombre de grupo como «REBU 21 %» o «TVA sur marge 20». */
export function rateFromGroupName(name) {
  const match = String(name ?? '').match(/(\d{1,2}(?:[.,]\d{1,2})?)\s*%?/);
  if (!match) return null;
  const rate = parseNumber(match[1]);
  return Number.isFinite(rate) && rate > 0 && rate < 40 ? rate : null;
}

/**
 * Lee un tipo de IVA escrito como «21», «21 %», «5,5» o «0,21». Devuelve null si no
 * parece un tipo (vacío, negativo, 40 o más).
 */
export function parseRate(value) {
  const s = String(value ?? '').replace('%', '').trim();
  if (s === '') return null;
  let rate = parseNumber(s);
  if (!Number.isFinite(rate) || rate < 0) return null;
  if (rate > 0 && rate < 1) rate = Math.round(rate * 10000) / 100; // 0,21 → 21
  return rate < 40 ? rate : null;
}

/**
 * Convierte las filas del CSV en líneas de cálculo.
 * options.defaultRate: tipo que se propone si el fichero no lo dice (21 en España).
 */
export function buildLines(rows, mapping, options = {}) {
  const defaultRate = options.defaultRate ?? 21;
  const get = (row, key) => (mapping[key] === undefined ? '' : String(row[mapping[key]] ?? '').trim());
  const sample = [];
  for (const row of rows.slice(0, 500)) {
    for (const key of ['venta', 'costeUnitario', 'costeTotal']) if (mapping[key] !== undefined) sample.push(get(row, key));
  }
  const decimalComma = detectDecimalComma(sample);
  // A file without group or tax columns cannot say which lines are REBU. Then every
  // line starts marked and the screen says so: the merchant unticks the ones that aren't.
  const noTaxInfo = mapping.grupoImpuestos === undefined && mapping.ivaTienda === undefined;
  const parseNumber_ = (v) => parseNumber(v, decimalComma);
  return rows.map((row, index) => {
    const warnings = [];
    const date = parseDate(get(row, 'fecha'));
    if (!date) warnings.push('fecha');

    const unitsRaw = get(row, 'unidades');
    let units = unitsRaw === '' ? 1 : parseNumber(unitsRaw);
    if (!Number.isFinite(units) || units <= 0) { units = 1; if (unitsRaw !== '') warnings.push('unidades'); }

    const sale = parseNumber_(get(row, 'venta'));
    if (!Number.isFinite(sale)) warnings.push('venta');

    let cost;
    if (mapping.costeTotal !== undefined && get(row, 'costeTotal') !== '') cost = parseNumber_(get(row, 'costeTotal'));
    else {
      const unitCost = parseNumber_(get(row, 'costeUnitario'));
      cost = Number.isFinite(unitCost) ? unitCost * units : NaN;
    }
    if (!Number.isFinite(cost) || cost <= 0) { warnings.push('sinCoste'); if (!Number.isFinite(cost)) cost = 0; }

    const refunded = parseNumber(get(row, 'devueltas'));
    if (Number.isFinite(refunded) && refunded > 0) warnings.push('devolucion');

    const group = get(row, 'grupoImpuestos');
    const shopRate = parseNumber(get(row, 'ivaTienda'));
    let rebu = false;
    let rebuReason = null;
    if (group && REBU_GROUP.test(group)) { rebu = true; rebuReason = 'grupo'; }
    else if (Number.isFinite(shopRate) && shopRate === 0) { rebu = true; rebuReason = 'ivaCero'; warnings.push('supuesto'); }
    else if (noTaxInfo) { rebu = true; rebuReason = 'archivo'; }

    const fileRate = parseRate(get(row, 'tipoIva'));
    if (mapping.tipoIva !== undefined && get(row, 'tipoIva') !== '' && fileRate === null) warnings.push('tipo');
    const rate = fileRate ?? ((group && REBU_GROUP.test(group) && rateFromGroupName(group)) || defaultRate);

    const order = get(row, 'referencia') || get(row, 'pedido');
    return {
      id: index,
      row: index + 2, // línea del fichero, contando la cabecera
      date,
      quarter: date ? quarterOf(date) : null,
      order,
      invoice: get(row, 'factura'),
      product: get(row, 'producto'),
      units,
      saleCents: Number.isFinite(sale) ? toCents(sale) : null,
      costCents: toCents(cost),
      rate,
      rebu,
      rebuReason,
      group,
      purchaseDoc: get(row, 'documentoCompra'),
      warnings,
    };
  });
}

/** Calcula margen, base y cuota de una línea (en céntimos). */
export function computeLine(line) {
  if (line.saleCents === null) return { marginCents: null, baseCents: 0, quotaCents: 0 };
  const marginCents = line.saleCents - line.costCents;
  if (marginCents <= 0) return { marginCents, baseCents: 0, quotaCents: 0 };
  const baseCents = Math.round((marginCents * 100) / (100 + line.rate));
  const quotaCents = Math.round((baseCents * line.rate) / 100);
  return { marginCents, baseCents, quotaCents };
}

/** ¿Entra la línea en el cálculo? Necesita estar marcada, con fecha y con venta. */
export function isCountable(line) {
  return line.rebu && line.date !== null && line.saleCents !== null;
}

/**
 * Resumen por trimestre y tipo. La cuota del resumen se calcula sobre la base total
 * del grupo, como hace el modelo 303 (base × tipo), no sumando cuotas de cada línea.
 */
export function summarize(lines) {
  const quarters = new Map();
  let excluded = 0;
  let invalid = 0;
  for (const line of lines) {
    if (!line.rebu) { excluded++; continue; }
    if (!isCountable(line)) { invalid++; continue; }
    const { marginCents, baseCents } = computeLine(line);
    if (!quarters.has(line.quarter)) quarters.set(line.quarter, new Map());
    const rates = quarters.get(line.quarter);
    if (!rates.has(line.rate)) {
      rates.set(line.rate, { rate: line.rate, operations: 0, saleCents: 0, costCents: 0, positiveMarginCents: 0, negativeMarginCents: 0, negativeOperations: 0, baseCents: 0 });
    }
    const g = rates.get(line.rate);
    g.operations++;
    g.saleCents += line.saleCents;
    g.costCents += line.costCents;
    if (marginCents > 0) g.positiveMarginCents += marginCents;
    else { g.negativeMarginCents += marginCents; g.negativeOperations++; }
    g.baseCents += baseCents;
  }
  const result = [...quarters.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([quarter, rates]) => {
      const groups = [...rates.values()]
        .sort((a, b) => b.rate - a.rate)
        .map((g) => ({ ...g, quotaCents: Math.round((g.baseCents * g.rate) / 100) }));
      return {
        quarter,
        groups,
        baseCents: groups.reduce((s, g) => s + g.baseCents, 0),
        quotaCents: groups.reduce((s, g) => s + g.quotaCents, 0),
        operations: groups.reduce((s, g) => s + g.operations, 0),
      };
    });
  return { quarters: result, excluded, invalid };
}

// ---------------------------------------------------------------------------
// Exportación del detalle

const csvCell = (value) => {
  const s = String(value ?? '');
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Céntimos a texto con coma decimal y sin separador de miles (lo lee bien Excel en ES/FR). */
export const centsToPlain = (cents) => {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`;
};

/**
 * Crea una línea a partir de una pieza apuntada a mano (sin archivo).
 * date: «2026-07-15» o «15/07/2026»; importes en euros como número o texto.
 */
export function makeManualLine({ id, date, product = '', invoice = '', purchaseDoc = '', sale, cost, rate }) {
  const d = parseDate(date);
  const saleN = typeof sale === 'number' ? sale : parseNumber(sale, true);
  const costN = typeof cost === 'number' ? cost : parseNumber(cost, true);
  const warnings = [];
  if (!d) warnings.push('fecha');
  if (!Number.isFinite(saleN)) warnings.push('venta');
  if (!Number.isFinite(costN) || costN <= 0) warnings.push('sinCoste');
  return {
    id,
    row: null,
    date: d,
    quarter: d ? quarterOf(d) : null,
    order: '',
    invoice: String(invoice).trim(),
    product: String(product).trim(),
    units: 1,
    saleCents: Number.isFinite(saleN) ? toCents(saleN) : null,
    costCents: Number.isFinite(costN) && costN > 0 ? toCents(costN) : 0,
    rate: Number.isFinite(rate) ? rate : parseRate(rate) ?? 21,
    rebu: true,
    rebuReason: 'manual',
    group: '',
    purchaseDoc: String(purchaseDoc).trim(),
    warnings,
  };
}

/**
 * Detalle línea a línea en CSV (separador «;», coma decimal, con BOM para Excel).
 * Sigue el orden del libro registro específico del REBU (Reglamento del IVA,
 * art. 51.a): descripción, documento de compra, precio de compra, factura de venta,
 * precio de venta, IVA de la venta y régimen aplicado; y añade fecha, trimestre,
 * margen, tipo y base para el cálculo.
 * labels: cabeceras traducidas, en este orden (14). regime: cómo se escribe cada régimen.
 */
export function detailCSV(lines, labels, regime = ['REBU', 'General']) {
  const out = [labels.map(csvCell).join(';')];
  for (const line of lines) {
    const { marginCents, baseCents, quotaCents } = computeLine(line);
    const countable = isCountable(line);
    out.push([
      line.date ? isoDate(line.date) : '',
      line.quarter || '',
      line.order,
      line.invoice,
      line.product,
      String(line.units).replace('.', ','),
      line.purchaseDoc || '',
      centsToPlain(line.costCents),
      line.saleCents === null ? '' : centsToPlain(line.saleCents),
      marginCents === null ? '' : centsToPlain(marginCents),
      String(line.rate).replace('.', ','),
      countable ? centsToPlain(baseCents) : '',
      countable ? centsToPlain(quotaCents) : '',
      line.rebu ? regime[0] : regime[1],
    ].map(csvCell).join(';'));
  }
  return '\ufeff' + out.join('\r\n') + '\r\n';
}
