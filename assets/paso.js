// El cálculo paso a paso de las páginas de ejemplos (castellano y francés): dos
// importes y un tipo, y cada paso de la fórmula con las cifras puestas. Usa el mismo
// motor que la calculadora, así que da los mismos céntimos.
import { parseNumber, computeLine, toCents } from './rebu-core.js';

const lang = document.documentElement.lang === 'fr' ? 'fr' : 'es';
const locale = lang === 'fr' ? 'fr-FR' : 'es-ES';
const money = new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' });
const plain = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const rateFmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 3 });
const divFmt = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 3 });
// A real minus sign (−), not a hyphen, like the rest of the page.
const fmt = (cents) => money.format(cents / 100).replace('-', '−');
const num = (cents) => plain.format(cents / 100).replace('-', '−');

const TXT = {
  es: {
    margin: (s, b) => `${s} − ${b}`,
    base: (m, r) => `${m} × 100 / ${rateFmt.format(100 + r)}`,
    quota: (b, r) => `${b} × ${rateFmt.format(r)}\u00a0%`,
    zeroBase: 'Margen negativo: la base es 0',
    zeroQuota: 'Nada que declarar por esta pieza',
    negNote: 'Con el método de operación a operación, esa pérdida no se resta de otras ventas.',
    invalid: 'Escribe dos importes, por ejemplo 300 y 450,50.',
    full: 'IVA sobre el precio entero',
    rebu: 'IVA sobre el margen',
  },
  fr: {
    margin: (s, b) => `${s} − ${b}`,
    base: (m, r) => `${m} / ${divFmt.format(1 + r / 100)}`,
    quota: (b, r) => `${b} × ${rateFmt.format(r)}\u00a0%`,
    zeroBase: 'Marge négative : la base est nulle',
    zeroQuota: 'Rien à déclarer pour cette pièce',
    negNote: 'Cette perte ne s’impute pas sur les autres ventes.',
    invalid: 'Saisissez deux montants, par exemple 300 et 450,50.',
    full: 'TVA sur le prix total',
    rebu: 'TVA sur la marge',
  },
}[lang];

const root = document.getElementById('walk');
if (root) {
  const $ = (id) => document.getElementById(id);
  const buy = $('w-buy');
  const sell = $('w-sell');
  const err = $('w-err');
  const neg = $('w-neg');
  const steps = root.querySelector('.walk-steps');
  const out = {
    f1: $('w-f1'), r1: $('w-r1'),
    f2: $('w-f2'), r2: $('w-r2'),
    f3: $('w-f3'), r3: $('w-r3'),
    full: $('w-full'), fullBar: $('w-full-bar'),
    rebu: $('w-rebu'), rebuBar: $('w-rebu-bar'),
  };
  const rateButtons = [...root.querySelectorAll('[data-rate]:not([data-buy])')];
  const presets = [...root.querySelectorAll('[data-buy]')];
  let rate = Number(rateButtons.find((b) => b.getAttribute('aria-pressed') === 'true')?.dataset.rate || rateButtons[0]?.dataset.rate || 21);

  const setRate = (r) => {
    rate = r;
    rateButtons.forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.rate) === r)));
  };

  // A short settle on the numbers tells the eye they changed; nothing moves on load.
  let ready = false;
  const pulse = () => {
    if (!ready) return;
    steps.classList.remove('tick');
    void steps.offsetWidth;
    steps.classList.add('tick');
  };

  const render = () => {
    const b = parseNumber(buy.value);
    const s = parseNumber(sell.value);
    const badBuy = !Number.isFinite(b) || b < 0;
    const badSell = !Number.isFinite(s) || s < 0;
    buy.setAttribute('aria-invalid', String(badBuy));
    sell.setAttribute('aria-invalid', String(badSell));
    if (badBuy || badSell) {
      err.textContent = TXT.invalid;
      err.hidden = false;
      neg.hidden = true;
      root.classList.add('is-invalid');
      root.classList.remove('is-negative');
      for (const k of ['f1', 'f2', 'f3']) out[k].textContent = '';
      for (const k of ['r1', 'r2', 'r3', 'full', 'rebu']) out[k].textContent = '–';
      out.fullBar.style.setProperty('--w', '0%');
      out.rebuBar.style.setProperty('--w', '0%');
      return;
    }
    err.hidden = true;
    root.classList.remove('is-invalid');

    const line = { costCents: toCents(b), saleCents: toCents(s), rate };
    const { marginCents, baseCents, quotaCents } = computeLine(line);
    const negative = marginCents <= 0;
    root.classList.toggle('is-negative', marginCents < 0);

    out.f1.textContent = TXT.margin(num(line.saleCents), num(line.costCents));
    out.r1.textContent = fmt(marginCents);
    out.f2.textContent = negative ? TXT.zeroBase : TXT.base(num(marginCents), rate);
    out.r2.textContent = fmt(baseCents);
    out.f3.textContent = negative ? TXT.zeroQuota : TXT.quota(num(baseCents), rate);
    out.r3.textContent = fmt(quotaCents);
    neg.hidden = !(marginCents < 0);

    const fullCents = Math.round((line.saleCents * rate) / (100 + rate));
    out.full.textContent = fmt(fullCents);
    out.rebu.textContent = fmt(quotaCents);
    const top = Math.max(fullCents, quotaCents, 1);
    out.fullBar.style.setProperty('--w', `${(fullCents / top) * 100}%`);
    out.rebuBar.style.setProperty('--w', `${(quotaCents / top) * 100}%`);
    pulse();
  };

  [buy, sell].forEach((input) => {
    input.addEventListener('input', render);
    input.addEventListener('focus', () => input.select());
  });
  rateButtons.forEach((btn) => btn.addEventListener('click', () => {
    setRate(Number(btn.dataset.rate));
    presets.forEach((p) => p.setAttribute('aria-pressed', String(p.dataset.buy === buy.value && p.dataset.sell === sell.value && Number(p.dataset.rate) === rate)));
    render();
  }));
  presets.forEach((btn) => btn.addEventListener('click', () => {
    buy.value = btn.dataset.buy;
    sell.value = btn.dataset.sell;
    setRate(Number(btn.dataset.rate));
    presets.forEach((p) => p.setAttribute('aria-pressed', String(p === btn)));
    render();
  }));
  // Typing your own figures means no example is selected any more.
  [buy, sell].forEach((input) => input.addEventListener('input', () => presets.forEach((p) => p.setAttribute('aria-pressed', 'false'))));

  render();
  ready = true;
}
