/*
 * Pantalla de check-in y sesión de estudio (wireframes 4A, 4B, 4C y 5) (US02).
 * El QR de la zona (checkin.html?zona=<id>&token=<token_qr>) se lee aquí con la cámara
 * (escaner.js) o se abre directamente con la cámara del móvil.
 * La ubicación se pide en el navegador, pero el token y la distancia los comprueba el servidor.
 */
import { getSesionActiva, hacerCheckin, hacerCheckout } from './api.js';
import { iniciarEscaner, isCamaraDisponible } from './escaner.js';
import { MENSAJE_ERROR_GENERICO, mostrarAlerta } from './formulario.js';
import { PARAM_TOKEN, PARAM_ZONA, RUTA_LOGIN, leerZonaDeTexto, leerZonaDeUrl } from './rutas.js';

const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_BAD_REQUEST = 400;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const HTTP_CONFLICT = 409;
// Anillo y puntos de la sesión activa (solo para enseñarlos: los puntos de verdad los da el servidor).
const SEGUNDOS_POR_PUNTO = 15 * 60;
const PUNTOS_MAXIMOS = 16;
const SEGUNDOS_MAXIMOS = 4 * 60 * 60;
const ESTADOS = ['cargando', 'escanear', 'permiso', 'error', 'activa', 'terminada'];
const SEGUNDOS_POR_MINUTO = 60;
const SEGUNDOS_POR_HORA = 3600;
const MINUTOS_POR_HORA = 60;
const MS_POR_SEGUNDO = 1000;
// Ubicación precisa y recién obtenida: una posición guardada de antes no demuestra que estés allí ahora.
const OPCIONES_UBICACION = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };

const MENSAJE_SIN_CONEXION = 'No se ha podido conectar. Revisa tu conexión e inténtalo de nuevo.';
const TITULO_ERROR = 'No se ha podido hacer el check-in';
const TITULO_CERRADA = 'Biblioteca cerrada';
const MENSAJE_SIN_PERMISO ='Sin permiso de ubicación no podemos comprobar que estás en la biblioteca.';
const DETALLE_SIN_PERMISO = 'Activa la ubicación para esta página en los ajustes del navegador y vuelve a intentarlo.';
const MENSAJE_SIN_UBICACION = 'No hemos podido obtener tu ubicación. Inténtalo de nuevo.';
const MENSAJE_NAVEGADOR = 'Este navegador no permite obtener tu ubicación en esta página (hace falta HTTPS).';
const MENSAJE_QR_AJENO = 'Este código QR no es de StudySpot. Busca el QR de tu zona de estudio.';
const MENSAJE_CAMARA_SIN_PERMISO =
  'Sin permiso de cámara no podemos leer el QR. Actívalo en los ajustes del navegador y pulsa "Activar cámara".';
const MENSAJE_SIN_CAMARA = 'No hemos encontrado ninguna cámara en este dispositivo.';
const MENSAJE_CAMARA_ERROR = 'No se ha podido abrir la cámara. Inténtalo de nuevo.';
const MENSAJE_CAMARA_NAVEGADOR =
  'Este navegador no permite usar la cámara en esta página (hace falta HTTPS). Escanea el QR con la cámara del móvil.';

let qr = null;
let cronometro = null;
let apagarCamara = null;

function init() {
  qr = extraerQrDeUrl();
  document.getElementById('boton-permitir').addEventListener('click', handlePermitir);
  document.getElementById('boton-ahora-no').addEventListener('click', handleAhoraNo);
  document.getElementById('boton-reintentar').addEventListener('click', handleReintentar);
  document.getElementById('boton-checkout').addEventListener('click', handleCheckout);
  document.getElementById('boton-camara').addEventListener('click', mostrarEscaner);
  cargarSesion();
}

/**
 * Lee zona y token si se ha llegado con el enlace del QR y los quita de la barra de direcciones:
 * si se recarga la página después del check-out no se vuelve a pedir otro check-in sin escanear.
 */
function extraerQrDeUrl() {
  const url = new URL(window.location.href);
  const zona = leerZonaDeUrl(url);
  url.searchParams.delete(PARAM_ZONA);
  url.searchParams.delete(PARAM_TOKEN);
  window.history.replaceState(null, '', url);
  return zona;
}

/** Muestra solo la sección pedida. La cámara se apaga siempre que se sale del escáner. */
function mostrarEstado(nombre) {
  if (nombre !== 'escanear') detenerEscaner();
  // Modo estudio: toda la pantalla en oscuro mientras la sesión está abierta.
  document.body.classList.toggle('modo-estudio', nombre === 'activa');
  for (const estado of ESTADOS) {
    document.getElementById(`estado-${estado}`).hidden = estado !== nombre;
  }
}

/** Si ya hay una sesión activa se muestra; si no, se pide la ubicación (con QR) o se abre el escáner. */
async function cargarSesion() {
  const respuesta = await llamarApi(getSesionActiva);
  if (respuesta === null) return;
  if (respuesta.cuerpo.sesion) {
    mostrarSesionActiva(respuesta.cuerpo.sesion);
    return;
  }
  if (qr) {
    mostrarEstado('permiso');
    return;
  }
  mostrarEscaner();
}

