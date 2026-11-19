/*
 * Pantalla de amigos (wireframes 7A, 7B y 8) (US06).
 * Solicitudes recibidas, enviar una solicitud por correo, lista de amigos e interruptor
 * de compartir ubicación. Quién ve qué lo decide el servidor: aquí solo se pinta.
 */
import {
  enviarSolicitudAmistad,
  getAmigos,
  getSolicitudes,
  getVisibilidad,
  guardarVisibilidad,
  responderSolicitud,
} from './api.js';
import {
  MENSAJE_ERROR_GENERICO,
  activarValidacionEnVivo,
  enviarFormulario,
  mostrarAlerta,
  mostrarErrorRespuesta,
} from './formulario.js';
import { RUTA_LOGIN } from './rutas.js';

const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_UNAUTHORIZED = 401;
const VISIBILIDAD_SI = 'yes';
const VISIBILIDAD_NO = 'no';
const ACCION_ACEPTAR = 'accept';
const ACCION_RECHAZAR = 'reject';
const MENSAJE_SOLICITUD_ENVIADA = 'Solicitud enviada.';
const TEXTO_SIN_UBICACION = 'Sin ubicación visible';
const MENSAJE_SIN_CONEXION = 'No se ha podido conectar. Revisa tu conexión e inténtalo de nuevo.';

async function init() {
  const formulario = document.getElementById('form-solicitud');
  activarValidacionEnVivo(formulario);
  formulario.addEventListener('submit', handleEnviarSolicitud);
  document.getElementById('switch-compartir').addEventListener('change', handleCambiarVisibilidad);
  try {
    await cargarPantalla();
  } catch (error) {
    console.error(error);
    mostrarAlertaPagina(MENSAJE_SIN_CONEXION);
    document.getElementById('amigos-cargando').hidden = true;
  }
}

/** Pide solicitudes, amigos y visibilidad a la vez y pinta la pantalla. */
async function cargarPantalla() {
  const respuestas = await Promise.all([getSolicitudes(), getAmigos(), getVisibilidad()]);
  const [solicitudes, amigos, visibilidad] = respuestas;
  if (respuestas.some(isSinSesion)) {
    redirigirAlLogin();
    return;
  }
  const fallo = respuestas.find((respuesta) => respuesta.estado !== HTTP_OK);
  if (fallo) {
    mostrarAlertaPagina(fallo.cuerpo.error ?? MENSAJE_ERROR_GENERICO);
    document.getElementById('amigos-cargando').hidden = true;
    return;
  }
  renderSolicitudes(solicitudes.cuerpo.solicitudes);
  renderAmigos(amigos.cuerpo.amigos);
  document.getElementById('switch-compartir').checked = visibilidad.cuerpo.share === VISIBILIDAD_SI;
  document.getElementById('amigos-cargando').hidden = true;
  document.getElementById('amigos-contenido').hidden = false;
}

function renderSolicitudes(solicitudes) {
  document.getElementById('solicitudes-lista').replaceChildren(...solicitudes.map(crearItemSolicitud));
  document.getElementById('solicitudes-vacias').hidden = solicitudes.length > 0;
}

function renderAmigos(amigos) {
  document.getElementById('amigos-lista').replaceChildren(...amigos.map(crearItemAmigo));
  document.getElementById('amigos-vacios').hidden = amigos.length > 0;
}

function crearItemSolicitud({ id, nombre, email }) {
  const acciones = crearElemento('div', 'friend-list__actions');
  acciones.append(
    crearBotonAccion('Aceptar', 'button--primary', id, ACCION_ACEPTAR),
    crearBotonAccion('Rechazar', 'button--secondary', id, ACCION_RECHAZAR),
  );
  return crearFila(crearInfo(nombre, email), acciones);
}

function crearItemAmigo({ nombre, biblioteca }) {
  const detalle = biblioteca ? `Estudiando en ${biblioteca}` : TEXTO_SIN_UBICACION;
  return crearFila(crearInfo(nombre, detalle));
}

