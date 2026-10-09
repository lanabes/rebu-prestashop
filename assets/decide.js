// «¿Puede ir esta pieza por el REBU / la marge?»: dos preguntas (qué es y a quién se
// compró) y una respuesta con su artículo. Solo orienta: la página lo dice al lado.
const lang = document.documentElement.lang === 'fr' ? 'fr' : 'es';

const TXT = {
  es: {
    pending: { tone: 'idle', title: 'Elige una respuesta en cada pregunta', body: 'La respuesta sale aquí, con el artículo de la ley en el que se apoya.' },
    excluded: { tone: 'no', title: 'No: a efectos del REBU no es un bien usado', body: 'La ley deja fuera el oro, el platino, las piedras preciosas, los materiales de recuperación, los envases y embalajes, y lo que el propio revendedor ha usado, transformado o renovado (Ley del IVA, artículo 136.Uno.1.º).' },
    yes: { tone: 'yes', title: 'Sí, puede ir por el REBU', body: 'Esa compra es de las que permiten el régimen (Ley del IVA, artículo 135.Uno). Pagas el IVA solo sobre el margen, la factura no lo desglosa y lleva la mención.' },
    yesArt: { tone: 'yes', title: 'Sí, por el mismo régimen, con su propia mención', body: 'Los objetos de arte, las antigüedades (más de cien años) y los objetos de colección van por el mismo régimen especial (artículos 135 y 136), pero la factura lleva su mención: «Régimen especial de los objetos de arte» o «de las antigüedades y objetos de colección».' },
    general: { tone: 'no', title: 'No: va por el régimen general', body: 'Si te la vendió una empresa o autónomo con el IVA desglosado, esa compra no está entre las que permiten el REBU (artículo 135.Uno). Deduces el IVA de la compra y cobras IVA sobre el precio entero.' },
    other: { tone: 'maybe', title: 'Depende: pregúntale a tu asesor', body: 'Hay más casos en la ley, como compras a empresas de otro país de la UE acogidas a la franquicia del IVA o compras exentas por el artículo 20.Uno.24.º y 25.º. Con los datos de tu caso, tu asesor te dirá si entra.' },
    opt: 'Aunque pueda ir por el REBU, en cada venta puedes elegir el régimen general y deducir el IVA de la compra (artículo 135.Dos).',
  },
  fr: {
    pending: { tone: 'idle', title: 'Choisissez une réponse à chaque question', body: 'La réponse s’affiche ici, avec l’article sur lequel elle s’appuie.' },
    excluded: { tone: 'no', title: 'Non : ce n’est pas un bien d’occasion au sens du régime', body: 'La définition exclut les métaux précieux et les pierres précieuses (CGI, annexe III, article 98 A). Les œuvres d’art, objets de collection et d’antiquité relèvent d’une autre catégorie du même régime.' },
    yes: { tone: 'yes', title: 'Oui, la marge peut s’appliquer', body: 'Le bien vous a été livré par un non-redevable de la TVA ou par une personne qui n’était pas autorisée à facturer la TVA sur cette vente (article 297 A du CGI ; BOFiP BOI-TVA-SECT-90-20-20, § 60 à 80). La TVA porte sur la marge et n’apparaît pas sur la facture.' },
    yesArt: { tone: 'yes', title: 'Oui, le même régime, avec sa propre mention', body: 'Les œuvres d’art, objets de collection et objets d’antiquité (plus de cent ans) relèvent du même régime (article 297 A du CGI ; annexe III, article 98 A), avec leur mention : « Régime particulier-Objets d’art » ou « Objets de collection et d’antiquité ».' },
    general: { tone: 'no', title: 'Non : c’est le régime normal', body: 'Si le vendeur vous a facturé la TVA sur cette vente, la condition de l’article 297 A n’est pas remplie. Vous déduisez la TVA d’achat et facturez la TVA sur le prix total.' },
    other: { tone: 'maybe', title: 'Cela dépend : voyez avec votre expert-comptable', body: 'Le critère est de savoir si votre vendeur était redevable de la TVA et autorisé à la facturer sur cette vente. Avec les éléments de votre cas, votre expert-comptable tranchera.' },
    opt: 'Même si la marge s’applique, vous pouvez choisir le régime normal pour chaque vente et déduire la TVA d’achat (article 297 C du CGI).',
  },
}[lang];

const root = document.getElementById('decide');
if (root) {
  const out = {
    box: document.getElementById('d-result'),
    title: document.getElementById('d-title'),
    body: document.getElementById('d-body'),
    opt: document.getElementById('d-opt'),
  };
  let ready = false;
  const value = (name) => root.querySelector(`input[name="${name}"]:checked`)?.value || null;

  const render = () => {
    const what = value('d-what');
    const from = value('d-from');
    let r = TXT.pending;
    if (what === 'excluded') r = TXT.excluded;
    else if (what && from) {
      if (from === 'general') r = TXT.general;
      else if (from === 'other') r = TXT.other;
      else r = what === 'art' ? TXT.yesArt : TXT.yes;
    }
    // A short settle tells the eye the answer changed; nothing moves on load.
    if (ready && out.title.textContent !== r.title) {
      out.box.classList.remove('tick');
      void out.box.offsetWidth;
      out.box.classList.add('tick');
    }
    out.box.dataset.tone = r.tone;
    out.title.textContent = r.title;
    out.body.textContent = r.body;
    const showOpt = Boolean(TXT.opt) && (r === TXT.yes || r === TXT.yesArt);
    out.opt.hidden = !showOpt;
    if (showOpt) out.opt.textContent = TXT.opt;
  };

  root.addEventListener('change', render);
  render();
  ready = true;
}
