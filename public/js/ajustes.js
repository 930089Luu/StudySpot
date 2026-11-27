/*
 * Pantalla de Ajustes (26-11): cuenta, idioma y apariencia, privacidad, tus datos (RGPD),
 * información legal, ayuda y, para cuentas de administración, la entrada a los horarios
 * (con tu contraseña, una vez por sesión). Las reglas las comprueba el servidor (api/cuenta.php).
 */
import { pintarAvatar } from './avatar.js';
import { accionCuenta, cerrarSesion, getCuenta, getVisibilidad, guardarVisibilidad } from './api.js';
import { confirmar } from './confirmar.js';
import { MENSAJE_ERROR_GENERICO, activarValidacionEnVivo, enviarFormulario, mostrarAlerta, mostrarErrorRespuesta, mostrarErroresServidor } from './formulario.js';
import { getIniciales } from './iniciales.js';
import { APARIENCIAS, IDIOMAS, getApariencia, getIdioma, setApariencia, setIdioma } from './preferencias.js';
import { AVISO_SESION_CERRADA, RUTA_LOGIN, crearRutaLoginConAviso } from './rutas.js';

const HTTP_OK = 200;
const HTTP_UNAUTHORIZED = 401;
const MENSAJE_SIN_CONEXION = 'No se ha podido conectar. Revisa tu conexión e inténtalo de nuevo.';
const RUTA_ADMIN = 'admin.html';
const TEXTOS_APARIENCIA = { auto: 'Automática', claro: 'Clara', oscuro: 'Oscura' };
const RUTA_CHECK = 'M4 12.5 9.5 18 20 6';

let cuenta = null;
// Qué pide la hoja de contraseña: entrar en la administración o eliminar la cuenta.
let motivoConfirmar = null;

function init() {
  prepararHojas();
  const formNombre = document.getElementById('form-nombre');
  formNombre.addEventListener('change', guardarNombre);
  formNombre.addEventListener('submit', (evento) => { evento.preventDefault(); document.activeElement?.blur(); });
  document.getElementById('boton-password').addEventListener('click', () => abrir('hoja-password'));
  document.getElementById('form-password').addEventListener('submit', handleCambiarPassword);
  activarValidacionEnVivo(document.getElementById('form-password'));
  document.getElementById('boton-idioma').addEventListener('click', () => abrirOpciones('idioma'));
  document.getElementById('boton-apariencia').addEventListener('click', () => abrirOpciones('apariencia'));
  document.getElementById('switch-compartir').addEventListener('change', handleCompartir);
  document.getElementById('boton-eliminar').addEventListener('click', handleEliminar);
  document.getElementById('boton-admin-horarios').addEventListener('click', handleAdmin);
  document.getElementById('form-confirmar').addEventListener('submit', handleConfirmar);
  document.getElementById('boton-cerrar-sesion').addEventListener('click', handleCerrarSesion);
  cargar().catch((error) => {
    console.error(error);
    mostrarError(MENSAJE_SIN_CONEXION);
  });
}

async function cargar() {
  const [respuestaCuenta, visibilidad] = await Promise.all([getCuenta(), getVisibilidad()]);
  if (respuestaCuenta.estado === HTTP_UNAUTHORIZED) return window.location.assign(RUTA_LOGIN);
  if (respuestaCuenta.estado !== HTTP_OK) return mostrarError(respuestaCuenta.cuerpo.error ?? MENSAJE_ERROR_GENERICO);
  cuenta = respuestaCuenta.cuerpo;
  // El idioma de la cuenta manda: así es el mismo en todos tus dispositivos.
  if (cuenta.idioma && cuenta.idioma !== getIdioma()) setIdioma(cuenta.idioma);
  pintarCuenta();
  document.getElementById('switch-compartir').checked = visibilidad.estado === HTTP_OK && visibilidad.cuerpo.share === 'yes';
  document.getElementById('bloque-admin').hidden = !cuenta.es_admin;
  pintarPreferencias();
  document.getElementById('ajustes-cargando').hidden = true;
  document.getElementById('ajustes-contenido').hidden = false;
  return null;
}

