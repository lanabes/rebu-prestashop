// Calculadora del REBU: pantalla. El cálculo vive en rebu-core.js.
// Nada sale del navegador: el archivo se lee con FileReader y no hay ni una petición
// de red con su contenido. Lo único que se descarga, si se pide, es el ejemplo.
import {
  parseCSV, detectColumns, missingColumns, buildLines, computeLine, isCountable,
  summarize, parseNumber, parseDate, toCents, detailCSV, makeManualLine,
} from './rebu-core.js';

const app = document.getElementById('app');
const ICONS = app.dataset.icons;
const LANG = document.documentElement.lang === 'fr' ? 'fr' : 'es';
const PAGE_SIZE = 100;
const MAX_BYTES = 50 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Textos

const T = {
  es: {
    locale: 'es-ES',
    defaultRate: 21,
    rates: [21, 10, 4],
    quarter: (q) => { const [y, t] = q.split('-T'); return `${t}T ${y}`; },
    dropTitle: 'Arrastra aquí tu archivo de ventas',
    dropText: 'Un CSV con la fecha, el precio de venta, el de compra y el tipo de IVA de cada pieza, salga de tu tienda online, de tu programa o de Excel. Si no tienes archivo, apunta las piezas a mano.',
    choose: 'Elegir archivo',
    manual: 'Apuntar piezas a mano',
    sample: 'Probar con un ejemplo',
    template: 'Descargar plantilla CSV',
    noFile: '¿Usas PrestaShop? Cómo sacar el archivo',
    dropHere: 'Suelta el archivo para calcular',
    reading: 'Leyendo el archivo',
    errTitle: {
      tooBig: 'El archivo es demasiado grande',
      excel: 'Parece un archivo de Excel',
      binary: 'No es un archivo de texto',
      empty: 'El archivo no tiene líneas',
      read: 'No se pudo leer el archivo',
      sample: 'No se pudo cargar el ejemplo',
    },
    errText: {
      tooBig: 'Pasa de 50 MB. Saca la consulta por trimestres o por años y súbelos de uno en uno.',
      excel: 'Guárdalo como CSV desde Excel («Archivo › Guardar como › CSV») o usa directamente el archivo que descarga PrestaShop.',
      binary: 'La calculadora necesita un CSV: un archivo de texto con columnas separadas por punto y coma o por comas.',
      empty: 'Solo tiene la cabecera o está vacío. Comprueba que la consulta devuelve pedidos con factura.',
      read: 'El navegador no pudo abrirlo. Prueba a descargarlo otra vez desde PrestaShop.',
      sample: 'Comprueba tu conexión y vuelve a intentarlo.',
    },
    other: 'Elegir otro archivo',
    howTo: 'Cómo sacar el CSV',
    mapTitle: 'Dime qué columna es cada dato',
    mapText: (missing) => `No he reconocido ${missing}. Elige la columna correspondiente; el resto es opcional.`,
    mapFields: {
      fecha: ['Fecha de la factura', 'Obligatoria. Decide el trimestre.'],
      venta: ['Venta de la línea', 'Obligatoria. Importe cobrado, IVA incluido.'],
      costeUnitario: ['Coste por unidad', 'Lo que pagaste por cada pieza.'],
      costeTotal: ['Coste total de la línea', 'Si el archivo trae el total en vez del unitario.'],
      unidades: ['Unidades', 'Opcional. Si falta, se cuenta 1.'],
      producto: ['Producto', 'Opcional. Para reconocer cada línea.'],
      grupoImpuestos: ['Grupo de impuestos', 'Opcional. «REBU 21 %» marca la línea y su tipo.'],
      tipoIva: ['Tipo de IVA', 'Opcional. 21, 10 o 4. Si falta, el 21 %.'],
      documentoCompra: ['Nº de documento de compra', 'Opcional. Para el libro registro.'],
    },
    none: '— Ninguna —',
    calc: 'Calcular',
    and: ' y ',
    missingNames: { fecha: 'la fecha', venta: 'la venta', coste: 'el coste' },
    sampleBanner: 'Estás viendo un ejemplo con datos inventados. Sube tu archivo para calcular tu trimestre.',
    useMine: 'Subir mi archivo',
    download: 'Descargar libro registro',
    print: 'Imprimir',
    lines: (n) => `${n} ${n === 1 ? 'línea' : 'líneas'}`,
    summaryTitle: (q) => `Trimestre ${q}`,
    summarySub: (n, ex) => `${n} ${n === 1 ? 'venta' : 'ventas'} en REBU${ex ? `, ${ex} ${ex === 1 ? 'línea fuera' : 'líneas fuera'} del régimen` : ''}`,
    kBase: 'Base imponible',
    kQuota: 'Cuota de IVA',
    kOps: 'Ventas en REBU',
    opsDetail: (n) => `${n} con margen negativo`,
    th: { rate: 'Tipo', ops: 'Ventas', sales: 'Importe vendido', cost: 'Coste', margin: 'Margen', base: 'Base imponible', quota: 'Cuota' },
    total: 'Total',
    negNote: (n, amount) => `${n} ${n === 1 ? 'venta' : 'ventas'} con margen negativo (${amount}): base 0, no se compensa con otras ventas.`,
    emptySummary: 'Ninguna línea de este trimestre va por el REBU. Marca las que correspondan en la tabla de abajo.',
    noQuarter: 'Ninguna línea tiene fecha de factura válida, así que no se puede asignar a ningún trimestre. Revisa la columna de fecha.',
    legal: 'Resultado orientativo, calculado en tu navegador con el método de operación a operación. Revísalo con tu asesor antes de presentar el modelo 303.',
    assumedAll: 'Tu archivo no dice qué líneas van por el REBU, así que las hemos marcado todas. Desmarca abajo las que no correspondan.',
    linesTitle: 'Ventas',
    linesSub: 'Corrige el coste o la venta de cualquier línea y marca las que van por el REBU. Los cambios no se guardan: descarga el libro registro antes de cerrar.',
    filters: { all: 'Todas', rebu: 'Solo REBU', warn: 'Con avisos' },
    col: { rebu: 'REBU', date: 'Fecha', order: 'Pedido', product: 'Producto', sale: 'Venta', cost: 'Coste', rate: 'Tipo', margin: 'Margen', base: 'Base', notes: 'Avisos' },
    invoice: (n) => `Factura ${n}`,
    units: (n) => `${n} uds.`,
    noDate: 'Sin fecha',
    flags: {
      sinCoste: ['Sin coste', 'No tiene precio de coste: toda la venta cuenta como margen.'],
      devolucion: ['Devuelta', 'Tiene unidades devueltas: ajusta la venta si hace falta.'],
      supuesto: ['IVA 0 %', 'Va al 0 % pero su grupo no se llama REBU: confirma que va por este régimen.'],
      fecha: ['Sin factura', 'No tiene fecha de factura: no entra en ningún trimestre.'],
      venta: ['Venta ilegible', 'No se pudo leer el importe de la venta.'],
      unidades: ['Unidades', 'No se pudieron leer las unidades: se cuenta 1.'],
      negativo: ['Margen negativo', 'Base 0. No se compensa con otras ventas.'],
      tipo: ['Tipo ilegible', 'No se pudo leer el tipo de IVA: se usa el 21 %.'],
    },
    more: (n) => `Mostrar ${n} más`,
    emptyFilter: 'No hay líneas con este filtro en el trimestre elegido.',
    manualFile: 'Ventas apuntadas a mano',
    emptyManual: 'Todavía no hay ventas. Añade la primera con el formulario de abajo.',
    addTitle: 'Añadir una venta a mano',
    addHint: 'Para piezas que no están en el archivo, o si no tienes archivo.',
    fDate: 'Fecha de la factura',
    fProduct: 'Descripción del bien',
    fSale: 'Precio de venta',
    fSaleHint: 'Lo que cobraste, IVA incluido.',
    fCost: 'Precio de compra',
    fCostHint: 'Lo que pagaste por la pieza.',
    fRate: 'Tipo de IVA',
    fInvoice: 'Nº de factura',
    fDoc: 'Nº de documento de compra',
    optional: 'Opcional',
    add: 'Añadir venta',
    added: 'Venta añadida',
    addErr: { fecha: 'Pon la fecha de la factura.', producto: 'Describe la pieza, por ejemplo «Reloj automático años 80».', venta: 'Pon el precio de venta, por ejemplo 120,00.', coste: 'El precio de compra tiene que ser un importe, por ejemplo 70,00.' },
    regime: ['REBU', 'General'],
    remove: 'Quitar',
    removeLabel: (p) => `Quitar la venta ${p}`,
    removed: 'Venta quitada',
    rebuLabel: (p) => `Va por el REBU: ${p}`,
    saleLabel: (p) => `Venta de ${p}`,
    costLabel: (p) => `Coste de ${p}`,
    rateLabel: (p) => `Tipo de IVA de ${p}`,
    badNumber: 'Escribe un importe válido, por ejemplo 12,50.',
    detailFile: 'rebu-libro-registro.csv',
    detailHeaders: ['Fecha factura', 'Trimestre', 'Pedido', 'Nº factura de venta', 'Descripción del bien', 'Unidades', 'Nº documento de compra', 'Precio de compra', 'Precio de venta', 'Margen', 'Tipo', 'Base imponible', 'IVA de la venta', 'Régimen'],
    downloaded: 'Libro registro descargado',
  },
  fr: {
    locale: 'fr-FR',
    defaultRate: 20,
    rates: [20, 10, 5.5],
    quarter: (q) => { const [y, t] = q.split('-T'); return `T${t} ${y}`; },
    dropTitle: 'Déposez ici votre fichier de ventes',
    dropText: 'Un CSV avec la date, le prix de vente, le prix d’achat et le taux de TVA de chaque pièce, qu’il vienne de votre boutique en ligne, de votre logiciel ou d’Excel. Sans fichier, saisissez les pièces à la main.',
    choose: 'Choisir un fichier',
    manual: 'Saisir les pièces à la main',
    sample: 'Essayer avec un exemple',
    template: 'Télécharger le modèle CSV',
    noFile: 'Vous utilisez PrestaShop ? Comment obtenir le fichier',
    dropHere: 'Lâchez le fichier pour calculer',
    reading: 'Lecture du fichier',
    errTitle: {
      tooBig: 'Le fichier est trop volumineux',
      excel: 'Cela ressemble à un fichier Excel',
      binary: 'Ce n’est pas un fichier texte',
      empty: 'Le fichier ne contient aucune ligne',
      read: 'Impossible de lire le fichier',
      sample: 'Impossible de charger l’exemple',
    },
    errText: {
      tooBig: 'Il dépasse 50 Mo. Exportez la requête par trimestre ou par année et importez-les un par un.',
      excel: 'Enregistrez-le en CSV depuis Excel (« Fichier › Enregistrer sous › CSV ») ou utilisez directement le fichier téléchargé depuis PrestaShop.',
      binary: 'La calculatrice a besoin d’un CSV : un fichier texte avec des colonnes séparées par des points-virgules ou des virgules.',
      empty: 'Il ne contient que l’en-tête ou il est vide. Vérifiez que la requête renvoie des commandes facturées.',
      read: 'Le navigateur n’a pas pu l’ouvrir. Téléchargez-le à nouveau depuis PrestaShop.',
      sample: 'Vérifiez votre connexion et réessayez.',
    },
    other: 'Choisir un autre fichier',
    howTo: 'Comment obtenir le CSV',
    mapTitle: 'Indiquez quelle colonne correspond à chaque donnée',
    mapText: (missing) => `Je n’ai pas reconnu ${missing}. Choisissez la colonne correspondante ; le reste est facultatif.`,
    mapFields: {
      fecha: ['Date de la facture', 'Obligatoire. Elle détermine le trimestre.'],
      venta: ['Vente de la ligne', 'Obligatoire. Montant encaissé, TVA comprise.'],
      costeUnitario: ['Coût unitaire', 'Ce que vous avez payé pour chaque pièce.'],
      costeTotal: ['Coût total de la ligne', 'Si le fichier donne le total au lieu du coût unitaire.'],
      unidades: ['Quantité', 'Facultatif. À défaut, 1.'],
      producto: ['Produit', 'Facultatif. Pour reconnaître chaque ligne.'],
      grupoImpuestos: ['Groupe de taxes', 'Facultatif. « TVA sur marge 20 % » marque la ligne et son taux.'],
      tipoIva: ['Taux de TVA', 'Facultatif. 20, 10 ou 5,5. À défaut, 20 %.'],
      documentoCompra: ['N° du justificatif d’achat', 'Facultatif. Pour le registre.'],
    },
    none: '— Aucune —',
    calc: 'Calculer',
    and: ' et ',
    missingNames: { fecha: 'la date', venta: 'la vente', coste: 'le coût' },
    sampleBanner: 'Vous voyez un exemple avec des données fictives. Importez votre fichier pour calculer votre trimestre.',
    useMine: 'Importer mon fichier',
    download: 'Télécharger le registre',
    print: 'Imprimer',
    lines: (n) => `${n} ${n === 1 ? 'ligne' : 'lignes'}`,
    summaryTitle: (q) => `Trimestre ${q}`,
    summarySub: (n, ex) => `${n} ${n === 1 ? 'vente' : 'ventes'} sous le régime de la marge${ex ? `, ${ex} ${ex === 1 ? 'ligne hors régime' : 'lignes hors régime'}` : ''}`,
    kBase: 'Base hors taxe',
    kQuota: 'TVA due',
    kOps: 'Ventes sur marge',
    opsDetail: (n) => `dont ${n} à marge négative`,
    th: { rate: 'Taux', ops: 'Ventes', sales: 'Montant vendu', cost: 'Coût', margin: 'Marge', base: 'Base HT', quota: 'TVA' },
    total: 'Total',
    negNote: (n, amount) => `${n} ${n === 1 ? 'vente' : 'ventes'} à marge négative (${amount}) : base nulle, sans imputation sur d’autres ventes.`,
    emptySummary: 'Aucune ligne de ce trimestre ne relève du régime de la marge. Cochez celles qui en relèvent dans le tableau ci-dessous.',
    noQuarter: 'Aucune ligne n’a de date de facture valide : impossible de les rattacher à un trimestre. Vérifiez la colonne de date.',
    legal: 'Résultat indicatif, calculé dans votre navigateur selon la méthode opération par opération. Faites-le vérifier par votre expert-comptable avant votre déclaration de TVA.',
    assumedAll: 'Votre fichier n’indique pas quelles lignes relèvent du régime de la marge : elles sont toutes cochées. Décochez ci-dessous celles qui n’en relèvent pas.',
    linesTitle: 'Ventes',
    linesSub: 'Corrigez le coût ou la vente de n’importe quelle ligne et cochez celles qui relèvent du régime. Les modifications ne sont pas enregistrées : téléchargez le registre avant de fermer.',
    filters: { all: 'Toutes', rebu: 'Sur marge', warn: 'À vérifier' },
    col: { rebu: 'Marge', date: 'Date', order: 'Commande', product: 'Produit', sale: 'Vente', cost: 'Coût', rate: 'Taux', margin: 'Marge', base: 'Base HT', notes: 'Alertes' },
    invoice: (n) => `Facture ${n}`,
    units: (n) => `${n} unités`,
    noDate: 'Sans date',
    flags: {
      sinCoste: ['Sans coût', 'Aucun prix d’achat : toute la vente compte comme marge.'],
      devolucion: ['Retournée', 'Des unités ont été remboursées : ajustez la vente si besoin.'],
      supuesto: ['TVA 0 %', 'À 0 % mais son groupe ne porte pas le nom du régime : confirmez qu’elle en relève.'],
      fecha: ['Sans facture', 'Pas de date de facture : n’entre dans aucun trimestre.'],
      venta: ['Vente illisible', 'Le montant de la vente est illisible.'],
      unidades: ['Quantité', 'Quantité illisible : on compte 1.'],
      tipo: ['Taux illisible', 'Taux de TVA illisible : on applique 20 %.'],
      negativo: ['Marge négative', 'Base nulle. Sans imputation sur d’autres ventes.'],
    },
    more: (n) => `Afficher ${n} de plus`,
    emptyFilter: 'Aucune ligne avec ce filtre pour le trimestre choisi.',
    manualFile: 'Ventes saisies à la main',
    emptyManual: 'Aucune vente pour l’instant. Ajoutez la première avec le formulaire ci-dessous.',
    addTitle: 'Ajouter une vente à la main',
    addHint: 'Pour les pièces absentes du fichier, ou si vous n’avez pas de fichier.',
    fDate: 'Date de la facture',
    fProduct: 'Désignation du bien',
    fSale: 'Prix de vente',
    fSaleHint: 'Ce que vous avez encaissé, TVA comprise.',
    fCost: 'Prix d’achat',
    fCostHint: 'Ce que vous avez payé pour la pièce.',
    fRate: 'Taux de TVA',
    fInvoice: 'N° de facture',
    fDoc: 'N° du justificatif d’achat',
    optional: 'Facultatif',
    add: 'Ajouter la vente',
    added: 'Vente ajoutée',
    addErr: { fecha: 'Indiquez la date de la facture.', producto: 'Décrivez la pièce, par exemple « Montre automatique des années 80 ».', venta: 'Indiquez le prix de vente, par exemple 120,00.', coste: 'Le prix d’achat doit être un montant, par exemple 70,00.' },
    regime: ['Marge', 'Normal'],
    remove: 'Retirer',
    removeLabel: (p) => `Retirer la vente ${p}`,
    removed: 'Vente retirée',
    rebuLabel: (p) => `Relève du régime de la marge : ${p}`,
    saleLabel: (p) => `Vente de ${p}`,
    costLabel: (p) => `Coût de ${p}`,
    rateLabel: (p) => `Taux de TVA de ${p}`,
    badNumber: 'Saisissez un montant valide, par exemple 12,50.',
    detailFile: 'tva-sur-marge-registre.csv',
    detailHeaders: ['Date facture', 'Trimestre', 'Commande', 'N° facture de vente', 'Désignation du bien', 'Quantité', 'N° justificatif d’achat', 'Prix d’achat', 'Prix de vente', 'Marge', 'Taux', 'Base HT', 'TVA', 'Régime'],
    downloaded: 'Registre téléchargé',
  },
}[LANG];

