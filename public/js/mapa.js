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
// Mapbox GL JS no es un módulo ES: se añade como <script> y define window.mapboxgl.
const MAPBOX_JS_URL = 'https://api.mapbox.com/mapbox-gl-js/v3.12.0/mapbox-gl.js';
// Su CSS se añade también desde aquí: en el <head> bloquearía la primera pantalla (K07).
const MAPBOX_CSS_URL = 'https://api.mapbox.com/mapbox-gl-js/v3.12.0/mapbox-gl.css';
// Estilo Standard de Mapbox con el tema "Faded" y luz de atardecer (elección de Lucía).
// Con edificios 3D, para ver el edificio de la biblioteca al entrar (Lucía, 22-11). Sin iconos de
// comercios y transporte: pesan al cargar en el móvil (K07) y no ayudan a encontrar la biblioteca.
const ESTILO_MAPA = 'mapbox://styles/mapbox/standard';
const CONFIG_ESTILO = {
  basemap: {
    theme: 'faded',
    lightPreset: 'dusk',
    show3dObjects: true,
    showPointOfInterestLabels: false,
    showTransitLabels: false,
  },
};
// Entrada al mapa (Lucía, 22-11): la cámara baja desde una vista plana hasta ISLA Gaia (id 1 en
// datos_ejemplo.sql) inclinada en 3D. Si ISLA no está en la lista, se encuadran todas desde arriba.
const ID_BIBLIOTECA_INICIAL = 1;
const VISTA_PLANA = { zoom: 15, pitch: 0, bearing: 0 };
const VISTA_3D = { zoom: 17, pitch: 60, bearing: -20 };
const DURACION_ENTRADA_MS = 2500;
// Ver el mapa construirse por partes, o mover la cámara mientras aún descarga, da tirones. Por eso,
// tapado por la animación de carga, se descargan las dos vistas (primero la 3D, luego la plana) y
// solo entonces se destapa y se mueve la cámara. Si tarda más de esto, se destapa igualmente.
const ESPERA_MAXIMA_MAPA_MS = 15000;
const MARGEN_ENCUADRE_PX = 64;
const ZOOM_MAXIMO_ENCUADRE = 15;
const TEXTO_PANEL_RECOGIDO = 'Mostrar todas las bibliotecas';
const TEXTO_PANEL_DESPLEGADO = 'Ocultar la lista de bibliotecas';
// Por debajo de esta distancia el gesto en el asa cuenta como toque, no como arrastre.
const UMBRAL_ARRASTRE_PX = 6;
// Valores para --sheet-altura: el CSS los recorta a la altura recogida y a la desplegada.
const ALTURA_PANEL_RECOGIDO = '0px';
const ALTURA_PANEL_DESPLEGADO = '100vh';
const MENSAJE_SIN_CONEXION = 'No se ha podido conectar. Revisa tu conexión e inténtalo de nuevo.';
const MENSAJE_SIN_MAPA = 'No se ha podido cargar el mapa. Aquí tienes la lista de bibliotecas.';

/**
 * Orden pensado para el móvil: la ocupación y el token se piden a la vez, la lista se pinta
 * en cuanto llega la ocupación, y Mapbox (1,5 MB) se descarga mientras tanto, sin bloquearla.
 */
async function init() {
  const mapboxCargado = cargarMapbox();
  // El fallo de Mapbox se trata en crearMapa; esto solo evita el aviso si la página sale antes (401).
  mapboxCargado.catch(() => {});
  const tokenPedido = getConfigMapa().catch((error) => ({ estado: 0, error }));
  const bibliotecas = await cargarOcupacion();
  document.getElementById('bibliotecas-cargando').hidden = true;
  if (bibliotecas === null) return;

  renderLista(bibliotecas);
  const mapa = await crearMapa(bibliotecas, mapboxCargado, tokenPedido);
  iniciarPanel();
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

/** Añade el CSS y el <script> de Mapbox. Se cumple cuando cargan los dos y se rechaza si falla uno. */
function cargarMapbox() {
  const estilos = document.createElement('link');
  estilos.rel = 'stylesheet';
  estilos.href = MAPBOX_CSS_URL;
  const script = document.createElement('script');
  script.src = MAPBOX_JS_URL;
  return Promise.all([cargarEnHead(estilos), cargarEnHead(script)]);
}

function cargarEnHead(elemento) {
  return new Promise((resolver, rechazar) => {
    elemento.addEventListener('load', resolver);
    elemento.addEventListener('error', () => rechazar(new Error(`No se ha podido cargar ${elemento.src ?? elemento.href}`)));
    document.head.append(elemento);
  });
}

/**
 * Asa del panel de bibliotecas: arrastrándola se deja a cualquier altura; un toque (o Intro con
 * el teclado) lo recoge o lo despliega del todo.
 */
function iniciarPanel() {
  const panel = document.getElementById('panel-bibliotecas');
  const boton = document.getElementById('panel-boton');
  const arrastre = { inicioY: 0, alturaInicial: 0, isActivo: false, hasMovido: false };
  escucharArrastre(panel, boton, arrastre);
  escucharToque(panel, boton, arrastre);
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
    if (arrastre.hasMovido) panel.style.setProperty('--sheet-altura', `${arrastre.alturaInicial + desplazamiento}px`);
  });
  const terminarArrastre = () => {
    arrastre.isActivo = false;
    panel.classList.remove('sheet--dragging');
    actualizarEstadoPanel(boton, panel.getBoundingClientRect().height > alturaRecogido + 1);
  };
  boton.addEventListener('pointerup', terminarArrastre);
  boton.addEventListener('pointercancel', terminarArrastre);
}

