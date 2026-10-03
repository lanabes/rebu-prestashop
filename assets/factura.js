// Modelo de factura REBU / TVA sur marge y de documento de compra a un particular.
// Se ve primero un ejemplo rellenado (marcado como EJEMPLO); «Rellenar con mis datos»
// lo vacía y deja escribir encima. Nada se envía ni se guarda: se imprime o se guarda
// en PDF desde el navegador.
const root = document.getElementById('modelo');
const LANG = document.documentElement.lang === 'fr' ? 'fr' : 'es';

const T = {
  es: {
    locale: 'es-ES',
    tabs: { invoice: 'Factura de venta', purchase: 'Documento de compra a un particular' },
    sample: 'Ejemplo',
    sampleNote: 'Datos de ejemplo. Pulsa «Rellenar con mis datos» para escribir los tuyos.',
    fill: 'Rellenar con mis datos',
    showSample: 'Ver el ejemplo',
    print: 'Imprimir o guardar en PDF',
    notSaved: 'No se guarda nada: imprímelo o guárdalo en PDF antes de cerrar la página.',
    invoiceTitle: 'Factura',
    purchaseTitle: 'Documento de compra',
    number: 'Nº y serie',
    date: 'Fecha de expedición',
    opDate: 'Fecha de la venta (si es otra)',
    seller: 'Vendedor',
    buyer: 'Cliente',
    store: 'Comprador (tu negocio)',
    particular: 'Vendedor (particular)',
    name: 'Nombre o razón social',
    personName: 'Nombre y apellidos',
    nif: 'NIF',
    nifOpt: 'NIF',
    dni: 'DNI o NIE',
    address: 'Domicilio',
    desc: 'Descripción del bien',
    descPurchase: 'Descripción del bien (con nº de serie o IMEI si lo tiene)',
    qty: 'Uds.',
    price: 'Precio',
    amount: 'Importe',
    total: 'Total, IVA incluido',
    totalPaid: 'Precio pagado',
    payment: 'Forma de pago',
    addLine: 'Añadir línea',
    removeLine: 'Quitar línea',
    mention: 'Mención',
    mentions: ['Régimen especial de los bienes usados', 'Régimen especial de los objetos de arte', 'Régimen especial de las antigüedades y objetos de colección'],
    vatNote: 'IVA incluido en el precio. No se desglosa (art. 138 de la Ley 37/1992).',
    signSeller: 'Firma del vendedor',
    signBuyer: 'Firma del comprador',
    purchaseNote: 'Lo expide el revendedor y lo firma quien le vende el bien.',
    example: {
      invoice: {
        number: 'A-2026-0045', date: '2026-07-09', opDate: '',
        seller: { name: 'Segunda Vida Ejemplo, S. L.', nif: 'B00000000', address: 'Calle del Ejemplo, 1, 20000 Ciudad' },
        buyer: { name: 'Nombre del cliente de ejemplo', nif: '00000000T', address: 'Calle Inventada, 2, 28000 Ciudad' },
        lines: [
          { desc: 'Consola Super Nintendo PAL con caja (usada)', qty: '1', price: '189,00' },
          { desc: 'Cámara Canon AE-1 con objetivo 50 mm (usada)', qty: '1', price: '245,00' },
        ],
        mention: 0,
      },
      purchase: {
        number: 'DC-2026-0031', date: '2026-06-18',
        store: { name: 'Segunda Vida Ejemplo, S. L.', nif: 'B00000000', address: 'Calle del Ejemplo, 1, 20000 Ciudad' },
        seller: { name: 'Nombre del vendedor de ejemplo', dni: '00000000T', address: 'Calle Inventada, 3, 20000 Ciudad' },
        lines: [{ desc: 'Cámara Canon AE-1 con objetivo 50 mm, nº de serie 0000000', qty: '1', price: '130,00' }],
        payment: 'Transferencia bancaria',
      },
    },
  },
  fr: {
    locale: 'fr-FR',
    tabs: { invoice: 'Facture de vente', purchase: 'Justificatif d’achat à un particulier' },
    sample: 'Exemple',
    sampleNote: 'Données d’exemple. Cliquez sur « Remplir avec mes données » pour saisir les vôtres.',
    fill: 'Remplir avec mes données',
    showSample: 'Voir l’exemple',
    print: 'Imprimer ou enregistrer en PDF',
    notSaved: 'Rien n’est enregistré : imprimez-le ou enregistrez-le en PDF avant de fermer la page.',
    invoiceTitle: 'Facture',
    purchaseTitle: 'Justificatif d’achat',
    number: 'Numéro',
    date: 'Date d’émission',
    opDate: 'Date de la vente (si différente)',
    seller: 'Vendeur',
    buyer: 'Client',
    store: 'Acheteur (votre entreprise)',
    particular: 'Vendeur (particulier)',
    name: 'Nom ou raison sociale',
    personName: 'Nom et prénom',
    nif: 'SIREN / n° de TVA',
    nifOpt: 'SIREN (si professionnel)',
    dni: 'Pièce d’identité (type et numéro)',
    address: 'Adresse',
    desc: 'Désignation du bien',
    descPurchase: 'Désignation du bien (avec n° de série ou IMEI s’il en a un)',
    qty: 'Qté',
    price: 'Prix',
    amount: 'Montant',
    total: 'Total TTC',
    totalPaid: 'Prix payé',
    payment: 'Mode de paiement',
    addLine: 'Ajouter une ligne',
    removeLine: 'Retirer la ligne',
    mention: 'Mention',
    mentions: ['Régime particulier-Biens d’occasion', 'Régime particulier-Objets d’art', 'Régime particulier-Objets de collection et d’antiquité'],
    vatNote: 'TVA non apparente : prix toutes taxes comprises (art. 297 E du CGI).',
    signSeller: 'Signature du vendeur',
    signBuyer: 'Signature de l’acheteur',
    purchaseNote: 'Conservez-le : le prix d’achat sert à calculer la marge de chaque pièce.',
    example: {
      invoice: {
        number: 'F-2026-0045', date: '2026-07-09', opDate: '',
        seller: { name: 'Seconde Vie Exemple SARL', nif: '000 000 000', address: '1 rue de l’Exemple, 75000 Ville' },
        buyer: { name: 'Nom du client d’exemple', nif: '', address: '2 rue Imaginaire, 69000 Ville' },
        lines: [
          { desc: 'Console Super Nintendo PAL en boîte (occasion)', qty: '1', price: '189,00' },
          { desc: 'Appareil photo Canon AE-1 avec objectif 50 mm (occasion)', qty: '1', price: '245,00' },
        ],
        mention: 0,
      },
      purchase: {
        number: 'JA-2026-0031', date: '2026-06-18',
        store: { name: 'Seconde Vie Exemple SARL', nif: '000 000 000', address: '1 rue de l’Exemple, 75000 Ville' },
        seller: { name: 'Nom du vendeur d’exemple', dni: 'Carte d’identité n° 000000000000', address: '3 rue Imaginaire, 75000 Ville' },
        lines: [{ desc: 'Appareil photo Canon AE-1 avec objectif 50 mm, n° de série 0000000', qty: '1', price: '130,00' }],
        payment: 'Virement bancaire',
      },
    },
  },
}[LANG];

