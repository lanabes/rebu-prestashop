// Página de la guía: la etiqueta interactiva, el índice que sigue la lectura,
// el botón de copiar la consulta y la lista de espera (solo si hay formulario).
import { parseNumber, computeLine, toCents } from './rebu-core.js';

const lang = document.documentElement.lang || 'es';
const money = new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'es-ES', { style: 'currency', currency: 'EUR' });
const fmt = (cents) => money.format(cents / 100);

const TXT = {
  es: {
    full: (v) => `Con el IVA sobre el precio entero serían <strong>${v}</strong>.`,
    negative: 'Margen negativo: la base es 0 y no se compensa con otras ventas.',
    invalid: 'Escribe dos importes, por ejemplo 300 y 450.',
    copied: 'Consulta copiada',
    copyFail: 'No se pudo copiar. Selecciona el texto y cópialo a mano.',
    copy: 'Copiar',
    done: 'Copiada',
  },
  fr: {
    full: (v) => `Avec la TVA sur le prix total, ce serait <strong>${v}</strong>.`,
    negative: 'Marge négative : la base est nulle et ne s’impute pas sur d’autres ventes.',
    invalid: 'Saisissez deux montants, par exemple 300 et 450.',
    copied: 'Requête copiée',
    copyFail: 'Copie impossible. Sélectionnez le texte et copiez-le à la main.',
    copy: 'Copier',
    done: 'Copiée',
  },
}[lang];

// ---------- the tag ----------
const tag = document.getElementById('tag');
if (tag) {
  const buy = document.getElementById('t-buy');
  const sell = document.getElementById('t-sell');
  const out = { margin: document.getElementById('t-margin'), quota: document.getElementById('t-quota'), note: document.getElementById('t-note') };
  const rateButtons = [...tag.querySelectorAll('[data-rate]')];
  let rate = Number(rateButtons.find((b) => b.getAttribute('aria-pressed') === 'true')?.dataset.rate || 21);

  const render = () => {
    const b = parseNumber(buy.value);
    const s = parseNumber(sell.value);
    if (!Number.isFinite(b) || !Number.isFinite(s) || b < 0 || s < 0) {
      out.margin.textContent = '–';
      out.quota.textContent = '–';
      out.note.textContent = TXT.invalid;
      return;
    }
    const line = { saleCents: toCents(s), costCents: toCents(b), rate };
    const { marginCents, quotaCents } = computeLine(line);
    out.margin.textContent = fmt(marginCents);
    out.margin.classList.toggle('neg', marginCents < 0);
    out.quota.textContent = fmt(quotaCents);
    if (marginCents <= 0 && s > 0) out.note.textContent = TXT.negative;
    else {
      const fullCents = Math.round((line.saleCents * rate) / (100 + rate));
      out.note.innerHTML = TXT.full(fmt(fullCents));
    }
  };

  [buy, sell].forEach((input) => {
    input.addEventListener('input', render);
    input.addEventListener('focus', () => input.select());
  });
  rateButtons.forEach((btn) => btn.addEventListener('click', (event) => {
    rate = Number(btn.dataset.rate);
    rateButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    render();
    // A small swing tells the eye the result changed. Never on keyboard activation.
    if (event.detail > 0) {
      tag.classList.remove('swing');
      void tag.offsetWidth;
      tag.classList.add('swing');
    }
  }));
  tag.addEventListener('animationend', (e) => { if (e.animationName === 'tag-swing') tag.classList.remove('swing'); });
  render();
}

// ---------- table of contents that follows the reading ----------
// The current section is the last heading that has passed the top third of the screen.
// Computed on scroll (one frame at a time), so jumps from a link are caught too.
const tocLinks = [...document.querySelectorAll('.toc a')];
if (tocLinks.length) {
  const targets = tocLinks.map((a) => document.querySelector(a.getAttribute('href')));
  let queued = false;
  const update = () => {
    queued = false;
    const line = window.innerHeight * 0.33;
    let current = -1;
    targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top <= line) current = i; });
    tocLinks.forEach((a, i) => {
      if (i === current) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });
  update();
}

// ---------- copy the SQL ----------
const toast = document.getElementById('toast');
let toastTimer;
const say = (text) => {
  if (!toast) return;
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
};
document.querySelectorAll('[data-copy]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const source = document.getElementById(btn.dataset.copy);
    const text = source.textContent.trim();
    const label = btn.querySelector('.lbl');
    try {
      await navigator.clipboard.writeText(text);
      btn.classList.add('done');
      if (label) label.textContent = TXT.done;
      say(TXT.copied);
      setTimeout(() => { btn.classList.remove('done'); if (label) label.textContent = TXT.copy; }, 2400);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(source);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      say(TXT.copyFail);
    }
  });
});