// ---------- escáner (wireframe 4A) ----------

async function mostrarEscaner() {
  mostrarEstado('escanear');
  prepararEscaner();
  if (!isCamaraDisponible()) {
    mostrarProblemaCamara(MENSAJE_CAMARA_NAVEGADOR, { isReintentable: false });
    return;
  }
  try {
    detenerEscaner();
    const apagar = await iniciarEscaner(document.getElementById('escaner-video'), handleCodigoLeido);
    // Si mientras se pedía permiso ya se ha salido del escáner, se apaga la cámara enseguida.
    if (document.getElementById('estado-escanear').hidden) {
      apagar();
      return;
    }
    apagarCamara = apagar;
  } catch (error) {
    console.error(error);
    mostrarProblemaCamara(getMensajeErrorCamara(error));
  }
}

function prepararEscaner() {
  document.getElementById('escaner-visor').hidden = false;
  document.getElementById('escaner-acciones').hidden = true;
  mostrarAvisoEscaner('');
}

function detenerEscaner() {
  if (apagarCamara === null) return;
  apagarCamara();
  apagarCamara = null;
}

function mostrarAvisoEscaner(mensaje) {
  document.getElementById('escaner-aviso').textContent = mensaje;
}

function mostrarProblemaCamara(mensaje, { isReintentable = true } = {}) {
  document.getElementById('escaner-visor').hidden = true;
  document.getElementById('escaner-acciones').hidden = !isReintentable;
  mostrarAvisoEscaner(mensaje);
}

function getMensajeErrorCamara(error) {
  if (error.name === 'NotAllowedError') return MENSAJE_CAMARA_SIN_PERMISO;
  if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') return MENSAJE_SIN_CAMARA;
  return MENSAJE_CAMARA_ERROR;
}

/** jsQR ha leído un QR: si es de una zona de StudySpot se pasa a pedir la ubicación. */
function handleCodigoLeido(texto) {
  const zona = leerZonaDeTexto(texto);
  if (zona === null) {
    mostrarAvisoEscaner(MENSAJE_QR_AJENO);
    return;
  }
  qr = zona;
  mostrarEstado('permiso');
}

function handleReintentar() {
  if (qr) {
    mostrarEstado('permiso');
    return;
  }
  mostrarEscaner();
}

/** Llama a la API; si falla la conexión o no hay sesión iniciada lo gestiona y devuelve null. */
async function llamarApi(llamada, datos) {
  try {
    const respuesta = await llamada(datos);
    if (respuesta.estado === HTTP_UNAUTHORIZED) {
      window.location.assign(RUTA_LOGIN);
      return null;
    }
    return respuesta;
  } catch (error) {
    console.error(error);
    mostrarError(MENSAJE_SIN_CONEXION);
    return null;
  }
}

function mostrarError(mensaje, detalle = '', { isReintentable = true, titulo = TITULO_ERROR } = {}) {
  detenerCronometro();
  document.getElementById('titulo-error').textContent = titulo;
  document.getElementById('error-mensaje').textContent = mensaje;
  const elementoDetalle = document.getElementById('error-detalle');
  elementoDetalle.textContent = detalle;
  elementoDetalle.hidden = detalle === '';
  document.getElementById('boton-reintentar').hidden = !isReintentable;
  // Sin reintentar, "Volver al mapa" pasa a ser el botón principal.
  const volver = document.getElementById('boton-error-mapa');
  volver.classList.toggle('button--neutral', !isReintentable);
  volver.classList.toggle('button--plain', isReintentable);
  mostrarEstado('error');
}

function handleAhoraNo() {
  mostrarError(MENSAJE_SIN_PERMISO, 'Cuando quieras, pulsa "Intentar de nuevo".');
}

async function handlePermitir(evento) {
  const boton = evento.currentTarget;
  boton.disabled = true;
  try {
    const posicion = await obtenerUbicacion();
    await enviarCheckin(posicion.coords);
  } catch (error) {
    mostrarErrorUbicacion(error);
  } finally {
    boton.disabled = false;
  }
}

function obtenerUbicacion() {
  if (!window.isSecureContext || !('geolocation' in navigator)) {
    return Promise.reject(new Error(MENSAJE_NAVEGADOR));
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, OPCIONES_UBICACION);
  });
}

function mostrarErrorUbicacion(error) {
  if (error instanceof Error) {
    mostrarError(error.message);
    return;
  }
  // GeolocationPositionError: código 1 = el usuario ha denegado el permiso.
  if (error.code === error.PERMISSION_DENIED) {
    mostrarError(MENSAJE_SIN_PERMISO, DETALLE_SIN_PERMISO);
    return;
  }
  mostrarError(MENSAJE_SIN_UBICACION);
}

