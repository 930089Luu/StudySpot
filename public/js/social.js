/*
 * Pantalla Social (US06 + US07): pestañas Grupos | Amigos y el + de arriba (crea grupo o añade
 * amigo según la pestaña). La pestaña Amigos la pinta amigos.js (mismos id que la antigua
 * amigos.html); aquí, los grupos, las invitaciones y la hoja de "Nuevo grupo".
 * La pestaña elegida va en la URL (#amigos) para volver a ella desde otras pantallas.
 */
import { accionGrupo, getGrupos } from './api.js';
import { MENSAJE_ERROR_GENERICO, activarValidacionEnVivo, enviarFormulario, mostrarAlerta, mostrarErrorRespuesta } from './formulario.js';
import { RUTA_LOGIN, crearRutaGrupo } from './rutas.js';

const HTTP_OK = 200;
const HTTP_CREATED = 201;
const HTTP_UNAUTHORIZED = 401;
const MENSAJE_SIN_CONEXION = 'No se ha podido conectar. Revisa tu conexión e inténtalo de nuevo.';
const PESTANA_AMIGOS = 'amigos';
const PESTANA_GRUPOS = 'grupos';
const RUTA_FLECHA = 'M1.5 1.5 7 7l-5.5 5.5';

const ACCION_DEL_MAS = {
  [PESTANA_GRUPOS]: { etiqueta: 'Crear grupo', hoja: 'hoja-grupo' },
  [PESTANA_AMIGOS]: { etiqueta: 'Añadir amigo', hoja: 'hoja-amigo' },
};

let pestanaActual = PESTANA_GRUPOS;

function init() {
  document.getElementById('pestana-grupos').addEventListener('click', () => cambiarPestana(PESTANA_GRUPOS));
  document.getElementById('pestana-amigos').addEventListener('click', () => cambiarPestana(PESTANA_AMIGOS));
  document.getElementById('boton-anadir').addEventListener('click', () => abrirHoja(ACCION_DEL_MAS[pestanaActual].hoja));
  document.getElementById('boton-primer-grupo').addEventListener('click', () => abrirHoja('hoja-grupo'));
  prepararHoja('hoja-grupo', 'cancelar-grupo');
  prepararHoja('hoja-amigo', 'cancelar-amigo');
  const formulario = document.getElementById('form-grupo');
  activarValidacionEnVivo(formulario);
  formulario.addEventListener('submit', handleCrearGrupo);
  cambiarPestana(window.location.hash === `#${PESTANA_AMIGOS}` ? PESTANA_AMIGOS : PESTANA_GRUPOS);
  cargarGrupos().catch((error) => {
    console.error(error);
    mostrarError(MENSAJE_SIN_CONEXION);
  });
}

/* ---------- pestañas y hojas ---------- */

function cambiarPestana(pestana) {
  pestanaActual = pestana;
  const esAmigos = pestana === PESTANA_AMIGOS;
  document.getElementById('pestana-grupos').setAttribute('aria-selected', String(!esAmigos));
  document.getElementById('pestana-amigos').setAttribute('aria-selected', String(esAmigos));
  document.getElementById('panel-grupos').hidden = esAmigos;
  document.getElementById('panel-amigos').hidden = !esAmigos;
  document.getElementById('boton-anadir').setAttribute('aria-label', ACCION_DEL_MAS[pestana].etiqueta);
  window.history.replaceState(null, '', esAmigos ? `#${PESTANA_AMIGOS}` : window.location.pathname);
}

function abrirHoja(id) {
  document.getElementById(id).showModal();
}

function prepararHoja(id, idCancelar) {
  const hoja = document.getElementById(id);
  document.getElementById(idCancelar).addEventListener('click', () => hoja.close());
  // Tocar fuera de la hoja la cierra, como en iOS.
  hoja.addEventListener('click', (evento) => { if (evento.target === hoja) hoja.close(); });
}

/* ---------- grupos e invitaciones ---------- */

async function cargarGrupos() {
  const respuesta = await getGrupos();
  if (respuesta.estado === HTTP_UNAUTHORIZED) return window.location.assign(RUTA_LOGIN);
  if (respuesta.estado !== HTTP_OK) return mostrarError(respuesta.cuerpo.error ?? MENSAJE_ERROR_GENERICO);
  const { grupos, invitaciones } = respuesta.cuerpo;
  document.getElementById('grupos-cargando').hidden = true;
  document.getElementById('invitaciones').hidden = invitaciones.length === 0;
  document.getElementById('invitaciones-lista').replaceChildren(...invitaciones.map(crearInvitacion));
  document.getElementById('grupos').hidden = grupos.length === 0;
  document.getElementById('grupos-lista').replaceChildren(...grupos.map(crearFilaGrupo));
  document.getElementById('sin-grupos').hidden = grupos.length > 0 || invitaciones.length > 0;
  return null;
}

