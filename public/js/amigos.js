/*
 * Pantalla de amigos (wireframes 7A, 7B y 8) (US06).
 * Solicitudes recibidas, enviar una solicitud por correo, lista de amigos, bloqueados e
 * interruptor de compartir ubicación. Quién ve qué lo decide el servidor: aquí solo se pinta.
 */
import {
  cambiarBloqueo,
  enviarSolicitudAmistad,
  getAmigos,
  getBloqueados,
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
import { RUTA_LOGIN, crearRutaPerfilContacto } from './rutas.js';

const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_UNAUTHORIZED = 401;
const VISIBILIDAD_SI = 'yes';
const VISIBILIDAD_NO = 'no';
const ACCION_ACEPTAR = 'accept';
const ACCION_RECHAZAR = 'reject';
const ACCION_DESBLOQUEAR = 'unblock';
const MENSAJE_SOLICITUD_ENVIADA = 'Solicitud enviada.';
// Neutro a propósito: no revela si el amigo no comparte su ubicación o si no está estudiando.
const TEXTO_SIN_UBICACION = 'Ubicación no disponible';
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

/** Pide solicitudes, amigos, bloqueados y visibilidad a la vez y pinta la pantalla. */
async function cargarPantalla() {
  const respuestas = await Promise.all([getSolicitudes(), getAmigos(), getBloqueados(), getVisibilidad()]);
  const [solicitudes, amigos, bloqueados, visibilidad] = respuestas;
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
  renderBloqueados(bloqueados.cuerpo.bloqueados);
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

function renderBloqueados(bloqueados) {
  document.getElementById('bloqueados-lista').replaceChildren(...bloqueados.map(crearItemBloqueado));
  document.getElementById('bloqueados-vacios').hidden = bloqueados.length > 0;
}

// En solicitudes y amigos el nombre abre el perfil de esa persona (allí está "Bloquear").
function crearItemSolicitud({ id, usuario_id: usuarioId, nombre, email }) {
  return crearFila(
    crearInfo(crearEnlacePerfil(usuarioId, nombre), email),
    crearAcciones(
      crearBotonAccion('Aceptar', 'button--primary', (boton) => handleResponderSolicitud(boton, id, ACCION_ACEPTAR)),
      crearBotonAccion('Rechazar', 'button--secondary', (boton) => handleResponderSolicitud(boton, id, ACCION_RECHAZAR)),
    ),
  );
}

function crearItemAmigo({ usuario_id: usuarioId, nombre, biblioteca }) {
  const detalle = biblioteca ? `Estudiando en ${biblioteca}` : TEXTO_SIN_UBICACION;
  return crearFila(crearInfo(crearEnlacePerfil(usuarioId, nombre), detalle));
}

// A un bloqueado no se le abre el perfil: solo se puede desbloquear.
function crearItemBloqueado({ usuario_id: usuarioId, nombre, email }) {
  const desbloquear = crearBotonAccion('Desbloquear', 'button--secondary', (boton) =>
    ejecutarAccionFila(boton, () => cambiarBloqueo(usuarioId, ACCION_DESBLOQUEAR)));
  return crearFila(crearInfo(crearTexto('p', 'friend-list__name', nombre), email), crearAcciones(desbloquear));
}

function crearEnlacePerfil(usuarioId, nombre) {
  const enlace = crearTexto('a', 'friend-list__name friend-list__name--link', nombre);
  enlace.href = crearRutaPerfilContacto(usuarioId);
  return enlace;
}

function crearAcciones(...botones) {
  const acciones = crearElemento('div', 'friend-list__actions');
  acciones.append(...botones);
  return acciones;
}

/** Botón de una fila. alPulsar recibe el propio botón para poder desactivarlo mientras se espera. */
function crearBotonAccion(texto, variante, alPulsar) {
  const boton = crearElemento('button', `button button--compact ${variante}`);
  boton.type = 'button';
  boton.textContent = texto;
  boton.addEventListener('click', (evento) => alPulsar(evento.currentTarget));
  return boton;
}

function crearFila(...contenido) {
  const item = crearElemento('li', 'friend-list__item');
  item.append(...contenido);
  return item;
}

function crearInfo(elementoNombre, detalle) {
  const info = crearElemento('div', 'friend-list__info');
  info.append(elementoNombre, crearTexto('p', 'friend-list__detail', detalle));
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

/** Acepta o rechaza una solicitud recibida. */
function handleResponderSolicitud(boton, solicitudId, accion) {
  ejecutarAccionFila(boton, () => responderSolicitud(solicitudId, accion));
}

/** Ejecuta la acción de un botón de fila y, si va bien, vuelve a pintar todas las listas. */
async function ejecutarAccionFila(boton, llamada) {
  boton.disabled = true;
  mostrarAlertaPagina('');
  try {
    const respuesta = await llamada();
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
