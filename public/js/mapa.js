/*
 * Pantalla principal con el mapa de bibliotecas (wireframe 2A, US03).
 * Cada biblioteca aparece en el mapa con su % de ocupación y en la lista de abajo con su
 * barra y su fiabilidad. Al tocarla (en el mapa o en la lista) el mapa vuela hasta ella y abajo
 * sale su tarjeta. Los datos se piden de nuevo cada 60 s (criterio: datos de < 60 s).
 * Si el mapa no carga (sin token, sin conexión con Mapbox), la lista sigue funcionando sola.
 */
import { getConfigMapa, getOcupacion, getPerfil } from './api.js';
import { MENSAJE_ERROR_GENERICO, mostrarAlerta } from './formulario.js';
import { getIniciales } from './iniciales.js';
import { actualizarLista, iniciarLista, mostrarTarjeta, ocultarTarjeta } from './lista-bibliotecas.js';
import { CLASES_NIVEL, crearAnilloOcupacion, getNivelOcupacion, getTextoFiabilidad } from './ocupacion.js';
import { ALTURA_PANEL, ajustarPanel, getAlturaTapada, iniciarPanel } from './panel.js';
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
// Entrada al mapa (Lucía, 22-11): la cámara baja desde una vista plana hasta la biblioteca favorita
// del usuario, inclinada en 3D. Sin favorita, se encuadran todas desde arriba y se explica cómo elegirla.
const VISTA_PLANA = { zoom: 15, pitch: 0, bearing: 0 };
const VISTA_3D = { zoom: 17, pitch: 60, bearing: -20 };
const DURACION_ENTRADA_MS = 2500;
// Ver el mapa construirse por partes, o mover la cámara mientras aún descarga, da tirones. Por eso,
// tapado por la animación de carga, se descargan las dos vistas (primero la 3D, luego la plana) y
// solo entonces se destapa y se mueve la cámara. Si tarda más de esto, se destapa igualmente.
const ESPERA_MAXIMA_MAPA_MS = 15000;
const MARGEN_ENCUADRE_PX = 64;
const ZOOM_MAXIMO_ENCUADRE = 15;
// Vuelo hasta la biblioteca elegida (Mapbox lo hace sin animación si el móvil pide menos movimiento).
const DURACION_VUELO_MS = 2000;
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
  mostrarIniciales();
  const datos = await cargarOcupacion();
  document.getElementById('bibliotecas-cargando').hidden = true;
  if (datos === null) return;

  const estado = { seleccionadaId: null, mapa: null, marcadores: new Map() };
  guardarDatos(estado, datos);
  const onSeleccionar = (id) => seleccionarBiblioteca(estado, id);
  iniciarPanel();
  iniciarLista(estado, { onSeleccionar, onVolver: () => volverALista(estado) });
  actualizarLista(estado, onSeleccionar);
  estado.mapa = await crearMapa(estado, mapboxCargado, tokenPedido);
  if (estado.mapa) pintarMarcadores(estado, onSeleccionar);

  window.setInterval(async () => {
    const nuevos = await cargarOcupacion();
    if (nuevos === null) return;
    guardarDatos(estado, nuevos);
    actualizarLista(estado, onSeleccionar);
    if (estado.mapa) pintarMarcadores(estado, onSeleccionar);
  }, INTERVALO_REFRESCO_MS);
}

/** Iniciales en el avatar junto al buscador. Si no llegan, se queda el icono de persona. */
async function mostrarIniciales() {
  try {
    const respuesta = await getPerfil();
    if (respuesta.estado !== HTTP_OK) return;
    const iniciales = document.getElementById('avatar-iniciales');
    iniciales.textContent = getIniciales(respuesta.cuerpo.nombre);
    iniciales.hidden = false;
    // Es un <svg>: no tiene la propiedad hidden de los elementos HTML, hay que poner el atributo.
    document.getElementById('avatar-icono').setAttribute('hidden', '');
  } catch (error) {
    console.error(error);
  }
}

/** Guarda lo que devuelve ocupacion.php; sin favorita, se explica cómo elegirla. */
function guardarDatos(estado, { bibliotecas, favorita_id: favoritaId }) {
  Object.assign(estado, { bibliotecas, favoritaId });
  document.getElementById('aviso-favorita').hidden = favoritaId !== null;
}