function crearBotonAccion(texto, variante, solicitudId, accion) {
  const boton = crearElemento('button', `button button--compact ${variante}`);
  boton.type = 'button';
  boton.textContent = texto;
  boton.addEventListener('click', (evento) => handleResponderSolicitud(evento.currentTarget, solicitudId, accion));
  return boton;
}

function crearFila(...contenido) {
  const item = crearElemento('li', 'friend-list__item');
  item.append(...contenido);
  return item;
}

function crearInfo(nombre, detalle) {
  const info = crearElemento('div', 'friend-list__info');
  info.append(
    crearTexto('p', 'friend-list__name', nombre),
    crearTexto('p', 'friend-list__detail', detalle),
  );
  return info;
}

function crearElemento(etiqueta, clases) {
  const elemento = document.createElement(etiqueta);
  elemento.className = clases;
  return elemento;
}

function crearTexto(etiqueta, clases, texto) {
  const elemento = crearElemento(etiqueta, clases);
  elemento.textContent = texto;
  return elemento;
}

/** Envía la solicitud por correo. Los errores (400, 404, 409) aparecen en el formulario. */
async function handleEnviarSolicitud(evento) {
  evento.preventDefault();
  const formulario = evento.currentTarget;
  const exito = document.getElementById('solicitud-exito');
  mostrarAlerta(exito, '');
  const respuesta = await enviarFormulario(formulario, (datos) => enviarSolicitudAmistad(datos.friend_email));
  if (respuesta === null) return;
  if (isSinSesion(respuesta)) {
    redirigirAlLogin();
    return;
  }
  if (respuesta.estado === HTTP_CREATED) {
    formulario.reset();
    mostrarAlerta(exito, respuesta.cuerpo.mensaje ?? MENSAJE_SOLICITUD_ENVIADA);
    return;
  }
  mostrarErrorRespuesta(formulario, respuesta.cuerpo);
}

/** Acepta o rechaza una solicitud recibida y vuelve a pintar las listas. */
async function handleResponderSolicitud(boton, solicitudId, accion) {
  boton.disabled = true;
  mostrarAlertaPagina('');
  try {
    const respuesta = await responderSolicitud(solicitudId, accion);
    if (isSinSesion(respuesta)) {
      redirigirAlLogin();
      return;
    }
    if (respuesta.estado !== HTTP_OK) {
      mostrarAlertaPagina(respuesta.cuerpo.error ?? MENSAJE_ERROR_GENERICO);
      boton.disabled = false;
      return;
    }
    await cargarPantalla();
  } catch (error) {
    console.error(error);
    mostrarAlertaPagina(MENSAJE_SIN_CONEXION);
    boton.disabled = false;
  }
}

/** Guarda el interruptor. Si falla, vuelve a su posición anterior y avisa. */
async function handleCambiarVisibilidad(evento) {
  const interruptor = evento.currentTarget;
  const alerta = document.getElementById('visibilidad-alerta');
  interruptor.disabled = true;
  mostrarAlerta(alerta, '');
  try {
    const valor = interruptor.checked ? VISIBILIDAD_SI : VISIBILIDAD_NO;
    const respuesta = await guardarVisibilidad(valor);
    if (isSinSesion(respuesta)) {
      redirigirAlLogin();
      return;
    }
    if (respuesta.estado !== HTTP_OK) {
      revertirInterruptor(interruptor, alerta, respuesta.cuerpo.error ?? MENSAJE_ERROR_GENERICO);
    }
  } catch (error) {
    console.error(error);
    revertirInterruptor(interruptor, alerta, MENSAJE_SIN_CONEXION);
  } finally {
    interruptor.disabled = false;
  }
}

function revertirInterruptor(interruptor, alerta, mensaje) {
  interruptor.checked = !interruptor.checked;
  mostrarAlerta(alerta, mensaje);
}

function isSinSesion(respuesta) {
  return respuesta.estado === HTTP_UNAUTHORIZED;
}

function redirigirAlLogin() {
  window.location.assign(RUTA_LOGIN);
}

function mostrarAlertaPagina(mensaje) {
  mostrarAlerta(document.getElementById('amigos-alerta'), mensaje);
}

init();
