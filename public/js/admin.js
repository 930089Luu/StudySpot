/*
 * Pantalla de administración de horarios (wireframe 9) (US08).
 * Solo la usan los administradores: el servidor comprueba el rol en cada petición.
 */
import {
  borrarPeriodoEspecial,
  getHorarios,
  getOcupacion,
  guardarHorarioSemana,
  guardarPeriodoEspecial,
} from './api.js';
import {
  MENSAJE_ERROR_GENERICO,
  activarValidacionEnVivo,
  enviarFormulario,
  mostrarAlerta,
  mostrarErrorRespuesta,
} from './formulario.js';
import { RUTA_LOGIN } from './rutas.js';

const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_UNAUTHORIZED = 401;
const HTTP_FORBIDDEN = 403;
const DIAS_POR_SEMANA = 7;
const MENSAJE_SIN_ADMIN = 'Solo los administradores pueden gestionar horarios.';
const MENSAJE_SIN_CONEXION = 'No se ha podido conectar. Revisa tu conexión e inténtalo de nuevo.';
const MENSAJE_SEMANA_GUARDADA = 'Horario semanal guardado.';
const MENSAJE_ESPECIAL_ANADIDO = 'Periodo especial añadido.';

async function init() {
  const formularioSemana = document.getElementById('form-semana');
  const formularioEspecial = document.getElementById('form-especial');
  activarValidacionEnVivo(formularioEspecial);
  document.getElementById('select-biblioteca').addEventListener('change', handleCambiarBiblioteca);
  formularioSemana.addEventListener('submit', handleGuardarSemana);
  formularioSemana.addEventListener('change', handleCambiarCerradoSemana);
  formularioEspecial.addEventListener('submit', handleAnadirEspecial);
  formularioEspecial.addEventListener('change', handleCambiarCerradoEspecial);
  try {
    const respuesta = await getOcupacion();
    if (isSinSesion(respuesta)) return redirigirAlLogin();
    if (respuesta.estado !== HTTP_OK) return mostrarErrorPagina(respuesta.cuerpo.error ?? MENSAJE_ERROR_GENERICO);
    rellenarBibliotecas(getListaBibliotecas(respuesta.cuerpo));
    await cargarHorarios();
  } catch (error) {
    console.error(error);
    mostrarErrorPagina(MENSAJE_SIN_CONEXION);
  }
}

/** Carga el horario y el calendario de la biblioteca elegida. Solo admins: si no, avisa y oculta la pantalla. */
async function cargarHorarios() {
  const respuesta = await getHorarios(bibliotecaSeleccionada());
  if (isSinSesion(respuesta)) return redirigirAlLogin();
  if (respuesta.estado === HTTP_FORBIDDEN) return mostrarErrorPagina(MENSAJE_SIN_ADMIN);
  if (respuesta.estado !== HTTP_OK) return mostrarErrorPagina(respuesta.cuerpo.error ?? MENSAJE_ERROR_GENERICO);
  rellenarSemana(respuesta.cuerpo.horario_semanal);
  rellenarCalendario(respuesta.cuerpo.calendario);
  document.getElementById('admin-cargando').hidden = true;
  document.getElementById('admin-contenido').hidden = false;
}

function handleCambiarBiblioteca() {
  cargarHorarios().catch((error) => {
    console.error(error);
    mostrarErrorPagina(MENSAJE_SIN_CONEXION);
  });
}

function rellenarBibliotecas(bibliotecas) {
  document.getElementById('select-biblioteca').replaceChildren(...bibliotecas.map(crearOpcionBiblioteca));
}

function crearOpcionBiblioteca({ id, nombre }) {
  const opcion = document.createElement('option');
  opcion.value = String(id);
  opcion.textContent = nombre;
  return opcion;
}

/** getOcupacion devuelve la lista de bibliotecas; se acepta también dentro de un objeto. */
function getListaBibliotecas(cuerpo) {
  return Array.isArray(cuerpo) ? cuerpo : (cuerpo.bibliotecas ?? []);
}

function bibliotecaSeleccionada() {
  return Number(document.getElementById('select-biblioteca').value);
}

function rellenarSemana(semana) {
  const formulario = document.getElementById('form-semana');
  semana.forEach(({ dia, apertura, cierre }) => {
    const cerrado = apertura === null;
    formulario.elements.namedItem(`cerrado-${dia}`).checked = cerrado;
    formulario.elements.namedItem(`apertura-${dia}`).value = apertura ?? '';
    formulario.elements.namedItem(`cierre-${dia}`).value = cierre ?? '';
    deshabilitarHoras(formulario, dia, cerrado);
  });
}

function deshabilitarHoras(formulario, dia, cerrado) {
  formulario.elements.namedItem(`apertura-${dia}`).disabled = cerrado;
  formulario.elements.namedItem(`cierre-${dia}`).disabled = cerrado;
}

/** Al marcar "Cerrado" en un día, sus horas se deshabilitan. */
function handleCambiarCerradoSemana(evento) {
  const campo = evento.target;
  if (!campo.name.startsWith('cerrado-')) return;
  const dia = Number(campo.name.split('-')[1]);
  deshabilitarHoras(evento.currentTarget, dia, campo.checked);
}

function handleCambiarCerradoEspecial(evento) {
  if (evento.target.name !== 'cerrado') return;
  const formulario = evento.currentTarget;
  const cerrada = evento.target.checked;
  formulario.elements.namedItem('apertura').disabled = cerrada;
  formulario.elements.namedItem('cierre').disabled = cerrada;
}

