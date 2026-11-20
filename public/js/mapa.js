/*
 * Pantalla principal con el mapa de bibliotecas (wireframe 2A, US03).
 * Cada biblioteca aparece en el mapa con su % de ocupación y en la lista de abajo con su
 * barra y su fiabilidad. Los datos se piden de nuevo cada 60 s (criterio: datos de < 60 s).
 * Si el mapa no carga (sin token, sin conexión con Mapbox), la lista sigue funcionando sola.
 */
import { getConfigMapa, getOcupacion } from './api.js';
import { MENSAJE_ERROR_GENERICO, mostrarAlerta } from './formulario.js';
import {
  CLASES_NIVEL,
  crearBarraOcupacion,
  getNivelOcupacion,
  getTextoActualizado,
  getTextoFiabilidad,
} from './ocupacion.js';
import { RUTA_LOGIN, crearRutaBiblioteca } from './rutas.js';

const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;
const INTERVALO_REFRESCO_MS = 60 * 1000;
// Estilo Standard de Mapbox con el tema "Faded" y luz de atardecer (elección de Lucía).
const ESTILO_MAPA = 'mapbox://styles/mapbox/standard';
const CONFIG_ESTILO = { basemap: { theme: 'faded', lightPreset: 'dusk' } };
const MARGEN_ENCUADRE_PX = 64;
const ZOOM_MAXIMO_ENCUADRE = 15;
const MENSAJE_SIN_CONEXION = 'No se ha podido conectar. Revisa tu conexión e inténtalo de nuevo.';
const MENSAJE_SIN_MAPA = 'No se ha podido cargar el mapa. Aquí tienes la lista de bibliotecas.';

async function init() {
  const bibliotecas = await cargarOcupacion();
  document.getElementById('bibliotecas-cargando').hidden = true;
  if (bibliotecas === null) return;

  renderLista(bibliotecas);
  const mapa = await crearMapa(bibliotecas);
  const marcadores = new Map();
  if (mapa) pintarMarcadores(mapa, marcadores, bibliotecas);

  window.setInterval(async () => {
    const nuevas = await cargarOcupacion();
    if (nuevas === null) return;
    renderLista(nuevas);
    if (mapa) pintarMarcadores(mapa, marcadores, nuevas);
  }, INTERVALO_REFRESCO_MS);
}

/** Pide la ocupación. Devuelve la lista de bibliotecas, o null si hubo un error (ya avisado). */
async function cargarOcupacion() {
  const alerta = document.getElementById('mapa-alerta');
  try {
    const respuesta = await getOcupacion();
    if (respuesta.estado === HTTP_UNAUTHORIZED) {
      window.location.assign(RUTA_LOGIN);
      return null;
    }
    if (respuesta.estado !== HTTP_OK) {
      mostrarAlerta(alerta, respuesta.cuerpo.error ?? MENSAJE_ERROR_GENERICO);
      return null;
    }
    mostrarAlerta(alerta, '');
    return respuesta.cuerpo.bibliotecas;
  } catch (error) {
    console.error(error);
    mostrarAlerta(alerta, MENSAJE_SIN_CONEXION);
    return null;
  }
}

function renderLista(bibliotecas) {
  document.getElementById('lista-bibliotecas').replaceChildren(...bibliotecas.map(crearItemBiblioteca));
  const cargadoEn = Date.now();
  document.getElementById('bibliotecas-actualizado').textContent = getTextoActualizado(cargadoEn);
}

function crearItemBiblioteca({ id, nombre, ocupacion, fiabilidad }) {
  const enlace = document.createElement('a');
  enlace.className = 'library-list__link';
  enlace.href = crearRutaBiblioteca(id);
  enlace.append(
    crearTexto('library-list__name', nombre),
    crearTexto('library-list__value', `${ocupacion} %`),
    crearBarraOcupacion(ocupacion),
    crearTexto('library-list__detail', `${getNivelOcupacion(ocupacion).texto} · Fiabilidad ${getTextoFiabilidad(fiabilidad).toLowerCase()}`),
  );
  const item = document.createElement('li');
  item.append(enlace);
  return item;
}

function crearTexto(clase, texto) {
  const elemento = document.createElement('span');
  elemento.className = clase;
  elemento.textContent = texto;
  return elemento;
}

/** Crea el mapa encuadrando todas las bibliotecas. Devuelve null si no se puede (y lo avisa). */
async function crearMapa(bibliotecas) {
  try {
    const respuesta = await getConfigMapa();
    if (respuesta.estado !== HTTP_OK || !window.mapboxgl || bibliotecas.length === 0) {
      mostrarSinMapa();
      return null;
    }
    window.mapboxgl.accessToken = respuesta.cuerpo.token;
    return new window.mapboxgl.Map({
      container: 'mapa',
      style: ESTILO_MAPA,
      config: CONFIG_ESTILO,
      bounds: crearEncuadre(bibliotecas),
      fitBoundsOptions: { padding: MARGEN_ENCUADRE_PX, maxZoom: ZOOM_MAXIMO_ENCUADRE },
    });
  } catch (error) {
    console.error(error);
    mostrarSinMapa();
    return null;
  }
}

/** [[oeste, sur], [este, norte]] que contiene todas las bibliotecas. */
function crearEncuadre(bibliotecas) {
  const longitudes = bibliotecas.map((biblioteca) => biblioteca.longitud);
  const latitudes = bibliotecas.map((biblioteca) => biblioteca.latitud);
  return [
    [Math.min(...longitudes), Math.min(...latitudes)],
    [Math.max(...longitudes), Math.max(...latitudes)],
  ];
}

function mostrarSinMapa() {
  document.getElementById('mapa').hidden = true;
  document.getElementById('panel-bibliotecas').classList.add('sheet--full');
  mostrarAlerta(document.getElementById('mapa-alerta'), MENSAJE_SIN_MAPA);
}

/** Crea un globo por biblioteca, o actualiza el que ya hay (al refrescar). */
function pintarMarcadores(mapa, marcadores, bibliotecas) {
  bibliotecas.forEach((biblioteca) => {
    const existente = marcadores.get(biblioteca.id);
    if (existente) {
      actualizarGlobo(existente.getElement(), biblioteca);
      return;
    }
    const globo = document.createElement('a');
    actualizarGlobo(globo, biblioteca);
    const marcador = new window.mapboxgl.Marker({ element: globo })
      .setLngLat([biblioteca.longitud, biblioteca.latitud])
      .addTo(mapa);
    marcadores.set(biblioteca.id, marcador);
  });
}

// classList y no className: Mapbox añade sus propias clases al elemento del marcador.
function actualizarGlobo(globo, { id, nombre, ocupacion, fiabilidad }) {
  globo.classList.remove(...CLASES_NIVEL);
  globo.classList.add('map-pin', getNivelOcupacion(ocupacion).clase);
  globo.href = crearRutaBiblioteca(id);
  globo.textContent = `${ocupacion} %`;
  globo.setAttribute(
    'aria-label',
    `${nombre}: ${ocupacion} % de ocupación, fiabilidad ${getTextoFiabilidad(fiabilidad).toLowerCase()}`,
  );
}

init();
