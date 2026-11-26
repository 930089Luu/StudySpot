/*
 * Panel de la pantalla del mapa: lista de bibliotecas (tu favorita primero y luego de más vacía a
 * más llena), buscador por nombre o dirección y tarjeta de la biblioteca elegida en la lista o en
 * el mapa. Filas al estilo de Apple Maps: anillo de ocupación, nombre y una línea gris.
 * El filtro se hace aquí, en el navegador: la lista ya trae todas las bibliotecas.
 */
import {
  CLASE_CERRADA,
  crearAnilloOcupacion,
  crearBarraOcupacion,
  crearElementoSvg,
  getLineaApertura,
  getNivelOcupacion,
  getTextoActualizado,
  getTextoFiabilidad,
  isCerrada,
  pintarApertura,
} from './ocupacion.js';
import { ALTURA_PANEL, ajustarPanel } from './panel.js';
import { crearRutaBiblioteca } from './rutas.js';

// En la lista sobra repetir "Biblioteca" en cada fila (en la tarjeta y el detalle sí va entero).
const PREFIJO_NOMBRE = /^Biblioteca\s+/i;
// La misma estrella que el botón del detalle (biblioteca.html).
const RUTA_ESTRELLA = 'M12 3.5l2.6 5.3 5.9.9-4.25 4.15 1 5.85L12 16.9l-5.25 2.8 1-5.85L3.5 9.7l5.9-.9z';

/**
 * estado: { bibliotecas, favoritaId, seleccionadaId } (lo comparte con mapa.js).
 * onSeleccionar(id): al tocar una biblioteca de la lista. onVolver(): al cerrar la tarjeta.
 */
export function iniciarLista(estado, { onSeleccionar, onVolver }) {
  const buscador = document.getElementById('buscar-biblioteca');
  buscador.addEventListener('input', () => actualizarLista(estado, onSeleccionar));
  // Al ir a escribir, la lista sube para que se vean los resultados por encima del teclado.
  buscador.addEventListener('focus', () => ajustarPanel(ALTURA_PANEL.desplegado));
  // "Buscar" en el teclado del móvil: no recarga la página, solo cierra el teclado.
  buscador.form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    buscador.blur();
  });
  document.getElementById('tarjeta-cerrar').addEventListener('click', onVolver);
}

/** Pinta la lista filtrada y ordenada, y refresca la tarjeta si hay una biblioteca elegida. */
export function actualizarLista(estado, onSeleccionar) {
  const consulta = document.getElementById('buscar-biblioteca').value;
  const visibles = ordenarBibliotecas(filtrarBibliotecas(estado.bibliotecas, consulta), estado.favoritaId);
  document.getElementById('lista-bibliotecas').replaceChildren(...visibles.map((biblioteca) =>
    crearItemBiblioteca(biblioteca, { isFavorita: biblioteca.id === estado.favoritaId, onSeleccionar })));
  mostrarSinResultados(visibles.length === 0 ? consulta.trim() : '');
  document.getElementById('bibliotecas-actualizado').textContent = getTextoActualizado(Date.now());
  const seleccionada = estado.bibliotecas.find((biblioteca) => biblioteca.id === estado.seleccionadaId);
  if (seleccionada) rellenarTarjeta(seleccionada);
}

/** Cambia la lista por la tarjeta de la biblioteca. */
export function mostrarTarjeta(biblioteca) {
  rellenarTarjeta(biblioteca);
  document.getElementById('panel-bibliotecas').classList.add('sheet--tarjeta');
  document.getElementById('tarjeta-biblioteca').hidden = false;
}

/** Vuelve de la tarjeta a la lista. */
export function ocultarTarjeta() {
  document.getElementById('panel-bibliotecas').classList.remove('sheet--tarjeta');
  document.getElementById('tarjeta-biblioteca').hidden = true;
}

