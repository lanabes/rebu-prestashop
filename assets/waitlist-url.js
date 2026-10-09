// El enlace de la lista de espera para el idioma de la página, o '' si no hay
// formulario de verdad (config.js). Lo comparten la sección del pie y las llamadas
// que salen en el momento justo (calculadora, plantilla, comprobador).
export function waitlistUrl() {
  const config = (window.REBU_CONFIG && window.REBU_CONFIG.waitlistUrl) || '';
  const lang = document.documentElement.lang === 'fr' ? 'fr' : 'es';
  const other = lang === 'fr' ? 'es' : 'fr';
  const valid = (u) => typeof u === 'string' && /^https:\/\//.test(u);
  // Accepts a single link (string) or one per language ({ es, fr }).
  return typeof config === 'string' ? (valid(config) ? config : '') : [config[lang], config[other]].find(valid) || '';
}