const money = new Intl.NumberFormat(T.locale, { style: 'currency', currency: 'EUR' });
const fmt = (cents) => money.format(cents / 100);
const plain = new Intl.NumberFormat(T.locale, { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
const fmtPlain = (cents) => plain.format(cents / 100);
const rateFmt = (r) => `${String(r).replace('.', LANG === 'fr' ? ',' : ',')} %`;
const dateFmt = new Intl.DateTimeFormat(T.locale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
const fmtDate = (d) => dateFmt.format(new Date(Date.UTC(d.y, d.m - 1, d.d)));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = (name, cls = 'i') => `<svg class="${cls}" aria-hidden="true"><use href="${ICONS}#${name}"/></svg>`;

// ---------------------------------------------------------------------------
// Estado

const state = {
  view: 'empty',
  fileName: '',
  isSample: false,
  parsed: null,
  mapping: null,
  lines: [],
  quarter: null,
  filter: 'all',
  shown: PAGE_SIZE,
  error: null,
  addOpen: false,
  nextId: 0,
  lastDate: '',
  lastRate: '',
};

const toastEl = document.getElementById('toast');
let toastTimer;
function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

// A single hidden file input reused by every "choose file" button.
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = '.csv,text/csv,text/plain';
fileInput.hidden = true;
document.body.appendChild(fileInput);
fileInput.addEventListener('change', () => {
  const file = fileInput.files && fileInput.files[0];
  fileInput.value = '';
  if (file) readFile(file);
});
const pickFile = () => fileInput.click();

// ---------------------------------------------------------------------------
// Lectura

function readFile(file) {
  state.fileName = file.name;
  state.isSample = false;
  if (file.size > MAX_BYTES) return fail('tooBig');
  setView('loading');
  const reader = new FileReader();
  reader.onerror = () => fail('read');
  reader.onload = () => {
    const bytes = new Uint8Array(reader.result);
    if (bytes.length === 0) return fail('empty');
    if (bytes[0] === 0x50 && bytes[1] === 0x4b) return fail('excel'); // .xlsx is a zip
    if (bytes[0] === 0xd0 && bytes[1] === 0xcf) return fail('excel'); // old .xls
    const probe = bytes.subarray(0, 4096);
    if (probe.includes(0)) return fail('binary');
    let text = new TextDecoder('utf-8').decode(bytes);
    // PrestaShop can export in ISO-8859-1 if the shop is set that way.
    if (text.includes('�')) text = new TextDecoder('windows-1252').decode(bytes);
    load(text);
  };
  reader.readAsArrayBuffer(file);
}

async function loadSample() {
  setView('loading');
  try {
    const res = await fetch(app.dataset.sample, { cache: 'no-cache' });
    if (!res.ok) throw new Error(String(res.status));
    const text = await res.text();
    state.fileName = app.dataset.sample.split('/').pop();
    state.isSample = true;
    load(text);
  } catch {
    fail('sample');
  }
}

function load(text) {
  const parsed = parseCSV(text);
  if (!parsed.headers.length || !parsed.rows.length) return fail('empty');
  state.parsed = parsed;
  state.mapping = detectColumns(parsed.headers);
  if (missingColumns(state.mapping).length) return setView('mapping');
  compute();
}

function compute() {
  state.lines = buildLines(state.parsed.rows, state.mapping, { defaultRate: T.defaultRate })
    .map((line) => ({ ...line, original: { saleCents: line.saleCents, costCents: line.costCents } }));
  const quarters = [...new Set(state.lines.filter((l) => l.quarter).map((l) => l.quarter))].sort();
  const withRebu = quarters.filter((q) => state.lines.some((l) => l.quarter === q && l.rebu));
  const pool = withRebu.length ? withRebu : quarters;
  // Open the last closed quarter: the one being declared. The current quarter, if the
  // file reaches it, is still open and only has a few days of sales.
  const now = new Date();
  const current = `${now.getFullYear()}-T${Math.floor(now.getMonth() / 3) + 1}`;
  const closed = pool.filter((q) => q < current);
  state.quarter = (closed.length ? closed : pool).slice(-1)[0] || null;
  state.filter = 'all';
  state.shown = PAGE_SIZE;
  state.addOpen = false;
  state.nextId = state.lines.length;
  setView('result');
}

// No file: the merchant types the pieces one by one.
function startManual() {
  state.fileName = T.manualFile;
  state.isSample = false;
  state.parsed = null;
  state.mapping = null;
  state.lines = [];
  state.quarter = null;
  state.filter = 'all';
  state.shown = PAGE_SIZE;
  state.addOpen = true;
  state.nextId = 0;
  setView('result');
  const first = app.querySelector('#add-date');
  if (first) first.focus();
}

function fail(kind) {
  state.error = kind;
  setView('error');
}

// ---------------------------------------------------------------------------
// Vistas

function setView(view) {
  state.view = view;
  render();
  // Move focus to the new content so keyboard and screen-reader users follow along.
  const target = app.querySelector('[data-focus]');
  if (target && view !== 'empty') target.focus({ preventScroll: false });
}

function render() {
  if (state.view === 'empty') app.innerHTML = viewEmpty();
  else if (state.view === 'loading') app.innerHTML = viewLoading();
  else if (state.view === 'error') app.innerHTML = viewError();
  else if (state.view === 'mapping') app.innerHTML = viewMapping();
  else app.innerHTML = viewResult();
  bind();
}

function viewEmpty() {
  return `
  <div class="drop" id="drop">
    <div class="drop-icon">${icon('upload')}</div>
    <h2>${T.dropTitle}</h2>
    <p>${T.dropText}</p>
    <div class="row">
      <button type="button" class="btn" data-act="pick">${icon('file')}${T.choose}</button>
      <button type="button" class="btn btn-ghost" data-act="manual">${T.manual}</button>
      <button type="button" class="btn btn-ghost" data-act="sample">${T.sample}</button>
    </div>
    <p class="help-row"><a class="help" href="${app.dataset.template}" download>${icon('download', 'i i-sm')}${T.template}</a><a class="help" href="${app.dataset.guide}">${T.noFile}</a></p>
  </div>`;
}

function viewLoading() {
  return `
  <div class="panel" role="status" aria-label="${T.reading}">
    <div class="skel" aria-hidden="true">
      <span class="w40"></span>
      <span class="big"></span>
      <span class="w80"></span>
      <span class="w60"></span>
      <span class="w80"></span>
    </div>
  </div>`;
}

function viewError() {
  const k = state.error;
  return `
  <div class="panel state" role="alert">
    <div class="badge">${icon('x-circle')}</div>
    <h2 tabindex="-1" data-focus>${T.errTitle[k]}</h2>
    <p>${T.errText[k]}</p>
    ${state.fileName && k !== 'sample' ? `<p class="file-chip">${icon('file')}<b>${esc(state.fileName)}</b></p>` : ''}
    <div class="row">
      <button type="button" class="btn" data-act="pick">${T.other}</button>
      <a class="btn btn-ghost" href="${app.dataset.guide}">${T.howTo}</a>
    </div>
  </div>`;
}

function viewMapping() {
  const { headers } = state.parsed;
  const missing = missingColumns(state.mapping);
  const names = missing.map((m) => T.missingNames[m]);
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')}${T.and}${names.slice(-1)}` : names[0];
  const fields = ['fecha', 'venta', 'costeUnitario', 'costeTotal', 'tipoIva', 'unidades', 'producto', 'documentoCompra', 'grupoImpuestos'];
  const options = (key) => [`<option value="">${T.none}</option>`]
    .concat(headers.map((h, i) => `<option value="${i}" ${state.mapping[key] === i ? 'selected' : ''}>${esc(h || `#${i + 1}`)}</option>`))
    .join('');
  const isMissing = (key) => (key === 'fecha' || key === 'venta') ? missing.includes(key)
    : (key === 'costeUnitario' || key === 'costeTotal') ? missing.includes('coste') : false;
  return `
  <div class="panel mapping">
    <h2 tabindex="-1" data-focus>${T.mapTitle}</h2>
    <p>${T.mapText(list)}</p>
    <p class="file-chip" style="margin-top:12px">${icon('file')}<b>${esc(state.fileName)}</b><span>${T.lines(state.parsed.rows.length)}</span></p>
    <div class="map-grid">
      ${fields.map((key) => `
        <div class="field ${isMissing(key) ? 'missing' : ''}">
          <label for="map-${key}">${T.mapFields[key][0]}</label>
          <select class="select" id="map-${key}" data-map="${key}">${options(key)}</select>
          <small>${T.mapFields[key][1]}</small>
        </div>`).join('')}
    </div>
    <div class="actions">
      <button type="button" class="btn" data-act="apply-map">${T.calc}</button>
      <button type="button" class="btn btn-ghost" data-act="pick">${T.other}</button>
    </div>
  </div>`;
}

function quartersList() {
  return [...new Set(state.lines.filter((l) => l.quarter).map((l) => l.quarter))].sort();
}

function viewResult() {
  const quarters = quartersList();
  const summary = summarize(state.lines);
  const q = summary.quarters.find((x) => x.quarter === state.quarter);
  const excludedInQuarter = state.lines.filter((l) => l.quarter === state.quarter && !l.rebu).length;

  const banner = state.isSample ? `
    <div class="sample-banner" role="note">${icon('info')}<span>${T.sampleBanner}</span>
      <button type="button" class="btn btn-sm" data-act="pick">${T.useMine}</button>
    </div>` : '';

  const toolbar = `
    <div class="toolbar">
      <p class="file-chip">${icon('file')}<b>${esc(state.fileName)}</b><span>${T.lines(state.lines.length)}</span></p>
      <div class="row">
        <button type="button" class="btn btn-ghost btn-sm" data-act="download" ${state.lines.length ? '' : 'disabled'}>${icon('download')}${T.download}</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="print">${icon('printer')}${T.print}</button>
        <button type="button" class="btn btn-ghost btn-sm" data-act="pick">${icon('reset')}${T.other}</button>
      </div>
    </div>`;

  let summaryBody;
  if (!state.lines.length) {
    summaryBody = `<p class="legal-line" style="font-size:var(--fs-sm)">${icon('info')}<span>${T.emptyManual}</span></p>`;
  } else if (!state.quarter) {
    summaryBody = `<p class="legal-line" style="font-size:var(--fs-sm)">${icon('alert')}<span>${T.noQuarter}</span></p>`;
  } else if (!q) {
    summaryBody = `<p class="legal-line" style="font-size:var(--fs-sm)">${icon('info')}<span>${T.emptySummary}</span></p>`;
  } else {
    const negOps = q.groups.reduce((s, g) => s + g.negativeOperations, 0);
    const negAmount = q.groups.reduce((s, g) => s + g.negativeMarginCents, 0);
    const sum = (k) => q.groups.reduce((s, g) => s + g[k], 0);
    summaryBody = `
      <dl class="kpis">
        <div class="kpi main"><dt>${T.kBase}</dt><dd>${fmt(q.baseCents)}</dd></div>
        <div class="kpi"><dt>${T.kQuota}</dt><dd>${fmt(q.quotaCents)}</dd></div>
        <div class="kpi"><dt>${T.kOps}</dt><dd>${q.operations}</dd></div>
      </dl>
      <div class="table-wrap">
        <table class="data">
          <thead><tr>
            <th scope="col">${T.th.rate}</th><th scope="col" class="r">${T.th.ops}</th><th scope="col" class="r opt">${T.th.sales}</th>
            <th scope="col" class="r opt">${T.th.cost}</th><th scope="col" class="r opt">${T.th.margin}</th><th scope="col" class="r">${T.th.base}</th><th scope="col" class="r">${T.th.quota}</th>
          </tr></thead>
          <tbody>
            ${q.groups.map((g) => `<tr>
              <td>${rateFmt(g.rate)}</td><td class="r">${g.operations}</td><td class="r opt">${fmt(g.saleCents)}</td>
              <td class="r opt">${fmt(g.costCents)}</td><td class="r opt">${fmt(g.positiveMarginCents + g.negativeMarginCents)}</td>
              <td class="r"><strong>${fmt(g.baseCents)}</strong></td><td class="r">${fmt(g.quotaCents)}</td></tr>`).join('')}
          </tbody>
          ${q.groups.length > 1 ? `<tfoot><tr><td>${T.total}</td><td class="r">${q.operations}</td><td class="r opt">${fmt(sum('saleCents'))}</td>
            <td class="r opt">${fmt(sum('costCents'))}</td><td class="r opt">${fmt(sum('positiveMarginCents') + sum('negativeMarginCents'))}</td>
            <td class="r">${fmt(q.baseCents)}</td><td class="r">${fmt(q.quotaCents)}</td></tr></tfoot>` : ''}
        </table>
      </div>
      ${negOps ? `<p class="legal-line">${icon('info')}<span>${T.negNote(negOps, fmt(negAmount))}</span></p>` : ''}`;
  }

  const seg = quarters.length > 1 ? `
    <div class="segmented" role="group" aria-label="${T.summaryTitle('').trim()}">
      ${quarters.map((x) => `<button type="button" data-quarter="${x}" aria-pressed="${x === state.quarter}">${T.quarter(x)}</button>`).join('')}
    </div>` : '';

  const summaryPanel = `
    <div class="panel summary">
      <div class="summary-top">
        <div>
          <h2 tabindex="-1" data-focus>${state.quarter ? T.summaryTitle(T.quarter(state.quarter)) : T.summaryTitle('')}</h2>
          ${q ? `<p class="sub">${T.summarySub(q.operations, excludedInQuarter)}</p>` : ''}
        </div>
        ${seg}
      </div>
      ${summaryBody}
      ${state.lines.some((l) => l.rebuReason === 'archivo') ? `<p class="legal-line">${icon('info')}<span>${T.assumedAll}</span></p>` : ''}
      <p class="legal-line">${icon('alert')}<span>${T.legal}</span></p>
    </div>`;

  return `<div class="result">${banner}${toolbar}${summaryPanel}${viewAdd()}${state.lines.length ? viewLines() : ''}</div>`;
}

function viewAdd() {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const rate = state.lastRate || String(T.rates[0]);
  const rateOpts = T.rates.map((r) => `<option value="${r}" ${String(r) === rate ? 'selected' : ''}>${rateFmt(r)}</option>`).join('');
  return `
  <details class="panel add" id="add" ${state.addOpen ? 'open' : ''}>
    <summary><span class="add-title"><b>${T.addTitle}</b><small>${T.addHint}</small></span><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></summary>
    <form class="add-form" novalidate>
      <div class="field"><label for="add-date">${T.fDate}</label><input class="input" type="date" id="add-date" name="date" value="${state.lastDate || today}" required></div>
      <div class="field wide"><label for="add-product">${T.fProduct}</label><input class="input" id="add-product" name="product" autocomplete="off" required></div>
      <div class="field"><label for="add-sale">${T.fSale}</label><input class="input num" id="add-sale" name="sale" inputmode="decimal" autocomplete="off" required aria-describedby="add-sale-h"><small id="add-sale-h">${T.fSaleHint}</small></div>
      <div class="field"><label for="add-cost">${T.fCost}</label><input class="input num" id="add-cost" name="cost" inputmode="decimal" autocomplete="off" aria-describedby="add-cost-h"><small id="add-cost-h">${T.fCostHint}</small></div>
      <div class="field"><label for="add-rate">${T.fRate}</label><select class="select" id="add-rate" name="rate">${rateOpts}</select></div>
      <div class="field"><label for="add-invoice">${T.fInvoice} <span class="opt">${T.optional}</span></label><input class="input" id="add-invoice" name="invoice" autocomplete="off"></div>
      <div class="field"><label for="add-doc">${T.fDoc} <span class="opt">${T.optional}</span></label><input class="input" id="add-doc" name="doc" autocomplete="off"></div>
      <div class="add-actions">
        <p class="add-error" role="alert" hidden></p>
        <button type="submit" class="btn">${icon('check')}${T.add}</button>
      </div>
    </form>
  </details>`;
}

function visibleLines() {
  return state.lines.filter((l) => {
    const inQuarter = l.quarter === state.quarter;
    const hasWarn = warningsOf(l).length > 0;
    if (state.filter === 'rebu') return inQuarter && l.rebu;
    if (state.filter === 'warn') return hasWarn && (inQuarter || !l.quarter);
    return inQuarter || (!state.quarter && !l.quarter);
  });
}

function warningsOf(line) {
  const list = [...line.warnings];
  const { marginCents } = computeLine(line);
  if (line.rebu && marginCents !== null && marginCents < 0) list.push('negativo');
  return list;
}

function viewLines() {
  const all = visibleLines();
  const rows = all.slice(0, state.shown);
  const warnCount = state.lines.filter((l) => warningsOf(l).length && (l.quarter === state.quarter || !l.quarter)).length;
  const rateOptions = (r) => {
    const opts = [...new Set([...T.rates, r])].sort((a, b) => b - a);
    return opts.map((x) => `<option value="${x}" ${x === r ? 'selected' : ''}>${rateFmt(x)}</option>`).join('');
  };
  const body = rows.map((l) => {
    const { marginCents, baseCents } = computeLine(l);
    const name = l.product || `#${l.row}`;
    const flags = warningsOf(l).map((w) => `<span class="flag ${w === 'negativo' ? 'info' : ''}" title="${esc(T.flags[w][1])}">${icon(w === 'negativo' ? 'info' : 'alert', 'i')}${T.flags[w][0]}</span>`).join('');
    const editedSale = l.saleCents !== l.original.saleCents;
    const editedCost = l.costCents !== l.original.costCents;
    return `<tr class="${l.rebu ? '' : 'off'}" data-id="${l.id}">
      <td><input type="checkbox" class="check" data-edit="rebu" ${l.rebu ? 'checked' : ''} aria-label="${esc(T.rebuLabel(name))}"></td>
      <td class="num">${l.date ? fmtDate(l.date) : `<span class="neg">${T.noDate}</span>`}</td>
      <td class="nowrap">${esc(l.order)}</td>
      <td class="prod"><span class="name" title="${esc(name)}">${esc(name)}</span><small>${[l.invoice && l.invoice !== '0' ? T.invoice(esc(l.invoice)) : '', l.units !== 1 ? T.units(l.units) : ''].filter(Boolean).join(' · ')}</small></td>
      <td class="r"><input class="cell-input ${editedSale ? 'edited' : ''}" data-edit="sale" inputmode="decimal" value="${l.saleCents === null ? '' : fmtPlain(l.saleCents)}" aria-label="${esc(T.saleLabel(name))}"></td>
      <td class="r"><input class="cell-input ${editedCost ? 'edited' : ''}" data-edit="cost" inputmode="decimal" value="${fmtPlain(l.costCents)}" aria-label="${esc(T.costLabel(name))}"></td>
      <td><select class="cell-select" data-edit="rate" aria-label="${esc(T.rateLabel(name))}">${rateOptions(l.rate)}</select></td>
      <td class="r ${marginCents !== null && marginCents < 0 ? 'neg' : ''}">${marginCents === null ? '–' : fmt(marginCents)}</td>
      <td class="r">${isCountable(l) ? fmt(baseCents) : '–'}</td>
      <td><div class="flags">${flags}${l.rebuReason === 'manual' ? `<button type="button" class="btn-remove" data-remove="${l.id}" aria-label="${esc(T.removeLabel(name))}">${T.remove}</button>` : ''}</div></td>
    </tr>`;
  }).join('');

  return `
  <div class="panel lines">
    <div class="lines-top">
      <div>
        <h2>${T.linesTitle}</h2>
        <p>${T.linesSub}</p>
      </div>
      <div class="segmented" role="group" aria-label="${T.linesTitle}">
        <button type="button" data-filter="all" aria-pressed="${state.filter === 'all'}">${T.filters.all}</button>
        <button type="button" data-filter="rebu" aria-pressed="${state.filter === 'rebu'}">${T.filters.rebu}</button>
        <button type="button" data-filter="warn" aria-pressed="${state.filter === 'warn'}">${T.filters.warn} <span class="num">(${warnCount})</span></button>
      </div>
    </div>
    <div class="table-wrap">
      <table class="data lines-table">
        <thead><tr>
          <th scope="col">${T.col.rebu}</th><th scope="col">${T.col.date}</th><th scope="col">${T.col.order}</th><th scope="col">${T.col.product}</th>
          <th scope="col" class="r">${T.col.sale}</th><th scope="col" class="r">${T.col.cost}</th><th scope="col">${T.col.rate}</th>
          <th scope="col" class="r">${T.col.margin}</th><th scope="col" class="r">${T.col.base}</th><th scope="col">${T.col.notes}</th>
        </tr></thead>
        <tbody>${body}</tbody>
      </table>
      ${rows.length ? '' : `<p class="empty-filter">${T.emptyFilter}</p>`}
    </div>
    ${all.length > state.shown ? `<div class="more"><button type="button" class="btn btn-ghost btn-sm" data-act="more">${T.more(Math.min(PAGE_SIZE, all.length - state.shown))}</button></div>` : ''}
  </div>`;
}

// ---------------------------------------------------------------------------
// Eventos

function bind() {
  app.querySelectorAll('[data-act]').forEach((el) => el.addEventListener('click', onAction));
  app.querySelectorAll('[data-quarter]').forEach((el) => el.addEventListener('click', () => {
    state.quarter = el.dataset.quarter;
    state.shown = PAGE_SIZE;
    rerenderKeepingFocus(`[data-quarter="${state.quarter}"]`);
  }));
  app.querySelectorAll('[data-filter]').forEach((el) => el.addEventListener('click', () => {
    state.filter = el.dataset.filter;
    state.shown = PAGE_SIZE;
    rerenderKeepingFocus(`[data-filter="${state.filter}"]`);
  }));
  app.querySelectorAll('tr[data-id]').forEach((tr) => {
    const line = state.lines.find((l) => l.id === Number(tr.dataset.id));
    tr.querySelectorAll('[data-edit]').forEach((el) => {
      const kind = el.dataset.edit;
      if (kind === 'rebu') el.addEventListener('change', () => { line.rebu = el.checked; rerenderKeepingFocus(`tr[data-id="${line.id}"] [data-edit="rebu"]`); });
      if (kind === 'rate') el.addEventListener('change', () => { line.rate = Number(el.value); rerenderKeepingFocus(`tr[data-id="${line.id}"] [data-edit="rate"]`); });
      if (kind === 'sale' || kind === 'cost') {
        const commit = (keepHere) => {
          const n = parseNumber(el.value, true);
          if (!Number.isFinite(n) || n < 0) {
            el.classList.add('bad');
            el.setAttribute('aria-invalid', 'true');
            toast(T.badNumber);
            return;
          }
          const cents = toCents(n);
          if (kind === 'sale') {
            line.saleCents = cents;
            line.warnings = line.warnings.filter((w) => w !== 'venta');
          } else {
            line.costCents = cents;
            line.warnings = line.warnings.filter((w) => w !== 'sinCoste');
            if (cents === 0) line.warnings.push('sinCoste');
          }
          rerenderKeepingFocus(keepHere ? `tr[data-id="${line.id}"] [data-edit="${kind}"]` : null);
        };
        el.addEventListener('change', () => commit(false));
        el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commit(true); } });
        el.addEventListener('focus', () => el.select());
      }
    });
  });
  const add = app.querySelector('#add');
  if (add) {
    add.addEventListener('toggle', () => { state.addOpen = add.open; });
    const form = add.querySelector('form');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const data = new FormData(form);
      const errBox = form.querySelector('.add-error');
      form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
      const stop = (message, field) => {
        errBox.textContent = message;
        errBox.hidden = false;
        const el = form.querySelector(`[name="${field}"]`);
        el.setAttribute('aria-invalid', 'true');
        el.focus();
      };
      const date = String(data.get('date') || '');
      const product = String(data.get('product') || '').trim();
      const saleRaw = String(data.get('sale') || '').trim();
      const costRaw = String(data.get('cost') || '').trim();
      if (!parseDate(date)) return stop(T.addErr.fecha, 'date');
      if (!product) return stop(T.addErr.producto, 'product');
      const sale = parseNumber(saleRaw, true);
      if (!Number.isFinite(sale) || sale < 0) return stop(T.addErr.venta, 'sale');
      const cost = costRaw === '' ? NaN : parseNumber(costRaw, true);
      if (costRaw !== '' && (!Number.isFinite(cost) || cost < 0)) return stop(T.addErr.coste, 'cost');
      const line = makeManualLine({
        id: state.nextId++, date, product, sale, cost,
        invoice: data.get('invoice') || '', purchaseDoc: data.get('doc') || '', rate: Number(data.get('rate')),
      });
      line.original = { saleCents: line.saleCents, costCents: line.costCents };
      state.lines.push(line);
      state.lastDate = date;
      state.lastRate = String(data.get('rate'));
      state.quarter = line.quarter;
      state.addOpen = true;
      toast(T.added);
      rerenderKeepingFocus('#add-product');
    });
  }
  app.querySelectorAll('[data-remove]').forEach((btn) => btn.addEventListener('click', () => {
    const id = Number(btn.dataset.remove);
    state.lines = state.lines.filter((l) => l.id !== id);
    const quarters = quartersList();
    if (!quarters.includes(state.quarter)) state.quarter = quarters.slice(-1)[0] || null;
    toast(T.removed);
    rerenderKeepingFocus(state.lines.length ? null : '#add-product');
  }));
  if (state.view === 'empty') bindDrop();
  if (state.view === 'mapping') {
    app.querySelectorAll('[data-map]').forEach((sel) => sel.addEventListener('change', () => {
      const key = sel.dataset.map;
      if (sel.value === '') delete state.mapping[key];
      else state.mapping[key] = Number(sel.value);
      sel.closest('.field').classList.remove('missing');
    }));
  }
}