function pintarCuenta() {
  pintarAvatar(document.getElementById('cuenta-iniciales'), cuenta.avatar, getIniciales(cuenta.nombre));
  document.getElementById('cuenta-nombre-titulo').textContent = cuenta.nombre;
  document.getElementById('cuenta-email-titulo').textContent = cuenta.email;
  document.getElementById('cuenta-nombre').value = cuenta.nombre;
  document.getElementById('cuenta-email').textContent = cuenta.email;
}

function pintarPreferencias() {
  document.getElementById('valor-idioma').textContent = IDIOMAS.find(({ codigo }) => codigo === getIdioma()).nombre;
  document.getElementById('valor-apariencia').textContent = TEXTOS_APARIENCIA[getApariencia()];
}

/* ---------- cuenta ---------- */

async function guardarNombre() {
  const formulario = document.getElementById('form-nombre');
  const nombre = formulario.elements.namedItem('nombre').value.trim();
  if (nombre === cuenta.nombre) return;
  const respuesta = await enviarFormulario(formulario, () => accionCuenta('nombre', { nombre }));
  if (respuesta === null) return;
  if (respuesta.estado !== HTTP_OK) {
    mostrarErrorRespuesta(formulario, respuesta.cuerpo);
    return;
  }
  cuenta.nombre = nombre;
  pintarCuenta();
  mostrarExito('Nombre guardado.');
}

async function handleCambiarPassword(evento) {
  evento.preventDefault();
  const formulario = evento.currentTarget;
  const respuesta = await enviarFormulario(formulario, (datos) => accionCuenta('password', datos));
  if (respuesta === null) return;
  if (respuesta.estado !== HTTP_OK) {
    if (respuesta.cuerpo.errores) mostrarErroresServidor(formulario, respuesta.cuerpo.errores);
    else mostrarErrorRespuesta(formulario, respuesta.cuerpo);
    return;
  }
  formulario.reset();
  document.getElementById('hoja-password').close();
  mostrarExito('Contraseña cambiada.');
}

/* ---------- idioma y apariencia ---------- */

function abrirOpciones(tipo) {
  const esIdioma = tipo === 'idioma';
  document.getElementById('titulo-hoja-opciones').textContent = esIdioma ? 'Idioma' : 'Apariencia';
  const opciones = esIdioma
    ? IDIOMAS.map(({ codigo, nombre }) => ({ valor: codigo, texto: nombre, elegida: codigo === getIdioma() }))
    : APARIENCIAS.map((valor) => ({ valor, texto: TEXTOS_APARIENCIA[valor], elegida: valor === getApariencia() }));
  document.getElementById('lista-opciones').replaceChildren(...opciones.map((opcion) => crearOpcion(opcion, tipo)));
  abrir('hoja-opciones');
}

function crearOpcion({ valor, texto, elegida }, tipo) {
  const boton = crearElemento('button', 'ios-row');
  boton.type = 'button';
  boton.setAttribute('aria-pressed', String(elegida));
  const cuerpo = crearElemento('span', 'ios-row__body');
  cuerpo.append(crearTexto('span', 'ios-row__title', texto));
  boton.append(cuerpo);
  if (elegida) boton.append(crearCheck());
  boton.addEventListener('click', () => elegirOpcion(tipo, valor));
  const item = document.createElement('li');
  item.append(boton);
  return item;
}

async function elegirOpcion(tipo, valor) {
  if (tipo === 'apariencia') {
    setApariencia(valor);
    pintarPreferencias();
    abrirOpciones(tipo);
    return;
  }
  setIdioma(valor);
  // Se guarda también en la cuenta; si falla (sin conexión), al menos queda en este dispositivo.
  accionCuenta('idioma', { idioma: valor }).catch((error) => console.error(error));
  // Recarga para que toda la pantalla salga ya en el idioma nuevo.
  window.location.reload();
}

/* ---------- privacidad ---------- */

