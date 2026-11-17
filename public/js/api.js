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
