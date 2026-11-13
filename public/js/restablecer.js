/*
 * Pantalla "Nueva contraseña": se abre desde el enlace del correo (?token=…) (US09).
 */
import { restablecerPassword } from './api.js';
import {
  activarComprobacionRepeticion,
  activarValidacionEnVivo,
  enviarFormulario,
  mostrarErroresServidor,
  sincronizarRepeticion,
} from './formulario.js';
import { AVISO_PASSWORD_CAMBIADA, crearRutaLoginConAviso } from './rutas.js';

const HTTP_OK = 200;
const PARAM_TOKEN = 'token';

function init() {
  const formulario = document.getElementById('form-restablecer');
  const token = extraerTokenDeUrl();
  if (token === '') {
    mostrarEnlaceInvalido(formulario);
    return;
  }
  formulario.elements.token.value = token;
  activarComprobacionRepeticion(formulario);
  activarValidacionEnVivo(formulario);
  formulario.addEventListener('submit', handleSubmit);
}

/**
 * Lee el token y lo quita de la barra de direcciones, para que no quede en el
 * historial ni se vea si se comparte la pantalla.
 */
function extraerTokenDeUrl() {
  const url = new URL(window.location.href);
  const token = url.searchParams.get(PARAM_TOKEN) ?? '';
  url.searchParams.delete(PARAM_TOKEN);
  window.history.replaceState(null, '', url);
  return token;
}

function mostrarEnlaceInvalido(formulario, mensaje) {
  formulario.hidden = true;
  const aviso = document.getElementById('enlace-invalido');
  if (mensaje) document.getElementById('enlace-invalido-texto').textContent = mensaje;
  aviso.hidden = false;
}

async function handleSubmit(evento) {
  evento.preventDefault();
  const formulario = evento.currentTarget;
  sincronizarRepeticion(formulario);

  const respuesta = await enviarFormulario(formulario, restablecerPassword);
  if (respuesta === null) return;

  if (respuesta.estado === HTTP_OK) {
    window.location.assign(crearRutaLoginConAviso(AVISO_PASSWORD_CAMBIADA));
    return;
  }
  if (respuesta.cuerpo.errores) {
    mostrarErroresServidor(formulario, respuesta.cuerpo.errores);
    return;
  }
  mostrarEnlaceInvalido(formulario, respuesta.cuerpo.error);
}

init();