async function enviarCheckin({ latitude, longitude }) {
  const datos = { zona: qr.zona, token: qr.token, latitud: latitude, longitud: longitude };
  const respuesta = await llamarApi(hacerCheckin, datos);
  if (respuesta === null) return;

  if (respuesta.estado === HTTP_CREATED) {
    mostrarSesionActiva(respuesta.cuerpo.sesion);
    return;
  }
  if (respuesta.estado === HTTP_CONFLICT) {
    // Ya hay una sesión abierta (p. ej. en otra pestaña): se muestra en vez de un error.
    cargarSesion();
    return;
  }
  if (respuesta.estado === HTTP_BAD_REQUEST) {
    // Siempre enviamos coordenadas, así que un 400 aquí es un QR no válido: "Intentar de nuevo" vuelve a escanear.
    qr = null;
  }
  const { error, biblioteca, cerrada } = respuesta.cuerpo;
  if (cerrada) {
    // Biblioteca cerrada ahora (US08): reintentar no sirve hasta que abra.
    mostrarError(error ?? MENSAJE_ERROR_GENERICO, '', { isReintentable: false, titulo: TITULO_CERRADA });
    return;
  }
  const detalle = respuesta.estado === HTTP_FORBIDDEN && biblioteca
    ? `Acércate a ${biblioteca} y vuelve a intentarlo.`
    : '';
  mostrarError(error ?? MENSAJE_ERROR_GENERICO, detalle);
}

function mostrarSesionActiva(sesion) {
  document.getElementById('sesion-biblioteca').textContent = sesion.biblioteca;
  document.getElementById('sesion-detalle').textContent = `${sesion.zona} · Desde las ${sesion.hora_inicio}`;
  mostrarAlerta(document.getElementById('alerta-checkout'), '');
  iniciarCronometro(sesion.segundos);
  mostrarEstado('activa');
}

/**
 * Cuenta desde los segundos que da el servidor. Se mide el tiempo con performance.now()
 * y no con la hora del móvil, que puede estar mal o en otra zona horaria.
 */
function iniciarCronometro(segundosIniciales) {
  detenerCronometro();
  const elemento = document.getElementById('sesion-tiempo');
  const puntos = document.getElementById('sesion-puntos');
  const anillo = document.getElementById('sesion-anillo');
  const siguiente = document.getElementById('sesion-siguiente');
  const inicio = performance.now();
  const actualizar = () => {
    const segundos = segundosIniciales + Math.floor((performance.now() - inicio) / MS_POR_SEGUNDO);
    elemento.textContent = formatearCronometro(segundos);
    // Lo mismo que calcula el servidor al hacer check-out: 1 punto cada 15 min, hasta 16 (4 h).
    const ganados = Math.min(PUNTOS_MAXIMOS, Math.floor(segundos / SEGUNDOS_POR_PUNTO));
    puntos.textContent = String(ganados);
    siguiente.textContent = ganados < PUNTOS_MAXIMOS
      ? ` · Próximo en ${formatearCuentaAtras(SEGUNDOS_POR_PUNTO - (segundos % SEGUNDOS_POR_PUNTO))}`
      : ' · ¡Máximo conseguido!';
    anillo.style.setProperty('--progreso', String(Math.min(100, (segundos / SEGUNDOS_MAXIMOS) * 100)));
  };
  actualizar();
  cronometro = setInterval(actualizar, MS_POR_SEGUNDO);
}

function detenerCronometro() {
  clearInterval(cronometro);
  cronometro = null;
}

/** "12:05" (minutos y segundos) hasta el siguiente punto. */
function formatearCuentaAtras(segundos) {
  const minutos = Math.floor(segundos / SEGUNDOS_POR_MINUTO);
  return `${minutos}:${String(segundos % SEGUNDOS_POR_MINUTO).padStart(2, '0')}`;
}

function formatearCronometro(segundos) {
  const horas = Math.floor(segundos / SEGUNDOS_POR_HORA);
  const minutos = Math.floor((segundos % SEGUNDOS_POR_HORA) / SEGUNDOS_POR_MINUTO);
  const resto = segundos % SEGUNDOS_POR_MINUTO;
  return [horas, minutos, resto].map((valor) => String(valor).padStart(2, '0')).join(':');
}

async function handleCheckout(evento) {
  const boton = evento.currentTarget;
  boton.disabled = true;
  const respuesta = await llamarApi(hacerCheckout);
  boton.disabled = false;
  if (respuesta === null) return;

  if (respuesta.estado === HTTP_OK) {
    mostrarTerminada(respuesta.cuerpo);
    return;
  }
  // 404: la sesión ya no estaba activa (p. ej. caducó a las 4 h).
  mostrarError(respuesta.cuerpo.error ?? MENSAJE_ERROR_GENERICO, '', { isReintentable: false });
}

function mostrarTerminada({ minutos, puntos }) {
  detenerCronometro();
  const textoPuntos = puntos === 1 ? '1 punto' : `${puntos} puntos`;
  document.getElementById('resumen-sesion').textContent =
    `Has estudiado ${formatearDuracion(minutos)} y has ganado ${textoPuntos}.`;
  mostrarEstado('terminada');
}

function formatearDuracion(minutosTotales) {
  const horas = Math.floor(minutosTotales / MINUTOS_POR_HORA);
  const minutos = minutosTotales % MINUTOS_POR_HORA;
  return horas > 0 ? `${horas} h ${minutos} min` : `${minutos} min`;
}

init();
