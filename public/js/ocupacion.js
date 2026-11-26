/*
 * Cómo se muestra la ocupación (US03), compartido por el mapa y el detalle de biblioteca.
 * Los números los calcula el servidor; aquí solo se eligen textos y colores.
 */

// Por debajo de 40 % la biblioteca está tranquila; desde 70 %, muy llena.
const UMBRAL_NIVEL_MEDIO = 40;
const UMBRAL_NIVEL_ALTO = 70;
const SEGUNDOS_POR_MINUTO = 60;
const SVG_NS = 'http://www.w3.org/2000/svg';
// Anillo dibujado en un SVG de 40×40: radio 16 deja sitio al grosor del trazo.
const RADIO_ANILLO = 16;

const TEXTOS_FIABILIDAD = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
};

const NIVEL_BAJO = { clase: 'nivel--bajo', texto: 'Tranquila' };
const NIVEL_MEDIO = { clase: 'nivel--medio', texto: 'Bastante gente' };
const NIVEL_ALTO = { clase: 'nivel--alto', texto: 'Muy llena' };
// Cerrada ahora (US08): gris, sin %. Va en la misma lista para poder quitarla al cambiar de estado.
export const CLASE_CERRADA = 'nivel--cerrada';
export const CLASES_NIVEL = [NIVEL_BAJO.clase, NIVEL_MEDIO.clase, NIVEL_ALTO.clase, CLASE_CERRADA];

// Estado de apertura que calcula el servidor con la hora de Portugal (api/ocupacion.php).
const ESTADO_ABIERTA = 'abierta';
const ESTADO_ABRE_HOY = 'abre_hoy';
const TEXTO_SIN_HORARIO = 'Horario no disponible';

/** Nivel de ocupación: { clase CSS (color), texto }. */
export function getNivelOcupacion(porcentaje) {
  if (porcentaje >= UMBRAL_NIVEL_ALTO) return NIVEL_ALTO;
  if (porcentaje >= UMBRAL_NIVEL_MEDIO) return NIVEL_MEDIO;
  return NIVEL_BAJO;
}

/** true si se sabe que está cerrada ahora (aún no ha abierto, ya cerró o no abre hoy). Sin horario, no. */
export function isCerrada(estadoApertura) {
  return estadoApertura !== null && estadoApertura !== undefined && estadoApertura !== ESTADO_ABIERTA;
}

/**
 * Horario de hoy como en Apple Maps: { estado: "Abierta" | "Cerrada" | "Cerrada hoy" | "", detalle }.
 * Ejemplos: Abierta · Cierra a las 21:00 · Cerrada · Abre a las 10:00 · Cerrada hoy · Navidad.
 */
export function getTextoApertura(horario, estadoApertura) {
  if (!horario || !estadoApertura) return { estado: '', detalle: TEXTO_SIN_HORARIO };
  const motivo = horario.motivo ? ` · ${horario.motivo}` : '';
  if (estadoApertura === ESTADO_ABIERTA) return { estado: 'Abierta', detalle: `Cierra a las ${horario.cierre}${motivo}` };
  if (estadoApertura === ESTADO_ABRE_HOY) return { estado: 'Cerrada', detalle: `Abre a las ${horario.apertura}${motivo}` };
  if (horario.cerrado) return { estado: 'Cerrada hoy', detalle: horario.motivo ?? '' };
  return { estado: 'Cerrada', detalle: `Hoy de ${horario.apertura} a ${horario.cierre}${motivo}` };
}

/** El mismo texto en una línea: "Abierta · Cierra a las 21:00". */
export function getLineaApertura(horario, estadoApertura) {
  const { estado, detalle } = getTextoApertura(horario, estadoApertura);
  return [estado, detalle].filter(Boolean).join(' · ');
}

/** Rellena un <p> con el estado en color (verde abierta, rojo cerrada) y el detalle en gris. */
export function pintarApertura(elemento, horario, estadoApertura) {
  const { estado, detalle } = getTextoApertura(horario, estadoApertura);
  const partes = [];
  if (estado) {
    const etiqueta = document.createElement('span');
    etiqueta.className = isCerrada(estadoApertura) ? 'apertura__estado apertura__estado--cerrada' : 'apertura__estado';
    etiqueta.textContent = estado;
    partes.push(etiqueta);
  }
  if (detalle) partes.push(estado ? ` · ${detalle}` : detalle);
  elemento.replaceChildren(...partes);
}

export function getTextoFiabilidad(fiabilidad) {
  return TEXTOS_FIABILIDAD[fiabilidad] ?? '';
}

/** Barra de ocupación: el ancho se pasa al CSS con la variable --valor. */
export function crearBarraOcupacion(porcentaje) {
  const barra = document.createElement('span');
  barra.className = `meter ${getNivelOcupacion(porcentaje).clase}`;
  const relleno = document.createElement('span');
  relleno.className = 'meter__fill';
  relleno.style.setProperty('--valor', `${porcentaje}%`);
  barra.append(relleno);
  return barra;
}

/**
 * Anillo de ocupación (globo del mapa y filas de la lista): pista + progreso. El % se pasa al CSS
 * con la variable --ocupacion en el elemento que lo contiene.
 */
export function crearAnilloOcupacion() {
  const anillo = crearElementoSvg('svg', { class: 'ring', viewBox: '0 0 40 40', 'aria-hidden': 'true' });
  anillo.append(
    crearElementoSvg('circle', { class: 'ring__track', cx: 20, cy: 20, r: RADIO_ANILLO }),
    crearElementoSvg('circle', { class: 'ring__progress', cx: 20, cy: 20, r: RADIO_ANILLO, pathLength: 100 }),
  );
  return anillo;
}

export function crearElementoSvg(etiqueta, atributos) {
  const elemento = document.createElementNS(SVG_NS, etiqueta);
  Object.entries(atributos).forEach(([nombre, valor]) => elemento.setAttribute(nombre, valor));
  return elemento;
}

/** "Actualizado ahora" / "Actualizado hace 3 min" a partir de la hora de la última carga. */
export function getTextoActualizado(desde) {
  const minutos = Math.floor((Date.now() - desde) / 1000 / SEGUNDOS_POR_MINUTO);
  return minutos < 1 ? 'Actualizado ahora' : `Actualizado hace ${minutos} min`;
}
