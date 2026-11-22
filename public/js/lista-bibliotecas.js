/*
 * Panel de la pantalla del mapa: lista de bibliotecas (tu favorita primero y luego de más vacía a
 * más llena), buscador por
 * nombre o dirección y tarjeta de la biblioteca elegida en la lista o en el mapa.
 * El filtro se hace aquí, en el navegador: la lista ya trae todas las bibliotecas.
 */
import { crearBarraOcupacion, getNivelOcupacion, getTextoActualizado, getTextoFiabilidad } from './ocupacion.js';
import { ALTURA_PANEL, ajustarPanel } from './panel.js';
import { crearRutaBiblioteca } from './rutas.js';

const TEXTO_FAVORITA = 'Favorita';
const SVG_NS = 'http://www.w3.org/2000/svg';
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

/** Tu favorita primero; después, de más vacía a más llena (lo útil para decidir a dónde ir). */
function ordenarBibliotecas(bibliotecas, favoritaId) {
  return [...bibliotecas].sort((a, b) => (b.id === favoritaId) - (a.id === favoritaId)
    || a.ocupacion - b.ocupacion
    || a.nombre.localeCompare(b.nombre, 'es'));
}

function mostrarSinResultados(consulta) {
  const aviso = document.getElementById('busqueda-vacia');
  aviso.hidden = consulta === '';
  aviso.textContent = consulta === '' ? '' : `No hay bibliotecas que coincidan con «${consulta}».`;
}

function crearItemBiblioteca(biblioteca, { isFavorita, onSeleccionar }) {
  const { id, nombre, ocupacion, fiabilidad } = biblioteca;
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'library-list__link';
  boton.addEventListener('click', () => onSeleccionar(id));
  if (isFavorita) boton.append(crearEtiquetaFavorita());
  boton.append(
    crearTexto('library-list__name', nombre),
    crearTexto('library-list__value', `${ocupacion} %`),
    crearBarraOcupacion(ocupacion),
    crearTexto('library-list__detail', getTextoEstado(ocupacion, fiabilidad)),
  );
  const item = document.createElement('li');
  item.append(boton);
  return item;
}

/** "★ Favorita", encima del nombre de la favorita. */
function crearEtiquetaFavorita() {
  const estrella = document.createElementNS(SVG_NS, 'svg');
  estrella.setAttribute('class', 'library-list__favorite-icon');
  estrella.setAttribute('viewBox', '0 0 24 24');
  estrella.setAttribute('aria-hidden', 'true');
  const forma = document.createElementNS(SVG_NS, 'path');
  forma.setAttribute('d', RUTA_ESTRELLA);
  estrella.append(forma);
  const etiqueta = crearTexto('library-list__favorite', TEXTO_FAVORITA);
  etiqueta.prepend(estrella);
  return etiqueta;
}

function rellenarTarjeta({ id, nombre, direccion, ocupacion, fiabilidad }) {
  document.getElementById('tarjeta-nombre').textContent = nombre;
  document.getElementById('tarjeta-direccion').textContent = direccion;
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
