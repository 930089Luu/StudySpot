/*
 * Comportamiento común de los formularios: validación en el cliente,
 * mensajes de error bajo cada campo, avisos y envío.
 * Las reglas (required, type, minlength, maxlength) viven en los atributos HTML;
 * aquí solo se traducen a mensajes con la Constraint Validation API.
 */

export const MENSAJE_ERROR_GENERICO = 'Algo ha fallado. Inténtalo de nuevo.';
const MENSAJE_ERROR_CONEXION = 'No se ha podido conectar. Revisa tu conexión e inténtalo de nuevo.';
const MENSAJE_OBLIGATORIO = 'Este campo es obligatorio.';
const MENSAJE_EMAIL = 'Introduce un correo válido, por ejemplo nombre@unizar.es.';
const MENSAJE_NO_COINCIDEN = 'Las contraseñas no coinciden.';
const SELECTOR_CAMPO = '.field__input';
const SELECTOR_ALERTA = '.alert--error';

export function getMensajeValidacion(campo) {
  const { validity } = campo;
  if (validity.valueMissing) return MENSAJE_OBLIGATORIO;
  if (validity.typeMismatch) return MENSAJE_EMAIL;
  if (validity.tooShort) return `Usa al menos ${campo.minLength} caracteres.`;
  if (validity.tooLong) return `Usa como máximo ${campo.maxLength} caracteres.`;
  if (validity.customError) return campo.validationMessage;
  return '';
}

export function mostrarErrorCampo(campo, mensaje) {
  document.getElementById(`${campo.id}-error`).textContent = mensaje;
  campo.setAttribute('aria-invalid', String(mensaje !== ''));
}

function validarCampo(campo) {
  const mensaje = getMensajeValidacion(campo);
  mostrarErrorCampo(campo, mensaje);
  return mensaje === '';
}

function getCampos(formulario) {
  return [...formulario.querySelectorAll(SELECTOR_CAMPO)];
}

function enfocarPrimerCampoInvalido(formulario) {
  formulario.querySelector(`${SELECTOR_CAMPO}[aria-invalid="true"]`)?.focus();
}

/** Valida todos los campos, muestra sus errores y enfoca el primero inválido. */
export function validarFormulario(formulario) {
  const isValido = getCampos(formulario).map(validarCampo).every(Boolean);
  if (!isValido) enfocarPrimerCampoInvalido(formulario);
  return isValido;
}

/** Muestra bajo cada campo los errores devueltos por el servidor ({ campo: mensaje }). */
export function mostrarErroresServidor(formulario, errores) {
  for (const [nombre, mensaje] of Object.entries(errores)) {
    const campo = formulario.elements.namedItem(nombre);
    if (campo) mostrarErrorCampo(campo, mensaje);
  }
  enfocarPrimerCampoInvalido(formulario);
}

/** Valida cada campo al salir de él y corrige el error mientras se escribe. */
export function activarValidacionEnVivo(formulario) {
  formulario.addEventListener('focusout', handleCampoAbandonado);
  formulario.addEventListener('input', handleCampoEditado);
}

function handleCampoAbandonado(evento) {
  const campo = evento.target;
  // Un campo vacío que solo se ha recorrido con el tabulador no se marca todavía.
  if (campo.matches(SELECTOR_CAMPO) && campo.value !== '') validarCampo(campo);
}

function handleCampoEditado(evento) {
  const campo = evento.target;
  if (campo.getAttribute('aria-invalid') === 'true') validarCampo(campo);
}

/**
 * Mantiene "Repite la contraseña" (name="password_repetida") inválido mientras no coincida.
 * Llamar antes de activarValidacionEnVivo: así la validación en vivo ve el estado ya actualizado.
 */
export function activarComprobacionRepeticion(formulario) {
  formulario.addEventListener('input', () => sincronizarRepeticion(formulario));
}

export function sincronizarRepeticion(formulario) {
  const { password, password_repetida: repetida } = formulario.elements;
  const isDistinta = repetida.value !== '' && repetida.value !== password.value;
  repetida.setCustomValidity(isDistinta ? MENSAJE_NO_COINCIDEN : '');
}

/** Muestra un error de la API: bajo cada campo si trae { errores }, o en la alerta si trae { error }. */
export function mostrarErrorRespuesta(formulario, cuerpo) {
  if (cuerpo.errores) {
    mostrarErroresServidor(formulario, cuerpo.errores);
    return;
  }
  mostrarAlerta(getAlertaFormulario(formulario), cuerpo.error ?? MENSAJE_ERROR_GENERICO);
}

export function mostrarAlerta(elemento, mensaje) {
  elemento.textContent = mensaje;
  elemento.hidden = mensaje === '';
}

export function getAlertaFormulario(formulario) {
  return formulario.querySelector(SELECTOR_ALERTA);
}

function leerDatos(formulario) {
  return Object.fromEntries(new FormData(formulario));
}

function bloquearBoton(boton) {
  boton.disabled = true;
  boton.setAttribute('aria-busy', 'true');
}

function desbloquearBoton(boton) {
  boton.disabled = false;
  boton.removeAttribute('aria-busy');
}

/**
 * Valida el formulario y, si es correcto, envía sus datos con la función de api.js.
 * Devuelve la respuesta { estado, cuerpo }, o null si no se ha llegado a enviar.
 */
export async function enviarFormulario(formulario, enviarDatos) {
  const alerta = getAlertaFormulario(formulario);
  mostrarAlerta(alerta, '');
  if (!validarFormulario(formulario)) return null;

  const boton = formulario.querySelector('[type="submit"]');
  bloquearBoton(boton);
  try {
    return await enviarDatos(leerDatos(formulario));
  } catch (error) {
    console.error(error);
    mostrarAlerta(alerta, MENSAJE_ERROR_CONEXION);
    return null;
  } finally {
    desbloquearBoton(boton);
  }
}
