/*
 * Pantalla de inicio de sesión (wireframe 1A).
 */
import { iniciarSesion } from './api.js';
import {
  MENSAJE_ERROR_GENERICO,
  activarValidacionEnVivo,
  enviarFormulario,
  getAlertaFormulario,
  mostrarAlerta,
} from './formulario.js';
import {
  AVISO_CUENTA_CREADA,
  AVISO_PASSWORD_CAMBIADA,
  AVISO_SESION_CERRADA,
  PARAM_AVISO,
  PARAM_PUNTOS,
  RUTA_BIENVENIDA,
  RUTA_INICIO,
} from './rutas.js';
import { isBienvenidaVista } from './primera-vez.js';

const HTTP_OK = 200;
const MENSAJES_AVISO = {
  [AVISO_CUENTA_CREADA]: 'Cuenta creada. Ya puedes iniciar sesión.',
  [AVISO_PASSWORD_CAMBIADA]: 'Contraseña cambiada. Ya puedes iniciar sesión con la nueva.',
  [AVISO_SESION_CERRADA]: 'Has cerrado sesión.',
};

function init() {
  // La primera vez, antes del login, Sito enseña cómo funciona la app. Si se llega con un aviso
  // (cuenta creada, sesión cerrada…), ya se conoce la app: no se desvía.
  const hasAviso = new URL(window.location.href).searchParams.has(PARAM_AVISO);
  if (!isBienvenidaVista() && !hasAviso) {
    window.location.replace(RUTA_BIENVENIDA);
    return;
  }
  const formulario = document.getElementById('form-login');
  mostrarAvisoDeUrl();
  activarValidacionEnVivo(formulario);
  formulario.addEventListener('submit', handleSubmit);
}

/** Muestra el aviso pedido por otra pantalla y limpia la URL para que no reaparezca al recargar. */
function mostrarAvisoDeUrl() {
  const url = new URL(window.location.href);
  const aviso = url.searchParams.get(PARAM_AVISO);
  const mensaje = MENSAJES_AVISO[aviso];
  if (!mensaje) return;

  const textoPuntos = aviso === AVISO_SESION_CERRADA ? crearTextoPuntos(url.searchParams.get(PARAM_PUNTOS)) : '';
  mostrarAlerta(document.getElementById('aviso-login'), `${mensaje}${textoPuntos}`);
  url.searchParams.delete(PARAM_AVISO);
  url.searchParams.delete(PARAM_PUNTOS);
  window.history.replaceState(null, '', url);
}

/**
 * " Tu sesión de estudio se ha cerrado: +2 puntos." si al cerrar sesión se cerró también
 * una sesión de estudio (K06). Solo se aceptan números: el texto no sale tal cual de la URL.
 */
function crearTextoPuntos(valor) {
  if (valor === null || !/^\d+$/.test(valor)) return '';
  const puntos = Number(valor);
  return ` Tu sesión de estudio se ha cerrado: +${puntos} ${puntos === 1 ? 'punto' : 'puntos'}.`;
}

async function handleSubmit(evento) {
  evento.preventDefault();
  const formulario = evento.currentTarget;

  const respuesta = await enviarFormulario(formulario, iniciarSesion);
  if (respuesta === null) return;

  if (respuesta.estado === HTTP_OK) {
    window.location.assign(RUTA_INICIO);
    return;
  }
  mostrarAlerta(getAlertaFormulario(formulario), respuesta.cuerpo.error ?? MENSAJE_ERROR_GENERICO);
}

init();
