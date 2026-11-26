/*
 * Panel inferior de la pantalla del mapa (lista de bibliotecas y tarjeta de una biblioteca).
 * Se arrastra por el asa a cualquier altura; un toque (o Intro con el teclado) lo recoge o lo
 * despliega del todo. La altura se pasa al CSS en --sheet-altura y clamp() la deja entre la
 * altura recogida y la desplegada.
 * Como en Mapas de iOS, bajándolo más allá de recogido se minimiza: solo quedan el asa y el
 * buscador flotando sobre el mapa. Tocando o subiendo el asa (o al ir a escribir) vuelve la lista.
 */
const TEXTO_PANEL_RECOGIDO = 'Mostrar todas las bibliotecas';
const TEXTO_PANEL_DESPLEGADO = 'Ocultar la lista de bibliotecas';
// Por debajo de esta distancia el gesto en el asa cuenta como toque, no como arrastre.
const UMBRAL_ARRASTRE_PX = 6;
// Lo que hay que bajar el panel por debajo de recogido (o subir el asa estando minimizado) para
// minimizarlo (o volver a abrirlo).
const UMBRAL_MINIMIZAR_PX = 40;
const CLASE_MINIMIZADO = 'sheet--minimizado';
// Si la transición de altura no avisa al acabar (p. ej. la altura no cambia), no se espera más.
// Holgado: en un móvil lento la transición de 250 ms puede tardar bastante más en terminar.
const ESPERA_MAXIMA_TRANSICION_MS = 1000;

/** Alturas con nombre para ajustarPanel (valores de --sheet-altura). */
export const ALTURA_PANEL = Object.freeze({
  recogido: '0px',
  desplegado: '100vh',
  tarjeta: 'var(--sheet-card-height)',
});

export function iniciarPanel() {
  const panel = document.getElementById('panel-bibliotecas');
  const boton = document.getElementById('panel-boton');
  const arrastre = { inicioY: 0, alturaInicial: 0, isActivo: false, hasMovido: false };
  escucharArrastre(panel, boton, arrastre);
  escucharToque(panel, boton, arrastre);
}

/**
 * Pone el panel a una de las alturas de ALTURA_PANEL. La promesa se cumple cuando termina la
 * animación, para medir lo que tapa del mapa ya con su altura final.
 */
export function ajustarPanel(altura) {
  const panel = document.getElementById('panel-bibliotecas');
  // Ya está a esa altura (p. ej. otra biblioteca con la tarjeta abierta): no hay nada que esperar.
  const isMinimizado = panel.classList.contains(CLASE_MINIMIZADO);
  panel.classList.remove(CLASE_MINIMIZADO);
  if (!isMinimizado && panel.style.getPropertyValue('--sheet-altura') === altura) return Promise.resolve();
  const terminada = new Promise((resolver) => {
    // El buscador y las barras de dentro también tienen transición: solo cuenta la del panel.
    const alTerminar = (evento) => {
      if (evento.target !== panel) return;
      panel.removeEventListener('transitionend', alTerminar);
      resolver();
    };
    panel.addEventListener('transitionend', alTerminar);
    window.setTimeout(resolver, ESPERA_MAXIMA_TRANSICION_MS);
  });
  panel.style.setProperty('--sheet-altura', altura);
  actualizarEstadoPanel(altura !== ALTURA_PANEL.recogido);
  return terminada;
}

/** Píxeles del mapa que tapa ahora el panel (para centrar la biblioteca en la parte visible). */
export function getAlturaTapada() {
  const mapa = document.getElementById('mapa-escenario').getBoundingClientRect();
  const panel = document.getElementById('panel-bibliotecas').getBoundingClientRect();
  return Math.max(0, mapa.bottom - panel.top);
}

/** Mientras se arrastra el asa, el panel sigue al dedo (o al ratón). */
function escucharArrastre(panel, boton, arrastre) {
  const alturaRecogido = panel.getBoundingClientRect().height;
  boton.addEventListener('pointerdown', (evento) => {
    const alturaInicial = panel.getBoundingClientRect().height;
    Object.assign(arrastre, { inicioY: evento.clientY, alturaInicial, isActivo: true, hasMovido: false });
    boton.setPointerCapture(evento.pointerId);
    panel.classList.add('sheet--dragging');
  });
  boton.addEventListener('pointermove', (evento) => {
    if (!arrastre.isActivo) return;
    const desplazamiento = arrastre.inicioY - evento.clientY;
    if (Math.abs(desplazamiento) >= UMBRAL_ARRASTRE_PX) arrastre.hasMovido = true;
    if (panel.classList.contains(CLASE_MINIMIZADO)) {
      reabrirSiSube(panel, arrastre, desplazamiento);
      return;
    }
    if (arrastre.hasMovido) panel.style.setProperty('--sheet-altura', `${arrastre.alturaInicial + desplazamiento}px`);
  });
  const terminarArrastre = (evento) => soltarPanel(panel, arrastre, alturaRecogido, evento.clientY);
  boton.addEventListener('pointerup', terminarArrastre);
  boton.addEventListener('pointercancel', terminarArrastre);
}

/** Minimizado: subir el asa vuelve a abrir la lista (recogida) y ahí acaba el gesto. */
function reabrirSiSube(panel, arrastre, desplazamiento) {
  if (desplazamiento < UMBRAL_MINIMIZAR_PX) return;
  arrastre.isActivo = false;
  panel.classList.remove('sheet--dragging');
  ajustarPanel(ALTURA_PANEL.recogido);
}

/** Al soltar el asa: si se bajó bastante por debajo de recogido, se minimiza. */
function soltarPanel(panel, arrastre, alturaRecogido, finY) {
  if (!arrastre.isActivo) return;
  arrastre.isActivo = false;
  panel.classList.remove('sheet--dragging');
  // clamp() no deja que el panel baje de recogido: se mira hasta dónde quiso llevarlo el dedo.
  const alturaPedida = arrastre.alturaInicial + arrastre.inicioY - finY;
  if (arrastre.hasMovido && alturaPedida < alturaRecogido - UMBRAL_MINIMIZAR_PX) {
    minimizarPanel(panel);
    return;
  }
  actualizarEstadoPanel(panel.getBoundingClientRect().height > alturaRecogido + 1);
}

/** Un toque o Intro recoge el panel si está abierto (aunque sea a medias) o lo despliega. */
function escucharToque(panel, boton, arrastre) {
  // Tras un arrastre el navegador también lanza click: ese no cuenta como toque.
  boton.addEventListener('click', () => {
    if (arrastre.hasMovido) {
      arrastre.hasMovido = false;
      return;
    }
    if (panel.classList.contains(CLASE_MINIMIZADO)) {
      ajustarPanel(ALTURA_PANEL.recogido);
      return;
    }
    const isDesplegar = boton.getAttribute('aria-expanded') !== 'true';
    ajustarPanel(isDesplegar ? ALTURA_PANEL.desplegado : ALTURA_PANEL.recogido);
  });
}

function minimizarPanel(panel) {
  panel.style.setProperty('--sheet-altura', ALTURA_PANEL.recogido);
  panel.classList.add(CLASE_MINIMIZADO);
  actualizarEstadoPanel(false);
}

function actualizarEstadoPanel(isDesplegado) {
  document.getElementById('panel-boton').setAttribute('aria-expanded', String(isDesplegado));
  document.getElementById('panel-boton-texto').textContent = isDesplegado
    ? TEXTO_PANEL_DESPLEGADO
    : TEXTO_PANEL_RECOGIDO;
}