async function handleGuardarSemana(evento) {
  evento.preventDefault();
  const formulario = evento.currentTarget;
  const alerta = formulario.querySelector('.alert--error');
  const exito = document.getElementById('semana-exito');
  const boton = formulario.querySelector('[type="submit"]');
  mostrarAlerta(alerta, '');
  mostrarAlerta(exito, '');
  boton.disabled = true;
  try {
    const respuesta = await guardarHorarioSemana(bibliotecaSeleccionada(), leerSemana(formulario));
    if (isSinSesion(respuesta)) return redirigirAlLogin();
    if (respuesta.estado !== HTTP_OK) return mostrarAlerta(alerta, respuesta.cuerpo.error ?? MENSAJE_ERROR_GENERICO);
    mostrarAlerta(exito, MENSAJE_SEMANA_GUARDADA);
  } catch (error) {
    console.error(error);
    mostrarAlerta(alerta, MENSAJE_SIN_CONEXION);
  } finally {
    boton.disabled = false;
  }
}

function leerSemana(formulario) {
  return Array.from({ length: DIAS_POR_SEMANA }, (_, indice) => {
    const dia = indice + 1;
    const cerrado = formulario.elements.namedItem(`cerrado-${dia}`).checked;
    return {
      dia,
      apertura: cerrado ? null : valorONull(formulario.elements.namedItem(`apertura-${dia}`).value),
      cierre: cerrado ? null : valorONull(formulario.elements.namedItem(`cierre-${dia}`).value),
    };
  });
}

async function handleAnadirEspecial(evento) {
  evento.preventDefault();
  const formulario = evento.currentTarget;
  const exito = document.getElementById('especial-exito');
  mostrarAlerta(exito, '');
  const respuesta = await enviarFormulario(formulario, () =>
    guardarPeriodoEspecial(bibliotecaSeleccionada(), leerEspecial(formulario)));
  if (respuesta === null) return;
  if (isSinSesion(respuesta)) return redirigirAlLogin();
  if (respuesta.estado === HTTP_CREATED) {
    formulario.reset();
    handleCambiarCerradoEspecial({ target: formulario.elements.namedItem('cerrado'), currentTarget: formulario });
    mostrarAlerta(exito, MENSAJE_ESPECIAL_ANADIDO);
    return cargarHorarios();
  }
  mostrarErrorRespuesta(formulario, respuesta.cuerpo);
}

function leerEspecial(formulario) {
  const cerrado = formulario.elements.namedItem('cerrado').checked;
  return {
    fecha_inicio: formulario.elements.namedItem('fecha_inicio').value,
    fecha_fin: formulario.elements.namedItem('fecha_fin').value,
    descripcion: formulario.elements.namedItem('descripcion').value.trim(),
    cerrado,
    apertura: cerrado ? null : valorONull(formulario.elements.namedItem('apertura').value),
    cierre: cerrado ? null : valorONull(formulario.elements.namedItem('cierre').value),
  };
}

function rellenarCalendario(periodos) {
  document.getElementById('especiales-lista').replaceChildren(...periodos.map(crearItemEspecial));
  document.getElementById('especiales-vacios').hidden = periodos.length > 0;
}

function crearItemEspecial({ id, descripcion, fecha_inicio: inicio, fecha_fin: fin, cerrado, apertura, cierre }) {
  const estado = cerrado ? 'Cerrada' : `${apertura} – ${cierre}`;
  const boton = crearElemento('button', 'button button--compact button--secondary');
  boton.type = 'button';
  boton.textContent = 'Borrar';
  boton.addEventListener('click', (evento) => handleBorrarEspecial(evento.currentTarget, id));
  const acciones = crearElemento('div', 'friend-list__actions');
  acciones.append(boton);
  const info = crearElemento('div', 'friend-list__info');
  info.append(
    crearTexto('p', 'friend-list__name', descripcion),
    crearTexto('p', 'friend-list__detail', `${inicio} → ${fin} · ${estado}`),
  );
  const item = crearElemento('li', 'friend-list__item');
  item.append(info, acciones);
  return item;
}

async function handleBorrarEspecial(boton, especialId) {
  boton.disabled = true;
  mostrarAlertaPagina('');
  try {
    const respuesta = await borrarPeriodoEspecial(bibliotecaSeleccionada(), especialId);
    if (isSinSesion(respuesta)) return redirigirAlLogin();
    if (respuesta.estado !== HTTP_OK) {
      mostrarAlertaPagina(respuesta.cuerpo.error ?? MENSAJE_ERROR_GENERICO);
      boton.disabled = false;
      return;
    }
    await cargarHorarios();
  } catch (error) {
    console.error(error);
    mostrarAlertaPagina(MENSAJE_SIN_CONEXION);
    boton.disabled = false;
  }
}

function valorONull(valor) {
  return valor === '' ? null : valor;
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

function isSinSesion(respuesta) {
  return respuesta.estado === HTTP_UNAUTHORIZED;
}

function redirigirAlLogin() {
  window.location.assign(RUTA_LOGIN);
}

function mostrarAlertaPagina(mensaje) {
  mostrarAlerta(document.getElementById('admin-alerta'), mensaje);
}

function mostrarErrorPagina(mensaje) {
  document.getElementById('admin-cargando').hidden = true;
  document.getElementById('admin-contenido').hidden = true;
  mostrarAlertaPagina(mensaje);
}

init();
