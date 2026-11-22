/*
 * Perfil de otra persona (mejora de US06): nombre, puntos y botón de bloquear.
 * El servidor decide si se puede ver (amigo o solicitud recibida); si no, responde 404.
 */
import { cambiarBloqueo, getPerfilContacto } from './api.js';
import { MENSAJE_ERROR_GENERICO, mostrarAlerta } from './formulario.js';
import { getIniciales } from './iniciales.js';
import { PARAM_USUARIO, RUTA_AMIGOS, RUTA_LOGIN } from './rutas.js';

const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;
const ACCION_BLOQUEAR = 'block';
const TEXTOS_RELACION = {
  friend: 'Amigo',
  request: 'Te ha enviado una solicitud',
};
const MENSAJE_NO_DISPONIBLE = 'Este perfil no está disponible.';
const MENSAJE_SIN_CONEXION = 'No se ha podido conectar. Revisa tu conexión e inténtalo de nuevo.';
const formatoPuntos = new Intl.NumberFormat('es-ES');

async function init() {
  const usuarioId = new URLSearchParams(window.location.search).get(PARAM_USUARIO);
  if (!usuarioId) {
    mostrarError(MENSAJE_NO_DISPONIBLE);
    return;
  }
  try {
    const respuesta = await getPerfilContacto(usuarioId);
    if (respuesta.estado === HTTP_UNAUTHORIZED) {
      window.location.assign(RUTA_LOGIN);
      return;
    }
    if (respuesta.estado !== HTTP_OK) {
      mostrarError(respuesta.cuerpo.error ?? MENSAJE_ERROR_GENERICO);
      return;
    }
    mostrarPerfil(respuesta.cuerpo);
  } catch (error) {
    console.error(error);
    mostrarError(MENSAJE_SIN_CONEXION);
  }
}

function mostrarPerfil({ usuario_id: usuarioId, nombre, puntos_totales: puntos, relacion }) {
  document.getElementById('usuario-iniciales').textContent = getIniciales(nombre);
  document.getElementById('usuario-nombre').textContent = nombre;
  document.getElementById('usuario-relacion').textContent = TEXTOS_RELACION[relacion] ?? '';
  document.getElementById('usuario-puntos').textContent = formatoPuntos.format(puntos);
  document.getElementById('boton-bloquear')
    .addEventListener('click', (evento) => handleBloquear(evento.currentTarget, usuarioId, nombre));
  document.getElementById('usuario-cargando').hidden = true;
  document.getElementById('usuario').hidden = false;
}

function mostrarError(mensaje) {
  document.getElementById('usuario-cargando').hidden = true;
  mostrarAlerta(document.getElementById('usuario-alerta'), mensaje);
}

/** Pide confirmación, bloquea y vuelve a la pantalla de amigos (ya sin esa persona). */
async function handleBloquear(boton, usuarioId, nombre) {
  const confirmado = window.confirm(
    `¿Bloquear a ${nombre}? Dejaréis de ser amigos y no podrá enviarte solicitudes. No se le avisará.`,
  );
  if (!confirmado) return;

  const alerta = document.getElementById('bloquear-alerta');
  boton.disabled = true;
  mostrarAlerta(alerta, '');
  try {
    const respuesta = await cambiarBloqueo(usuarioId, ACCION_BLOQUEAR);
    if (respuesta.estado === HTTP_OK) {
      window.location.assign(RUTA_AMIGOS);
      return;
    }
    mostrarAlerta(alerta, respuesta.cuerpo.error ?? MENSAJE_ERROR_GENERICO);
  } catch (error) {
    console.error(error);
    mostrarAlerta(alerta, MENSAJE_SIN_CONEXION);
  }
  boton.disabled = false;
}

init();
