// Lista de espera: la sección solo se enseña cuando hay un formulario de verdad detrás
// (enlace en config.js). Un botón que no apunta a nada no se publica.
import { waitlistUrl } from './waitlist-url.js';

const url = waitlistUrl();
const section = document.getElementById('modulo');
if (section && url) {
  const link = document.getElementById('waitlist-link');
  if (link) link.href = url;
  section.hidden = false;
}

// Llamadas en el momento justo (junto a una descarga o un resultado). Abren el
// formulario en otra pestaña para no perder lo que la persona tenía en pantalla.
if (url) {
  document.querySelectorAll('[data-nudge]').forEach((el) => {
    el.querySelectorAll('a[data-nudge-link]').forEach((a) => { a.href = url; });
    el.hidden = false;
  });
}