/** Fila de un grupo, como un chat de Mensajes: icono, nombre, personas y puntos de la semana. */
function crearFilaGrupo({ id, nombre, personas, total, objetivo }) {
  const fila = crearElemento('a', 'ios-row');
  fila.href = crearRutaGrupo(id);
  const cuerpo = crearElemento('span', 'ios-row__body');
  cuerpo.append(
    crearTexto('span', 'ios-row__title', nombre),
    crearTexto('span', 'ios-row__subtitle',
      `${personas} ${personas === 1 ? 'persona' : 'personas'} · ${total} de ${objetivo} puntos esta semana`),
  );
  fila.append(crearIconoGrupo(id, nombre), cuerpo, crearFlecha());
  return envolverEnLi(fila);
}

function crearInvitacion({ grupo_id: grupoId, nombre, invitado_por: invitadoPor }) {
  const fila = crearElemento('div', 'ios-row');
  const cuerpo = crearElemento('span', 'ios-row__body');
  cuerpo.append(
    crearTexto('span', 'ios-row__title', nombre),
    crearTexto('span', 'ios-row__subtitle', `Te invita ${invitadoPor ?? 'alguien del grupo'}`),
  );
  // Los botones van debajo del texto, alineados a la derecha, para que el nombre no se parta.
  const acciones = crearElemento('div', 'ios-row__actions');
  acciones.append(
    crearBoton('Rechazar', 'ios-pill ios-pill--destructive', (boton) => responder(boton, grupoId, 'rechazar')),
    crearBoton('Unirme', 'ios-pill ios-pill--filled', (boton) => responder(boton, grupoId, 'aceptar')),
  );
  fila.classList.add('ios-row--wrap');
  fila.append(crearIconoGrupo(grupoId, nombre), cuerpo, acciones);
  return envolverEnLi(fila);
}

async function responder(boton, grupoId, accion) {
  boton.disabled = true;
  try {
    const respuesta = await accionGrupo(accion, { grupo: grupoId });
    if (respuesta.estado === HTTP_UNAUTHORIZED) return window.location.assign(RUTA_LOGIN);
    if (respuesta.estado !== HTTP_OK) {
      boton.disabled = false;
      return mostrarError(respuesta.cuerpo.error ?? MENSAJE_ERROR_GENERICO);
    }
    // Al unirte se abre el grupo; al rechazar se queda en la lista.
    return accion === 'aceptar' ? window.location.assign(crearRutaGrupo(grupoId)) : cargarGrupos();
  } catch (error) {
    console.error(error);
    boton.disabled = false;
    return mostrarError(MENSAJE_SIN_CONEXION);
  }
}

async function handleCrearGrupo(evento) {
  evento.preventDefault();
  const formulario = evento.currentTarget;
  const respuesta = await enviarFormulario(formulario, () => accionGrupo('crear', {
    nombre: formulario.elements.namedItem('nombre').value.trim(),
    objetivo: Number(formulario.elements.namedItem('objetivo').value),
  }));
  if (respuesta === null) return null;
  if (respuesta.estado === HTTP_UNAUTHORIZED) return window.location.assign(RUTA_LOGIN);
  if (respuesta.estado !== HTTP_CREATED) return mostrarErrorRespuesta(formulario, respuesta.cuerpo);
  // El grupo nuevo se abre directamente, listo para añadir personas.
  return window.location.assign(crearRutaGrupo(respuesta.cuerpo.grupo_id));
}

/* ---------- comunes ---------- */

/** Cuadrado de color con la inicial del grupo (color fijo según su id, como las personas). */
function crearIconoGrupo(id, nombre) {
  const icono = crearTexto('span', `ios-group-icon persona--${id % 8}`, nombre.trim().charAt(0).toUpperCase());
  icono.setAttribute('aria-hidden', 'true');
  return icono;
}

function crearFlecha() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'ios-row__chevron');
  svg.setAttribute('viewBox', '0 0 8.5 14');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', RUTA_FLECHA);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  return svg;
}

function crearBoton(texto, clases, alPulsar) {
  const boton = crearTexto('button', clases, texto);
  boton.type = 'button';
  boton.addEventListener('click', () => alPulsar(boton));
  return boton;
}

function envolverEnLi(contenido) {
  const item = document.createElement('li');
  item.append(contenido);
  return item;
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

function mostrarError(mensaje) {
  document.getElementById('grupos-cargando').hidden = true;
  mostrarAlerta(document.getElementById('grupos-alerta'), mensaje);
}

init();
