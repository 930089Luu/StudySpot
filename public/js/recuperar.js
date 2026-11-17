/*
 * Pantalla "¿Has olvidado tu contraseña?": pide el correo y envía el enlace (US09).
 */
import { solicitarRecuperacion } from './api.js';
import {
  activarValidacionEnVivo,
  enviarFormulario,
  mostrarAlerta,
  mostrarErrorRespuesta,
} from './formulario.js';

const HTTP_OK = 200;

function init() {
  const formulario = document.getElementById('form-recuperar');
  activarValidacionEnVivo(formulario);
  formulario.addEventListener('submit', handleSubmit);
}

async function handleSubmit(evento) {
  evento.preventDefault();
  const formulario = evento.currentTarget;

  const respuesta = await enviarFormulario(formulario, solicitarRecuperacion);
  if (respuesta === null) return;

  if (respuesta.estado === HTTP_OK) {
    mostrarConfirmacion(formulario, respuesta.cuerpo.mensaje);
    return;
  }
  mostrarErrorRespuesta(formulario, respuesta.cuerpo);
}

/** Sustituye el formulario por el mensaje: el mismo exista o no la cuenta. */
function mostrarConfirmacion(formulario, mensaje) {
  formulario.hidden = true;
  const confirmacion = document.getElementById('confirmacion-recuperar');
  mostrarAlerta(confirmacion, mensaje);
  confirmacion.focus();
}

init();