/** Sin tildes ni mayúsculas: "gaia" encuentra "Gaia" y "publica" encuentra "Pública". */
function normalizar(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function filtrarBibliotecas(bibliotecas, consulta) {
  const buscado = normalizar(consulta);
  if (buscado === '') return bibliotecas;
  return bibliotecas.filter(({ nombre, direccion }) => normalizar(`${nombre} ${direccion}`).includes(buscado));
}

/** Tu favorita primero; después las abiertas, de más vacía a más llena; las cerradas al final. */
function ordenarBibliotecas(bibliotecas, favoritaId) {
  return [...bibliotecas].sort((a, b) => (b.id === favoritaId) - (a.id === favoritaId)
    || isCerrada(a.estado_apertura) - isCerrada(b.estado_apertura)
    || a.ocupacion - b.ocupacion
    || a.nombre.localeCompare(b.nombre, 'es'));
}

function mostrarSinResultados(consulta) {
  const aviso = document.getElementById('busqueda-vacia');
  aviso.hidden = consulta === '';
  aviso.textContent = consulta === '' ? '' : `No hay bibliotecas que coincidan con «${consulta}».`;
}

function crearItemBiblioteca(biblioteca, { isFavorita, onSeleccionar }) {
  const { id, nombre } = biblioteca;
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'library-row';
  boton.setAttribute('aria-label', getEtiquetaFila(biblioteca, isFavorita));
  boton.addEventListener('click', () => onSeleccionar(id));
  const nombreCorto = crearTexto('library-row__name', nombre.replace(PREFIJO_NOMBRE, ''));
  if (isFavorita) nombreCorto.append(crearEstrella());
  const cuerpo = document.createElement('span');
  cuerpo.className = 'library-row__body';
  cuerpo.append(nombreCorto, crearTexto('library-row__meta', getTextoFila(biblioteca)));
  boton.append(crearAnilloFila(biblioteca), cuerpo);
  const item = document.createElement('li');
  item.append(boton);
  return item;
}

/** Anillo con el número dentro, como el globo del mapa pero en claro. Cerrada: gris y sin %. */
function crearAnilloFila({ ocupacion, estado_apertura: estadoApertura }) {
  const cerrada = isCerrada(estadoApertura);
  const anillo = document.createElement('span');
  anillo.className = `library-row__ring ${cerrada ? CLASE_CERRADA : getNivelOcupacion(ocupacion).clase}`;
  anillo.style.setProperty('--ocupacion', cerrada ? 0 : ocupacion);
  anillo.append(crearAnilloOcupacion(), crearTexto('library-row__value', cerrada ? '–' : `${ocupacion}`));
  return anillo;
}

/** Línea gris de la fila: si está cerrada, su horario; si no, cuánta gente hay. */
function getTextoFila({ ocupacion, fiabilidad, horario_hoy: horario, estado_apertura: estadoApertura }) {
  return isCerrada(estadoApertura) ? getLineaApertura(horario, estadoApertura) : getTextoEstado(ocupacion, fiabilidad);
}

/** Lo que lee el lector de pantalla: el número solo del anillo no se entendería. */
function getEtiquetaFila(biblioteca, isFavorita) {
  const { nombre, ocupacion, estado_apertura: estadoApertura } = biblioteca;
  const favorita = isFavorita ? ', tu favorita' : '';
  const porcentaje = isCerrada(estadoApertura) ? '' : `${ocupacion} % de ocupación, `;
  return `${nombre}${favorita}: ${porcentaje}${getTextoFila(biblioteca)}`;
}

/** Estrella pequeña junto al nombre de la favorita. */
function crearEstrella() {
  const estrella = crearElementoSvg('svg', { class: 'library-row__star', viewBox: '0 0 24 24', 'aria-hidden': 'true' });
  estrella.append(crearElementoSvg('path', { d: RUTA_ESTRELLA }));
  return estrella;
}

function rellenarTarjeta({ id, nombre, direccion, ocupacion, fiabilidad, horario_hoy: horario, estado_apertura: estadoApertura }) {
  document.getElementById('tarjeta-nombre').textContent = nombre;
  document.getElementById('tarjeta-direccion').textContent = direccion;
  // Horario de hoy en la tarjeta: para saber si está abierta no hace falta entrar al detalle.
  pintarApertura(document.getElementById('tarjeta-horario'), horario, estadoApertura);
  // Cerrada: no hay ocupación que enseñar.
  document.getElementById('tarjeta-ocupacion').hidden = isCerrada(estadoApertura);
  document.getElementById('tarjeta-valor').textContent = `${ocupacion} %`;
  document.getElementById('tarjeta-barra').replaceChildren(crearBarraOcupacion(ocupacion));
  document.getElementById('tarjeta-estado').textContent = getTextoEstado(ocupacion, fiabilidad);
  document.getElementById('tarjeta-detalle').href = crearRutaBiblioteca(id);
}

function getTextoEstado(ocupacion, fiabilidad) {
  return `${getNivelOcupacion(ocupacion).texto} · Fiabilidad ${getTextoFiabilidad(fiabilidad).toLowerCase()}`;
}

function crearTexto(clase, texto) {
  const elemento = document.createElement('span');
  elemento.className = clase;
  elemento.textContent = texto;
  return elemento;
}
