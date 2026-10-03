// Lista de espera: la sección solo se enseña cuando hay un formulario de verdad detrás
// (enlace en config.js). Un botón que no apunta a nada no se publica.
const config = (window.REBU_CONFIG && window.REBU_CONFIG.waitlistUrl) || '';
const lang = document.documentElement.lang === 'fr' ? 'fr' : 'es';
const other = lang === 'fr' ? 'es' : 'fr';
const valid = (u) => typeof u === 'string' && /^https:\/\//.test(u);
// Accepts a single link (string) or one per language ({ es, fr }).
const url = typeof config === 'string'
  ? config
  : [config[lang], config[other]].find(valid) || '';
const section = document.getElementById('modulo');
if (section && valid(url)) {
  const link = document.getElementById('waitlist-link');
  if (link) link.href = url;
  section.hidden = false;
}