/** Un toque o Intro recoge el panel si está abierto (aunque sea a medias) o lo despliega. */
function escucharToque(panel, boton, arrastre) {
  // Tras un arrastre el navegador también lanza click: ese no cuenta como toque.
  boton.addEventListener('click', () => {
    if (arrastre.hasMovido) {
      arrastre.hasMovido = false;
      return;
    }
    const isDesplegar = boton.getAttribute('aria-expanded') !== 'true';
    panel.style.setProperty('--sheet-altura', isDesplegar ? ALTURA_PANEL_DESPLEGADO : ALTURA_PANEL_RECOGIDO);
    actualizarEstadoPanel(boton, isDesplegar);
  });
}

function actualizarEstadoPanel(boton, isDesplegado) {
  boton.setAttribute('aria-expanded', String(isDesplegado));
  document.getElementById('panel-boton-texto').textContent = isDesplegado
    ? TEXTO_PANEL_DESPLEGADO
    : TEXTO_PANEL_RECOGIDO;
}

/** Crea el mapa en la vista inicial. Devuelve null si no se puede (y lo avisa). */
async function crearMapa(bibliotecas, mapboxCargado, tokenPedido) {
  try {
    const [respuesta] = await Promise.all([tokenPedido, mapboxCargado]);
    if (respuesta.estado !== HTTP_OK || !window.mapboxgl || bibliotecas.length === 0) {
      mostrarSinMapa();
      return null;
    }
    window.mapboxgl.accessToken = respuesta.cuerpo.token;
    const inicial = bibliotecas.find((biblioteca) => biblioteca.id === ID_BIBLIOTECA_INICIAL);
    const mapa = new window.mapboxgl.Map({
      container: 'mapa',
      style: ESTILO_MAPA,
      config: CONFIG_ESTILO,
      ...crearVistaInicial(bibliotecas, inicial),
    });
    if (inicial) {
      prepararEntrada(mapa);
    } else {
      mapa.once('idle', ocultarCargaMapa);
    }
    window.setTimeout(ocultarCargaMapa, ESPERA_MAXIMA_MAPA_MS);
    return mapa;
  } catch (error) {
    console.error(error);
    mostrarSinMapa();
    return null;
  }
}

/** Inclinado sobre la biblioteca inicial; si no está, encuadre de todas. */
function crearVistaInicial(bibliotecas, inicial) {
  if (inicial) {
    return { center: [inicial.longitud, inicial.latitud], ...VISTA_3D };
  }
  return {
    bounds: crearEncuadre(bibliotecas),
    fitBoundsOptions: { padding: MARGEN_ENCUADRE_PX, maxZoom: ZOOM_MAXIMO_ENCUADRE },
  };
}

/**
 * El mapa se crea ya en la vista 3D: cuando está completa ('idle') se salta a la plana y, cuando
 * esa también lo está, se destapa y la cámara baja a la 3D, que ya tiene todo descargado.
 */
function prepararEntrada(mapa) {
  const isSinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (isSinMovimiento) {
    mapa.once('idle', ocultarCargaMapa);
    return;
  }
  mapa.once('idle', () => {
    mapa.jumpTo(VISTA_PLANA);
    mapa.once('idle', () => {
      ocultarCargaMapa();
      mapa.easeTo({ ...VISTA_3D, duration: DURACION_ENTRADA_MS });
    });
  });
}

/** Funde la animación de carga y la quita del todo al acabar. Se puede llamar más de una vez. */
function ocultarCargaMapa() {
  const carga = document.getElementById('mapa-cargando');
  if (carga.hidden || carga.classList.contains('map-loader--oculto')) return;
  carga.addEventListener('transitionend', () => { carga.hidden = true; }, { once: true });
  carga.classList.add('map-loader--oculto');
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
  document.getElementById('mapa-escenario').hidden = true;
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
