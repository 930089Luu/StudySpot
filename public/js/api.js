/*
 * Llamadas a la API PHP. Único archivo del frontend que usa fetch.
 * Cada función devuelve { estado, cuerpo } con el código HTTP y el JSON recibido.
 */

const API_BASE_URL = '../api';

export function registrarUsuario(datos) {
  return postJson('registro.php', datos);
}

export function iniciarSesion(credenciales) {
  return postJson('login.php', credenciales);
}

export function solicitarRecuperacion(datos) {
  return postJson('recuperar.php', datos);
}

export function restablecerPassword(datos) {
  return postJson('restablecer.php', datos);
}

export function getSesionActiva() {
  return getJson('sesion.php');
}

export function hacerCheckin(datos) {
  return postJson('checkin.php', datos);
}

export function hacerCheckout() {
  return postJson('checkout.php', {});
}

/** Token público de Mapbox (vive en config.php, fuera de git). */
export function getConfigMapa() {
  return getJson('mapa.php');
}

/** Ocupación actual y fiabilidad de todas las bibliotecas (US03). */
export function getOcupacion() {
  return getJson('ocupacion.php');
}

/** Detalle de una biblioteca con su ocupación (US03). */
export function getBiblioteca(bibliotecaId) {
  return getJson(`biblioteca.php?id=${encodeURIComponent(bibliotecaId)}`);
}

/** Marca la biblioteca favorita (el mapa se abre en ella) o la quita con null. */
export function guardarFavorita(bibliotecaId) {
  return postJson('favorita.php', { biblioteca_id: bibliotecaId });
}

/** Ocupación típica por hora de un día de la semana, 1 = lunes … 7 = domingo (US05). */
export function getFranjas(bibliotecaId, dia) {
  const parametros = new URLSearchParams({ biblioteca: bibliotecaId, dia });
  return getJson(`franjas.php?${parametros}`);
}

export function getPerfil() {
  return getJson('perfil.php');
}

export function cerrarSesion() {
  return postJson('logout.php', {});
}

/** Amigos aceptados y, si comparten ubicación, la biblioteca donde estudian. */
export function getAmigos() {
  return getJson('amigos.php');
}

/** Envía una solicitud de amistad al correo indicado. */
export function enviarSolicitudAmistad(correo) {
  return postJson('amigos.php', { friend_email: correo });
}

/** Solicitudes pendientes que ha recibido el usuario. */
export function getSolicitudes() {
  return getJson('solicitudes.php');
}

/** Acepta o rechaza una solicitud recibida. accion: 'accept' o 'reject'. */
export function responderSolicitud(solicitudId, accion) {
  return postJson('solicitudes.php', { request_id: solicitudId, action: accion });
}

/** Si el usuario comparte ahora su ubicación: { share: 'yes' | 'no' }. */
export function getVisibilidad() {
  return getJson('visibilidad.php');
}

/** Cambia el interruptor de compartir ubicación. valor: 'yes' o 'no'. */
export function guardarVisibilidad(valor) {
  return postJson('visibilidad.php', { share: valor });
}

/** Perfil de un amigo o de quien te ha enviado una solicitud: { nombre, puntos_totales, relacion }. */
export function getPerfilContacto(usuarioId) {
  return getJson(`usuario.php?id=${encodeURIComponent(usuarioId)}`);
}

/** Personas que ha bloqueado el usuario. */
export function getBloqueados() {
  return getJson('bloqueos.php');
}

/** Bloquea o desbloquea a una persona. accion: 'block' o 'unblock'. */
export function cambiarBloqueo(usuarioId, accion) {
  return postJson('bloqueos.php', { user_id: usuarioId, action: accion });
}

async function getJson(endpoint) {
  const respuesta = await fetch(`${API_BASE_URL}/${endpoint}`, {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
    cache: 'no-store',
  });
  return { estado: respuesta.status, cuerpo: await leerCuerpoJson(respuesta) };
}

async function postJson(endpoint, datos) {
  const respuesta = await fetch(`${API_BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(datos),
  });
  return { estado: respuesta.status, cuerpo: await leerCuerpoJson(respuesta) };
}

// Si el servidor no responde JSON (p. ej. un error de Apache), se devuelve un objeto vacío.
async function leerCuerpoJson(respuesta) {
  const tipo = respuesta.headers.get('Content-Type') ?? '';
  return tipo.includes('application/json') ? respuesta.json() : {};
}

/** Ranking semanal entre tú y tus amigos, y progreso del objetivo compartido. */
export function getRanking() {
  return getJson('ranking.php');
}