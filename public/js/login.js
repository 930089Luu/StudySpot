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
import { AVISO_CUENTA_CREADA, AVISO_PASSWORD_CAMBIADA, PARAM_AVISO, RUTA_INICIO } from './rutas.js';

const HTTP_OK = 200;
const MENSAJES_AVISO = {
  [AVISO_CUENTA_CREADA]: 'Cuenta creada. Ya puedes iniciar sesión.',
  [AVISO_PASSWORD_CAMBIADA]: 'Contraseña cambiada. Ya puedes iniciar sesión con la nueva.',
};

function init() {
  const formulario = document.getElementById('form-login');
  mostrarAvisoDeUrl();
  activarValidacionEnVivo(formulario);
  formulario.addEventListener('submit', handleSubmit);
}

/** Muestra el aviso pedido por otra pantalla y limpia la URL para que no reaparezca al recargar. */
function mostrarAvisoDeUrl() {
  const url = new URL(window.location.href);
  const mensaje = MENSAJES_AVISO[url.searchParams.get(PARAM_AVISO)];
  if (!mensaje) return;

  mostrarAlerta(document.getElementById('aviso-login'), mensaje);
  url.searchParams.delete(PARAM_AVISO);
  window.history.replaceState(null, '', url);
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