const ICONS = root.dataset.icons;
const icon = (name) => `<svg class="i" aria-hidden="true"><use href="${ICONS}#${name}"/></svg>`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = new Intl.NumberFormat(T.locale, { style: 'currency', currency: 'EUR' });
const dateFmt = new Intl.DateTimeFormat(T.locale, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });

// "1.234,56", "1234.56" or "12" to a number; NaN if it isn't one.
function toNumber(value) {
  let s = String(value ?? '').replace(/[€\s  ]/g, '');
  if (s === '') return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}
const showDate = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  return m ? dateFmt.format(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))) : '';
};

const blank = {
  invoice: () => ({ number: '', date: '', opDate: '', seller: { name: '', nif: '', address: '' }, buyer: { name: '', nif: '', address: '' }, lines: [{ desc: '', qty: '1', price: '' }], mention: 0 }),
  purchase: () => ({ number: '', date: '', store: { name: '', nif: '', address: '' }, seller: { name: '', dni: '', address: '' }, lines: [{ desc: '', qty: '1', price: '' }], payment: '' }),
};
const clone = (o) => JSON.parse(JSON.stringify(o));

const state = {
  tab: 'invoice',
  mode: { invoice: 'sample', purchase: 'sample' },
  data: { invoice: clone(T.example.invoice), purchase: clone(T.example.purchase) },
};

// ---------------------------------------------------------------------------

// While building the clean copy for printing, everything renders as text and empty
// fields disappear, so no browser controls or blank labels end up on paper.
let printing = false;
const isEditing = () => !printing && state.mode[state.tab] === 'edit';

function field(path, label, value, opts = {}) {
  const id = `f-${state.tab}-${path.replace(/\./g, '-')}`;
  const editing = isEditing();
  const type = opts.type || 'text';
  if (!editing) {
    const shown = type === 'date' ? showDate(value) : value;
    if (!shown && (opts.hideEmpty || printing)) return '';
    return `<div class="sf ${opts.cls || ''}"><span class="sl">${label}</span><span class="sv">${esc(shown) || '—'}</span></div>`;
  }
  return `<div class="sf ${opts.cls || ''}"><label class="sl" for="${id}">${label}</label><input class="si" id="${id}" type="${type}" data-path="${path}" value="${esc(value)}" ${opts.inputmode ? `inputmode="${opts.inputmode}"` : ''} autocomplete="off"></div>`;
}