async function handleCompartir(evento) {
  const interruptor = evento.currentTarget;
  interruptor.disabled = true;
  try {
    const respuesta = await guardarVisibilidad(interruptor.checked ? 'yes' : 'no');
    if (respuesta.estado !== HTTP_OK) {
      interruptor.checked = !interruptor.checked;
      mostrarError(respuesta.cuerpo.error ?? MENSAJE_ERROR_GENERICO);
    }
  } catch (error) {
    console.error(error);
    interruptor.checked = !interruptor.checked;
    mostrarError(MENSAJE_SIN_CONEXION);
  } finally {
    interruptor.disabled = false;
  }
}

/* ---------- contraseña para administración o para eliminar la cuenta ---------- */

function handleAdmin() {
  if (cuenta.admin_confirmado) {
    window.location.assign(RUTA_ADMIN);
    return;
  }
  pedirPassword('admin', 'Administración', 'Entrar',
    'Confirma que eres tú. Solo te la pediremos una vez: después queda abierto hasta que cierres sesión.');
}

async function handleEliminar() {
  const seguro = await confirmar({
    titulo: '¿Eliminar tu cuenta?',
    texto: 'Se borrarán para siempre tus puntos, sesiones, amigos y grupos. No se puede deshacer.',
    accion: 'Eliminar',
    destructiva: true,
  });
  if (seguro) pedirPassword('eliminar', 'Eliminar cuenta', 'Eliminar', 'Escribe tu contraseña para confirmar.');
}

function pedirPassword(motivo, titulo, accion, texto) {
  motivoConfirmar = motivo;
  const formulario = document.getElementById('form-confirmar');
  formulario.reset();
  mostrarAlerta(formulario.querySelector('.alert'), '');
  document.getElementById('titulo-hoja-confirmar').textContent = titulo;
  document.getElementById('texto-hoja-confirmar').textContent = texto;
  const boton = document.getElementById('boton-confirmar');
  boton.textContent = accion;
  boton.classList.toggle('ios-sheet__bar-button--destructive', motivo === 'eliminar');
  abrir('hoja-confirmar');
  document.getElementById('confirmar-password').focus();
}

async function handleConfirmar(evento) {
  evento.preventDefault();
  const formulario = evento.currentTarget;
  const respuesta = await enviarFormulario(formulario, ({ password }) => accionCuenta(motivoConfirmar, { password }));
  if (respuesta === null) return;
  if (respuesta.estado !== HTTP_OK) {
    mostrarErrorRespuesta(formulario, respuesta.cuerpo);
    return;
  }
  document.getElementById('hoja-confirmar').close();
  // Cuenta eliminada: al login, ya sin sesión. Administración: a los horarios.
  window.location.assign(motivoConfirmar === 'eliminar' ? RUTA_LOGIN : RUTA_ADMIN);
}

/* ---------- cerrar sesión ---------- */

async function handleCerrarSesion(evento) {
  evento.currentTarget.disabled = true;
  try {
    await cerrarSesion();
  } finally {
    window.location.assign(crearRutaLoginConAviso(AVISO_SESION_CERRADA));
  }
}

/* ---------- comunes ---------- */

function prepararHojas() {
  const cerrarCon = (idHoja, idBoton) => {
    const hoja = document.getElementById(idHoja);
    document.getElementById(idBoton).addEventListener('click', () => hoja.close());
    hoja.addEventListener('click', (evento) => { if (evento.target === hoja) hoja.close(); });
  };
  cerrarCon('hoja-opciones', 'cerrar-opciones');
  cerrarCon('hoja-password', 'cancelar-password');
  cerrarCon('hoja-confirmar', 'cancelar-confirmar');
}

function abrir(id) {
  document.getElementById(id).showModal();
}

function crearCheck() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'ios-row__check');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', RUTA_CHECK);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2.4');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  svg.append(path);
  return svg;
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

function mostrarExito(mensaje) {
  mostrarAlerta(document.getElementById('ajustes-alerta'), '');
  mostrarAlerta(document.getElementById('ajustes-exito'), mensaje);
}

function mostrarError(mensaje) {
  document.getElementById('ajustes-cargando').hidden = true;
  mostrarAlerta(document.getElementById('ajustes-exito'), '');
  mostrarAlerta(document.getElementById('ajustes-alerta'), mensaje);
}

init();
