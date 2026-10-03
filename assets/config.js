// Ajustes de la web que cambian sin tocar el código.
//
// waitlistUrl: enlace al formulario de la lista de espera, uno por idioma.
// - Mientras los dos estén vacíos, la sección «Avísame si sale» no se muestra en
//   ninguna página: un botón que no apunta a nada no se publica.
// - Si solo se rellena uno, las páginas de los dos idiomas usan ese.
// - Solo valen enlaces que empiecen por https://
window.REBU_CONFIG = {
  waitlistUrl: {
    es: 'https://docs.google.com/forms/d/e/1FAIpQLSdbLLjKOhY_TP5YccBAUuVKGT6umtUwacN-IR0goIL2ftUAYQ/viewform',
    fr: 'https://docs.google.com/forms/d/e/1FAIpQLSfF6aX1J9u-flQ4HsLnMnNoxzOi6b1QkcZaFJ7-4gtdFEcx8g/viewform',
  },
};