function linesTable(lines, purchase) {
  const editing = isEditing();
  let total = 0;
  const rows = lines.map((l, i) => {
    const qty = toNumber(l.qty);
    const price = toNumber(l.price);
    const amount = Number.isFinite(qty) && Number.isFinite(price) ? qty * price : NaN;
    if (Number.isFinite(amount)) total += amount;
    const desc = purchase ? T.descPurchase : T.desc;
    if (!editing) {
      return `<tr><td class="d">${esc(l.desc)}</td><td class="n">${esc(l.qty)}</td><td class="n">${Number.isFinite(price) ? money.format(price) : ''}</td><td class="n">${Number.isFinite(amount) ? money.format(amount) : ''}</td></tr>`;
    }
    return `<tr>
      <td class="d"><input class="si" aria-label="${desc}, ${i + 1}" data-line="${i}" data-key="desc" value="${esc(l.desc)}" autocomplete="off"></td>
      <td class="n"><input class="si n" aria-label="${T.qty}, ${i + 1}" data-line="${i}" data-key="qty" value="${esc(l.qty)}" inputmode="decimal" autocomplete="off"></td>
      <td class="n"><input class="si n" aria-label="${T.price}, ${i + 1}" data-line="${i}" data-key="price" value="${esc(l.price)}" inputmode="decimal" autocomplete="off"></td>
      <td class="n"><span class="amount">${Number.isFinite(amount) ? money.format(amount) : ''}</span>${lines.length > 1 ? `<button type="button" class="line-x no-print" data-remove-line="${i}" aria-label="${T.removeLine} ${i + 1}">×</button>` : ''}</td>
    </tr>`;
  }).join('');
  return { total, html: `
    <table class="sheet-lines">
      <thead><tr><th class="d">${purchase ? T.descPurchase : T.desc}</th><th class="n">${T.qty}</th><th class="n">${T.price}</th><th class="n">${T.amount}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    ${editing ? `<button type="button" class="btn btn-quiet btn-sm add-line no-print" data-add-line>${icon('check')}${T.addLine}</button>` : ''}` };
}

