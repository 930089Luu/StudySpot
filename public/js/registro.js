/*
 * Pantalla de registro (wireframe 1B).
 */
import { registrarUsuario } from './api.js';
import {
  activarComprobacionRepeticion,
  activarValidacionEnVivo,
  enviarFormulario,
  mostrarErrorRespuesta,
  sincronizarRepeticion,
} from './formulario.js';
import { AVISO_CUENTA_CREADA, crearRutaLoginConAviso } from './rutas.js';

const HTTP_CREATED = 201;

function init() {
  const formulario = document.getElementById('form-registro');
  activarComprobacionRepeticion(formulario);
  activarValidacionEnVivo(formulario);
  formulario.addEventListener('submit', handleSubmit);
}

async function handleSubmit(evento) {
  evento.preventDefault();
  const formulario = evento.currentTarget;
  sincronizarRepeticion(formulario);

  const respuesta = await enviarFormulario(formulario, registrarUsuario);
  if (respuesta === null) return;

  if (respuesta.estado === HTTP_CREATED) {
    window.location.assign(crearRutaLoginConAviso(AVISO_CUENTA_CREADA));
    return;
  }
  mostrarErrorRespuesta(formulario, respuesta.cuerpo);
}

init();