/** Biblioteca tocada en el mapa o en la lista: su tarjeta abajo y el mapa vuela hasta ella. */
async function seleccionarBiblioteca(estado, id) {
  const biblioteca = estado.bibliotecas.find((candidata) => candidata.id === id);
  if (!biblioteca) return;
  estado.seleccionadaId = id;
  document.activeElement?.blur?.();
  mostrarTarjeta(biblioteca);
  marcarGloboSeleccionado(estado);
  await ajustarPanel(ALTURA_PANEL.tarjeta);
  estado.mapa?.flyTo({
    center: [biblioteca.longitud, biblioteca.latitud],
    ...VISTA_3D,
    // Centrada en la parte del mapa que no tapa la tarjeta.
    padding: { top: 0, right: 0, left: 0, bottom: getAlturaTapada() },
    duration: DURACION_VUELO_MS,
  });
}

function volverALista(estado) {
  estado.seleccionadaId = null;
  ocultarTarjeta();
  marcarGloboSeleccionado(estado);
  ajustarPanel(ALTURA_PANEL.recogido);
}

/** Pide la ocupación. Devuelve {bibliotecas, favorita_id}, o null si hubo un error (ya avisado). */
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
    return respuesta.cuerpo;
  } catch (error) {
    console.error(error);
    mostrarAlerta(alerta, MENSAJE_SIN_CONEXION);
    return null;
  }
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

/** Crea el mapa en la vista inicial. Devuelve null si no se puede (y lo avisa). */
async function crearMapa({ bibliotecas, favoritaId }, mapboxCargado, tokenPedido) {
  try {
    const [respuesta] = await Promise.all([tokenPedido, mapboxCargado]);
    if (respuesta.estado !== HTTP_OK || !window.mapboxgl || bibliotecas.length === 0) {
      mostrarSinMapa();
      return null;
    }
    window.mapboxgl.accessToken = respuesta.cuerpo.token;
    const inicial = bibliotecas.find((biblioteca) => biblioteca.id === favoritaId);
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

/** Inclinado sobre la favorita; sin favorita, encuadre de todas. */
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
function pintarMarcadores(estado, onSeleccionar) {
  estado.bibliotecas.forEach((biblioteca) => {
    const existente = estado.marcadores.get(biblioteca.id);
    if (existente) {
      actualizarGlobo(existente.getElement(), biblioteca);
      return;
    }
    const globo = crearGlobo();
    actualizarGlobo(globo, biblioteca);
    // Sigue siendo un enlace al detalle (abrir en otra pestaña), pero el toque abre la tarjeta.
    globo.addEventListener('click', (evento) => {
      evento.preventDefault();
      onSeleccionar(biblioteca.id);
    });
    const marcador = new window.mapboxgl.Marker({ element: globo })
      .setLngLat([biblioteca.longitud, biblioteca.latitud])
      .addTo(estado.mapa);
    estado.marcadores.set(biblioteca.id, marcador);
  });
  marcarGloboSeleccionado(estado);
}

function marcarGloboSeleccionado({ marcadores, seleccionadaId }) {
  marcadores.forEach((marcador, id) => {
    marcador.getElement().classList.toggle('map-pin--seleccionado', id === seleccionadaId);
  });
}

/** Globo vacío: anillo y número. actualizarGlobo le pone los datos. */
function crearGlobo() {
  const numero = document.createElement('span');
  numero.className = 'map-pin__numero';
  numero.setAttribute('aria-hidden', 'true');
  const globo = document.createElement('a');
  globo.append(crearAnilloOcupacion(), numero);
  return globo;
}

// classList y no className: Mapbox añade sus propias clases al elemento del marcador.
function actualizarGlobo(globo, { id, nombre, ocupacion, fiabilidad }) {
  globo.classList.remove(...CLASES_NIVEL);
  globo.classList.add('map-pin', getNivelOcupacion(ocupacion).clase);
  globo.href = crearRutaBiblioteca(id);
  globo.style.setProperty('--ocupacion', ocupacion);
  globo.querySelector('.map-pin__numero').textContent = ocupacion;
  globo.setAttribute(
    'aria-label',
    `${nombre}: ${ocupacion} % de ocupación, fiabilidad ${getTextoFiabilidad(fiabilidad).toLowerCase()}`,
  );
}

init();