function sheetInvoice(d) {
  const editing = isEditing();
  const { total, html } = linesTable(d.lines, false);
  const mention = editing
    ? `<label class="sl" for="f-mention">${T.mention}</label><select class="si" id="f-mention" data-path="mention">${T.mentions.map((m, i) => `<option value="${i}" ${+d.mention === i ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select>`
    : `<p class="mention-text">${esc(T.mentions[+d.mention || 0])}</p>`;
  return `
    <header class="sheet-head">
      <h3>${T.invoiceTitle}</h3>
      <div class="sheet-meta">
        ${field('number', T.number, d.number)}
        ${field('date', T.date, d.date, { type: 'date' })}
        ${field('opDate', T.opDate, d.opDate, { type: 'date', hideEmpty: true })}
      </div>
    </header>
    <div class="sheet-parties">
      <section><h4>${T.seller}</h4>${field('seller.name', T.name, d.seller.name)}${field('seller.nif', T.nif, d.seller.nif)}${field('seller.address', T.address, d.seller.address)}</section>
      <section><h4>${T.buyer}</h4>${field('buyer.name', T.name, d.buyer.name)}${field('buyer.nif', T.nifOpt, d.buyer.nif, { hideEmpty: true })}${field('buyer.address', T.address, d.buyer.address)}</section>
    </div>
    ${html}
    <div class="sheet-total"><span>${T.total}</span><strong class="num">${money.format(total)}</strong></div>
    <div class="sheet-mention">${mention}<p class="vat-note">${T.vatNote}</p></div>`;
}

function sheetPurchase(d) {
  const { total, html } = linesTable(d.lines, true);
  return `
    <header class="sheet-head">
      <h3>${T.purchaseTitle}</h3>
      <div class="sheet-meta">
        ${field('number', T.number, d.number)}
        ${field('date', T.date, d.date, { type: 'date' })}
      </div>
    </header>
    <div class="sheet-parties">
      <section><h4>${T.store}</h4>${field('store.name', T.name, d.store.name)}${field('store.nif', T.nif, d.store.nif)}${field('store.address', T.address, d.store.address)}</section>
      <section><h4>${T.particular}</h4>${field('seller.name', T.personName, d.seller.name)}${field('seller.dni', T.dni, d.seller.dni)}${field('seller.address', T.address, d.seller.address)}</section>
    </div>
    ${html}
    <div class="sheet-total"><span>${T.totalPaid}</span><strong class="num">${money.format(total)}</strong></div>
    <div class="sheet-foot">${field('payment', T.payment, d.payment)}<p class="vat-note">${T.purchaseNote}</p></div>
    <div class="sheet-signs"><div><span></span>${T.signSeller}</div><div><span></span>${T.signBuyer}</div></div>`;
}

function render(focusSel) {
  const tab = state.tab;
  const sample = state.mode[tab] === 'sample';
  const d = state.data[tab];
  root.innerHTML = `
    <div class="doc-tabs no-print" role="tablist" aria-label="${T.tabs.invoice} / ${T.tabs.purchase}">
      ${['invoice', 'purchase'].map((t) => `<button type="button" role="tab" id="tab-${t}" aria-controls="sheet" aria-selected="${t === tab}" tabindex="${t === tab ? 0 : -1}" data-tab="${t}">${T.tabs[t]}</button>`).join('')}
    </div>
    <div class="doc-bar no-print">
      <p>${sample ? `${icon('info')}<span>${T.sampleNote}</span>` : `${icon('lock')}<span>${T.notSaved}</span>`}</p>
      <div class="row">
        <button type="button" class="btn btn-ghost btn-sm" data-mode="${sample ? 'edit' : 'sample'}">${sample ? T.fill : T.showSample}</button>
        <button type="button" class="btn btn-sm" data-print>${icon('printer')}${T.print}</button>
      </div>
    </div>
    <article class="sheet ${sample ? 'is-sample' : 'is-edit'}" id="sheet" role="tabpanel" aria-labelledby="tab-${tab}">
      ${sample ? `<span class="sample-mark" aria-hidden="true">${T.sample}</span>` : ''}
      ${tab === 'invoice' ? sheetInvoice(d) : sheetPurchase(d)}
    </article>
    <div class="sheet sheet-print" aria-hidden="true"></div>`;
  bind();
  if (focusSel) {
    const el = root.querySelector(focusSel);
    if (el) el.focus();
  }
}

function set(path, value) {
  const keys = path.split('.');
  let o = state.data[state.tab];
  while (keys.length > 1) o = o[keys.shift()];
  o[keys[0]] = value;
}

function refreshTotals() {
  // Recalculate amounts and total in place, without re-rendering the inputs being typed in.
  const d = state.data[state.tab];
  let total = 0;
  root.querySelectorAll('.sheet-lines tbody tr').forEach((tr, i) => {
    const l = d.lines[i];
    const amount = toNumber(l.qty) * toNumber(l.price);
    const cell = tr.querySelector('.amount');
    if (cell) cell.textContent = Number.isFinite(amount) ? money.format(amount) : '';
    if (Number.isFinite(amount)) total += amount;
  });
  root.querySelector('.sheet-total strong').textContent = money.format(total);
}

function bind() {
  root.querySelectorAll('[data-tab]').forEach((b) => {
    b.addEventListener('click', () => { state.tab = b.dataset.tab; render(`#tab-${state.tab}`); });
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      state.tab = state.tab === 'invoice' ? 'purchase' : 'invoice';
      render(`#tab-${state.tab}`);
    });
  });
  root.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
    const mode = b.dataset.mode;
    state.mode[state.tab] = mode;
    state.data[state.tab] = mode === 'edit' ? blank[state.tab]() : clone(T.example[state.tab]);
    render(mode === 'edit' ? '.sheet .si' : '[data-mode]');
  }));
  root.querySelector('[data-print]').addEventListener('click', () => { buildPrintCopy(); window.print(); });
  root.querySelectorAll('[data-path]').forEach((el) => el.addEventListener('input', () => {
    set(el.dataset.path, el.dataset.path === 'mention' ? Number(el.value) : el.value);
  }));
  root.querySelectorAll('[data-line]').forEach((el) => el.addEventListener('input', () => {
    state.data[state.tab].lines[Number(el.dataset.line)][el.dataset.key] = el.value;
    if (el.dataset.key !== 'desc') refreshTotals();
  }));
  const add = root.querySelector('[data-add-line]');
  if (add) add.addEventListener('click', () => {
    const lines = state.data[state.tab].lines;
    lines.push({ desc: '', qty: '1', price: '' });
    render(`[data-line="${lines.length - 1}"][data-key="desc"]`);
  });
  root.querySelectorAll('[data-remove-line]').forEach((b) => b.addEventListener('click', () => {
    const lines = state.data[state.tab].lines;
    lines.splice(Number(b.dataset.removeLine), 1);
    render('[data-add-line]');
  }));
}

function buildPrintCopy() {
  const target = root.querySelector('.sheet-print');
  if (!target || state.mode[state.tab] !== 'edit') return;
  printing = true;
  const d = state.data[state.tab];
  const printable = { ...d, lines: d.lines.filter((l) => l.desc || l.price) };
  target.innerHTML = state.tab === 'invoice' ? sheetInvoice(printable) : sheetPurchase(printable);
  printing = false;
}
window.addEventListener('beforeprint', buildPrintCopy);

render();