// Re-render the result but keep the user where they were: same scroll, same control
// focused. It waits a frame so that, after Tab, focus has already reached the next field.
function rerenderKeepingFocus(selector) {
  requestAnimationFrame(() => {
    const active = document.activeElement;
    const tr = active && active.closest ? active.closest('tr[data-id]') : null;
    const key = selector || (tr && active.dataset.edit ? `tr[data-id="${tr.dataset.id}"] [data-edit="${active.dataset.edit}"]` : null);
    const wasTyping = active && active.tagName === 'INPUT' && active.type !== 'checkbox';
    const y = window.scrollY;
    render();
    window.scrollTo(0, y);
    const target = key && app.querySelector(key);
    if (target) {
      target.focus({ preventScroll: true });
      if (wasTyping && target.select) target.select();
    }
  });
}

function onAction(event) {
  const act = event.currentTarget.dataset.act;
  if (act === 'pick') pickFile();
  if (act === 'sample') loadSample();
  if (act === 'manual') startManual();
  if (act === 'more') { state.shown += PAGE_SIZE; rerenderKeepingFocus(null); }
  if (act === 'print') window.print();
  if (act === 'download') downloadDetail();
  if (act === 'apply-map') {
    const missing = missingColumns(state.mapping);
    if (missing.length) {
      app.querySelectorAll('.field').forEach((f) => {
        const key = f.querySelector('[data-map]').dataset.map;
        const bad = (key === 'fecha' || key === 'venta') ? missing.includes(key) : (key.startsWith('coste') && missing.includes('coste'));
        f.classList.toggle('missing', bad);
      });
      const first = app.querySelector('.field.missing select');
      if (first) first.focus();
      return;
    }
    compute();
  }
}

function downloadDetail() {
  const csv = detailCSV(state.lines, T.detailHeaders, T.regime);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = T.detailFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(T.downloaded);
}

function bindDrop() {
  const drop = document.getElementById('drop');
  if (!drop) return;
  let depth = 0;
  const on = (e) => { e.preventDefault(); depth++; drop.classList.add('over'); };
  const off = (e) => { e.preventDefault(); depth = Math.max(0, depth - 1); if (!depth) drop.classList.remove('over'); };
  drop.addEventListener('dragenter', on);
  drop.addEventListener('dragleave', off);
  drop.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    depth = 0;
    drop.classList.remove('over');
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) readFile(file);
  });
}

// A file dropped anywhere else on the page should not make the browser navigate away.
window.addEventListener('dragover', (e) => { if (state.view !== 'empty') e.preventDefault(); });
window.addEventListener('drop', (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file && state.view !== 'loading') readFile(file);
});

render();
if (location.hash === '#ejemplo' || location.hash === '#exemple') loadSample();
